const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const fs = require('fs').promises;
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/database');
const { cleanCSVData, validateInvoiceData, calculateDaysLate } = require('../utils/csvParser');
const { generateEmail } = require('../services/emailGenerator');
const { sendEmail } = require('../services/emailSender');
const fileParser = require('../services/fileParser');
const aiAgent = require('../services/aiAgent');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload Invoices (Universal Agent)
router.post('/upload', authMiddleware, uploadLimiter, upload.array('file'), asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    const userId = req.userId;
    let allInvoices = [];

    // FETCH USER DETAILS & LIMITS FIRST
    const { data: user } = await supabase
        .from('users')
        .select('subscription_status, lifetime_invoices')
        .eq('id', userId)
        .single();

    const isPro = user?.subscription_status === 'pro' || true; // Default to true after revert
    console.log(`👤 User ${userId} status: ${user?.subscription_status || 'not found'}`);

    // Process each file via Universal Agent
    for (const file of req.files) {
        try {
            console.log(`📄 Processing file: ${file.originalname} (${file.size} bytes)`);

            // 1. Extract raw data (Universal Parser)
            const { rawData, fileType } = await fileParser.parseFile(file);
            console.log(`✅ Parsed ${fileType} - Extracted ${rawData.length} characters`);

            // 2. Standardize data (AI Agent)
            console.log(`🤖 Sending to AI for extraction (Tier: ${isPro ? 'GPT-4o' : 'GPT-4o-mini'})...`);
            const standardizedData = await aiAgent.extractInvoiceData(rawData, fileType, isPro);
            console.log(`✅ AI extracted ${standardizedData.length} invoice(s)`);

            // 3. Add to collection
            allInvoices.push(...standardizedData);

        } catch (fileError) {
            console.error(`❌ Error processing file ${file.originalname}:`, fileError.message);
            // Continue with other files even if one fails
        }
    }

    if (allInvoices.length === 0) {
        return res.status(400).json({
            message: 'No valid invoice data found. Please upload a valid Invoice, Excel, CSV, or PDF document containing invoice information (invoice number, client name, client email, amount, and due date).'
        });
    }

    // 4. Create/Link Clients and Save to Database



    const isFreeTier = !user || !user.subscription_status || user.subscription_status === 'free';

    // Limits removed as part of subscription revert
    /*
    const FREEMIUM_LIMIT = 10;
    if (isFreeTier && (user.lifetime_invoices + allInvoices.length) > FREEMIUM_LIMIT) {
        return res.status(403).json({
            error: 'LIMIT_REACHED',
            message: `Free plan limit reached. You have used ${user.lifetime_invoices}/${FREEMIUM_LIMIT} uploads. Upgrade to Pro for unlimited invoices.`
        });
    }
    */

    const savedInvoices = [];
    const duplicates = [];
    const errors = [];

    for (const inv of allInvoices) {
        // Validate required fields
        if (!inv.invoice_number || !inv.client_name || !inv.amount) {
            continue; // Skip invalid entries
        }

        // Build invoice data object (without client_id for now)
        const invoiceData = {
            user_id: userId,
            invoice_number: inv.invoice_number,
            client_name: inv.client_name,
            client_email: inv.client_email,
            amount: inv.amount,
            due_date: inv.due_date,
            currency: inv.currency || 'USD', // Default to USD if not provided
            days_late: calculateDaysLate(inv.due_date),
            status: 'pending'
        };

        const { data, error } = await supabase
            .from('invoices')
            .insert(invoiceData)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                // Duplicate key error
                duplicates.push(inv.invoice_number);
                logger.info(`Skipping duplicate invoice: ${inv.invoice_number}`);
            } else {
                logger.error('Invoice insert error:', error);
                errors.push({ invoice: inv.invoice_number, error: error.message });
            }
            continue;
        }
        savedInvoices.push(data);
    }

    // Generate CSV from extracted data
    const csvData = Papa.unparse(savedInvoices.map(inv => ({
        invoice_number: inv.invoice_number,
        client_name: inv.client_name,
        client_email: inv.client_email,
        amount: inv.amount,
        due_date: inv.due_date,
        status: inv.status,
        days_late: inv.days_late
    })));

    // Handle Response Logic

    // Case 1: All duplicates
    if (savedInvoices.length === 0 && duplicates.length > 0 && errors.length === 0) {
        return res.status(200).json({ // Return 200 OK, not error, because "processing" was successful
            message: `Processed ${req.files.length} file(s). All ${duplicates.length} invoice(s) were explicitly identified as duplicates and skipped.`,
            duplicates: duplicates,
            invoices: []
        });
    }

    // Case 2: Mix of saved and duplicates
    if (savedInvoices.length > 0 && duplicates.length > 0) {
        return res.status(201).json({
            message: `Saved ${savedInvoices.length} invoice(s). Skipped ${duplicates.length} duplicate(s).`,
            invoices: savedInvoices,
            duplicates: duplicates,
            csvData: csvData
        });
    }

    // Case 3: Genuine failures (likely schema mismatch if all failed)
    if (savedInvoices.length === 0 && duplicates.length === 0 && errors.length > 0) {
        return res.status(500).json({
            message: 'Failed to save invoices to database. Likely a schema mismatch (e.g., missing currency column).',
            error: errors[0].error
        });
    }

    // Case 4: Success
    res.status(201).json({
        message: `Successfully processed ${req.files.length} file(s) and saved ${savedInvoices.length} invoice(s).`,
        invoices: savedInvoices,
        csvData: csvData
    });

    logger.info(`User ${userId} uploaded ${savedInvoices.length} invoices`);

    // Increment lifetime usage
    if (savedInvoices.length > 0) {
        await supabase.rpc('increment_lifetime_invoices', {
            val: savedInvoices.length,
            row_id: userId
        });
        // Note: RPC is safer for concurrency but simple update works too if RPC not defined.
        // Let's use simple logic since I didn't create an RPC.
        // Actually, just fetch current, add, update is prone to race conditions but okay for this MVP.
        // Better: `UPDATE users SET lifetime_invoices = lifetime_invoices + X WHERE id = Y`
        // Supabase-js doesn't support raw SQL easily without RPC.
        // Alternative: Fetch fresh user (we have it from before but it might be stale? no, single request).
        // `user.lifetime_invoices` was fetched at start.

        // Let's try creating a simple helper or just use the update with known value if no race condition expected (single user).
        // Since we are checking limit at start, we can just update to `new_total`.

        if (user) {
            await supabase.from('users')
                .update({ lifetime_invoices: (user.lifetime_invoices || 0) + savedInvoices.length })
                .eq('id', userId);
        }
    }
}));

// Get all invoices for user
router.get('/', authMiddleware, async (req, res) => {
    try {
        console.log(`🔍 Fetching invoices for user: ${req.userId}`);
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Supabase error fetching invoices:', error);
            throw error;
        }

        console.log(`✅ Found ${invoices?.length || 0} invoices`);
        res.json(invoices);
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// Get single invoice
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .single();

        if (error || !invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json(invoice);
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// Preview email for invoice (Generates without sending)
router.post('/:id/preview-email', authMiddleware, async (req, res) => {
    try {
        const { emailType, tone, forceRegenerate } = req.body; // upcoming, day1, day7, day14

        if (!['upcoming', 'day1', 'day7', 'day14'].includes(emailType)) {
            return res.status(400).json({ error: 'Invalid email type' });
        }

        // Get invoice
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .single();

        if (error || !invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Check if email already exists in DB
        const existingEmails = invoice.generated_emails || {};
        const existing = existingEmails[emailType];

        // Return cached version unless forceRegenerate is true or it's a new tone
        if (existing && !forceRegenerate && (!tone || existing.tone === tone)) {
            // Return edited content if it exists, otherwise return original
            return res.json({
                subject: existing.user_edited ? (existing.edited_subject || existing.subject) : existing.subject,
                body: existing.user_edited ? (existing.edited_body || existing.body) : existing.body,
                user_edited: existing.user_edited || false,
                tone: existing.tone || 'professional'
            });
        }

        // Simulate days late for context-aware preview
        // This ensures the AI generates text that makes sense for the template
        // even if the invoice isn't actually that late yet.
        let simulatedInvoice = { ...invoice };

        switch (emailType) {
            case 'upcoming':
                // Force to -3 if not already in future
                if (simulatedInvoice.days_late > -3) simulatedInvoice.days_late = -3;
                break;
            case 'day1':
                if (simulatedInvoice.days_late < 1) simulatedInvoice.days_late = 1;
                break;
            case 'day7':
                if (simulatedInvoice.days_late < 7) simulatedInvoice.days_late = 7;
                break;
            case 'day14':
                if (simulatedInvoice.days_late < 14) simulatedInvoice.days_late = 14;
                break;
        }

        // Add sender name for signature
        // We need to fetch the user name since it wasn't in the invoice query
        const { data: user } = await supabase
            .from('users')
            .select('name, subscription_status')
            .eq('id', req.userId)
            .single();

        simulatedInvoice.sender_name = user?.name || 'PayMe.ai';
        const isPro = user?.subscription_status === 'pro';

        // Generate email using OpenAI
        const { subject, body } = await generateEmail(simulatedInvoice, emailType, isPro, tone || 'professional');

        // Save generated email to DB (Cache it)
        try {
            const updatedEmails = {
                ...existingEmails,
                [emailType]: {
                    subject,
                    body,
                    user_edited: false,
                    tone: tone || 'professional',
                    generated_at: new Date().toISOString()
                }
            };

            await supabase
                .from('invoices')
                .update({ generated_emails: updatedEmails })
                .eq('id', invoice.id);

        } catch (dbError) {
            console.error('Failed to save generated email to DB:', dbError);
            // Verify if we should fail or just return the generated email?
            // Proceed to return response even if save fails, but log it.
        }

        res.json({ subject, body });
    } catch (error) {
        console.error('Preview email error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate preview' });
    }
});

// Generate and send email for invoice
router.post('/:id/send-email', authMiddleware, async (req, res) => {
    try {
        const { emailType } = req.body; // day1, day7, day14

        if (!['day1', 'day7', 'day14'].includes(emailType)) {
            return res.status(400).json({ error: 'Invalid email type' });
        }

        // Get invoice
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .single();

        if (error || !invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Check for user-edited version first
        const savedEmails = invoice.generated_emails || {};
        const edited = savedEmails[emailType];
        let subject, body;

        if (edited && edited.user_edited) {
            subject = edited.edited_subject || edited.subject;
            body = edited.edited_body || edited.body;
        } else {
            // Generate email using OpenAI
            const result = await generateEmail(invoice, emailType);
            subject = result.subject;
            body = result.body;
        }

        // Send email
        await sendEmail(invoice.id, subject, body, invoice.client_email);

        // Update invoice status
        const newStatus = `${emailType}_sent`;
        await supabase
            .from('invoices')
            .update({
                status: newStatus,
                emails_sent: invoice.emails_sent + 1,
                last_email_sent_at: new Date().toISOString(),
            })
            .eq('id', invoice.id);

        res.json({ message: 'Email sent successfully', subject, body });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ error: error.message || 'Failed to send email' });
    }
});

// Pause reminders
router.patch('/:id/pause', authMiddleware, async (req, res) => {
    try {
        const { duration, reason } = req.body; // duration in days or 'indefinite'
        let paused_until = null;

        if (duration !== 'indefinite') {
            const days = parseInt(duration);
            const date = new Date();
            date.setDate(date.getDate() + days);
            paused_until = date.toISOString();
        }

        const { data, error } = await supabase
            .from('invoices')
            .update({
                reminder_status: 'paused',
                reminders_paused_until: paused_until,
                pause_reason: reason || null
            })
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Reminders paused successfully', invoice: data });
    } catch (error) {
        console.error('Pause reminders error:', error);
        res.status(500).json({ error: 'Failed to pause reminders' });
    }
});

// Resume reminders
router.patch('/:id/resume', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('invoices')
            .update({
                reminder_status: 'active',
                reminders_paused_until: null
            })
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Reminders resumed successfully', invoice: data });
    } catch (error) {
        console.error('Resume reminders error:', error);
        res.status(500).json({ error: 'Failed to resume reminders' });
    }
});

// Edit/Save generated email
router.patch('/:id/edit-email', authMiddleware, async (req, res) => {
    try {
        const { emailType, subject, body, tone } = req.body;

        if (!['upcoming', 'day1', 'day7', 'day14'].includes(emailType)) {
            return res.status(400).json({ error: 'Invalid email type' });
        }

        const { data: invoice, error: fetchError } = await supabase
            .from('invoices')
            .select('generated_emails')
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .single();

        if (fetchError || !invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const currentEmails = invoice.generated_emails || {};
        const existing = currentEmails[emailType] || {};

        const updatedEmails = {
            ...currentEmails,
            [emailType]: {
                ...existing,
                user_edited: true,
                edited_subject: subject,
                edited_body: body,
                tone: tone || existing.tone || 'professional',
                updated_at: new Date().toISOString()
            }
        };

        const { data, error } = await supabase
            .from('invoices')
            .update({ generated_emails: updatedEmails })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json({ message: 'Email saved successfully', invoice: data });
    } catch (error) {
        console.error('Edit email error:', error);
        res.status(500).json({ error: 'Failed to save email' });
    }
});

// Configure storage for Payment Proofs
const path = require('path');
const crypto = require('crypto');

const proofStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Saved to project_root/uploads/
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uuid = crypto.randomUUID();
        cb(null, `proof-${uuid}${ext}`);
    }
});

const uploadProof = multer({
    storage: proofStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and PDFs allowed.'));
        }
    }
});

// Mark invoice as paid (with optional proof)
router.patch('/:id/paid', authMiddleware, uploadProof.single('proof'), async (req, res) => {
    try {
        const updateData = {
            status: 'paid',
            paid_at: new Date().toISOString()
        };

        if (req.file) {
            // Save relative path (accessible via static serve)
            updateData.payment_proof_url = `/uploads/${req.file.filename}`;
        }

        const { data: invoice, error } = await supabase
            .from('invoices')
            .update(updateData)
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .select()
            .single();

        if (error) throw error;

        res.json(invoice);
    } catch (error) {
        console.error('Mark paid error:', error);
        res.status(500).json({ error: 'Failed to mark as paid' });
    }
});

// Delete invoice
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('invoices')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.userId);

        if (error) throw error;

        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
});

module.exports = router;
