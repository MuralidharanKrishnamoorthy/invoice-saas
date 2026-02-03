const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
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

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/upload', authMiddleware, uploadLimiter, upload.array('file'), asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    const userId = req.userId;
    let allInvoices = [];

    const { data: user } = await supabase
        .from('users')
        .select('subscription_status, plan_type, lifetime_invoices')
        .eq('id', userId)
        .single();

    const isPro = user?.plan_type === 'pro' || user?.subscription_status === 'pro';

    for (const file of req.files) {
        try {
            const { rawData, fileType } = await fileParser.parseFile(file);
            const standardizedData = await aiAgent.extractInvoiceData(rawData, fileType, isPro);
            allInvoices.push(...standardizedData);
        } catch (fileError) {
            logger.error(`Error processing file ${file.originalname}:`, fileError.message);
        }
    }

    if (allInvoices.length === 0) {
        return res.status(400).json({
            message: 'No valid invoice data found.'
        });
    }

    const isFreeTier = !user || !user.subscription_status || user.subscription_status === 'free';
    const FREEMIUM_LIMIT = 5;
    const currentUsage = user?.lifetime_invoices || 0;

    if (isFreeTier && (currentUsage + allInvoices.length) > FREEMIUM_LIMIT) {
        return res.status(403).json({
            error: 'LIMIT_REACHED',
            message: `Free plan limit reached. You have used ${currentUsage}/${FREEMIUM_LIMIT} uploads.`
        });
    }

    const savedInvoices = [];
    const duplicates = [];
    const errors = [];

    for (const inv of allInvoices) {
        if (!inv.invoice_number || !inv.client_name || !inv.amount) {
            continue;
        }

        const daysLate = calculateDaysLate(inv.due_date);
        const lateFee = daysLate >= 7 ? 20 : 0;

        const invoiceData = {
            user_id: userId,
            invoice_number: inv.invoice_number,
            client_name: inv.client_name,
            client_email: inv.client_email,
            amount: inv.amount,
            due_date: inv.due_date,
            currency: inv.currency || 'USD',
            days_late: daysLate,
            late_fee: lateFee,
            status: 'pending'
        };

        const { data, error } = await supabase
            .from('invoices')
            .insert(invoiceData)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                duplicates.push(inv.invoice_number);
            } else {
                logger.error('Invoice insert error:', error);
                errors.push({ invoice: inv.invoice_number, error: error.message });
            }
            continue;
        }
        savedInvoices.push(data);
    }

    const csvData = Papa.unparse(savedInvoices.map(inv => ({
        invoice_number: inv.invoice_number,
        client_name: inv.client_name,
        client_email: inv.client_email,
        amount: inv.amount,
        due_date: inv.due_date,
        status: inv.status,
        days_late: inv.days_late
    })));

    if (savedInvoices.length === 0 && duplicates.length > 0 && errors.length === 0) {
        return res.status(200).json({
            message: `All ${duplicates.length} invoice(s) were duplicates and skipped.`,
            duplicates: duplicates,
            invoices: []
        });
    }

    if (savedInvoices.length > 0 && duplicates.length > 0) {
        return res.status(201).json({
            message: `Saved ${savedInvoices.length} invoice(s). Skipped ${duplicates.length} duplicate(s).`,
            invoices: savedInvoices,
            duplicates: duplicates,
            csvData: csvData
        });
    }

    if (savedInvoices.length === 0 && duplicates.length === 0 && errors.length > 0) {
        return res.status(500).json({
            message: 'Failed to save invoices to database.',
            error: errors[0].error
        });
    }

    res.status(201).json({
        message: `Successfully processed ${req.files.length} file(s) and saved ${savedInvoices.length} invoice(s).`,
        invoices: savedInvoices,
        csvData: csvData
    });

    if (savedInvoices.length > 0) {
        try {
            const { error: rpcError } = await supabase.rpc('increment_lifetime_invoices', {
                row_id: userId,
                val: savedInvoices.length
            });

            if (rpcError) {
                if (user) {
                    await supabase.from('users')
                        .update({ lifetime_invoices: (user.lifetime_invoices || 0) + savedInvoices.length })
                        .eq('id', userId);
                }
            }
        } catch (err) {
            logger.error('Usage update failed:', err);
        }
    }
}));

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('*, users!inner(subscription_status, plan_type)')
            .eq('user_id', req.userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const enrichedInvoices = (invoices || []).map(inv => {
            const actualDaysLate = calculateDaysLate(inv.due_date);
            const isPro = inv.users?.plan_type === 'pro' || inv.users?.subscription_status === 'pro';
            let lateFee = 0;
            if (isPro && inv.status !== 'paid' && actualDaysLate >= 7) {
                lateFee = 20;
            }
            return { ...inv, days_late: actualDaysLate, late_fee: lateFee };
        });

        res.json(enrichedInvoices);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

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
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

router.post('/:id/preview-email', authMiddleware, async (req, res) => {
    try {
        const { emailType, tone, forceRegenerate } = req.body;

        if (!['upcoming', 'day1', 'day7', 'day14'].includes(emailType)) {
            return res.status(400).json({ error: 'Invalid email type' });
        }

        const { data: invoice, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .single();

        if (error || !invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const existingEmails = invoice.generated_emails || {};
        const existing = existingEmails[emailType];

        if (existing && !forceRegenerate && (!tone || existing.tone === tone)) {
            return res.json({
                subject: existing.user_edited ? (existing.edited_subject || existing.subject) : existing.subject,
                body: existing.user_edited ? (existing.edited_body || existing.body) : existing.body,
                user_edited: existing.user_edited || false,
                tone: existing.tone || 'professional'
            });
        }

        let simulatedInvoice = { ...invoice };
        switch (emailType) {
            case 'upcoming':
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

        const { data: user } = await supabase
            .from('users')
            .select('name, subscription_status, plan_type')
            .eq('id', req.userId)
            .single();

        simulatedInvoice.sender_name = user?.name || 'PayMe.ai';
        const isPro = user?.plan_type === 'pro' || user?.subscription_status === 'pro';

        const { subject, body } = await generateEmail(simulatedInvoice, emailType, isPro, tone || 'professional');

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
            logger.error('Failed to save generated email:', dbError);
        }

        res.json({ subject, body });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});

router.post('/:id/send-email', authMiddleware, async (req, res) => {
    try {
        const { emailType } = req.body;
        if (!['day1', 'day7', 'day14'].includes(emailType)) {
            return res.status(400).json({ error: 'Invalid email type' });
        }

        const { data: invoice, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .single();

        if (error || !invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const savedEmails = invoice.generated_emails || {};
        const edited = savedEmails[emailType];
        let subject, body;

        if (edited && edited.user_edited) {
            subject = edited.edited_subject || edited.subject;
            body = edited.edited_body || edited.body;
        } else {
            const result = await generateEmail(invoice, emailType);
            subject = result.subject;
            body = result.body;
        }

        await sendEmail(invoice.id, subject, body, invoice.client_email);

        const newStatus = `${emailType}_sent`;
        await supabase
            .from('invoices')
            .update({
                status: newStatus,
                emails_sent: (invoice.emails_sent || 0) + 1,
                last_email_sent_at: new Date().toISOString(),
            })
            .eq('id', invoice.id);

        res.json({ message: 'Email sent successfully', subject, body });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send email' });
    }
});

router.patch('/:id/pause', authMiddleware, async (req, res) => {
    try {
        const { reason } = req.body;
        const { data: user } = await supabase
            .from('users')
            .select('subscription_status, plan_type')
            .eq('id', req.userId)
            .single();

        const isPaid = user?.subscription_status === 'active';
        const hasAccess = isPaid && (user?.plan_type === 'pro' || user?.plan_type === 'premium');

        if (!hasAccess) {
            return res.status(403).json({ error: 'Feature gated. Upgrade to Pro/Premium.' });
        }

        const { data, error } = await supabase
            .from('invoices')
            .update({
                reminder_status: 'paused',
                reminders_paused_until: null,
                pause_reason: reason || null
            })
            .eq('id', req.params.id)
            .eq('user_id', req.userId)
            .select()
            .single();

        if (error) throw error;
        res.json({ message: 'Reminders paused', invoice: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to pause' });
    }
});

router.patch('/:id/resume', authMiddleware, async (req, res) => {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('subscription_status, plan_type')
            .eq('id', req.userId)
            .single();

        const isPaid = user?.subscription_status === 'active';
        const hasAccess = isPaid && (user?.plan_type === 'pro' || user?.plan_type === 'premium');

        if (!hasAccess) {
            return res.status(403).json({ error: 'Feature gated. Upgrade to Pro/Premium.' });
        }

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
        res.json({ message: 'Reminders resumed', invoice: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to resume' });
    }
});

router.patch('/:id/edit-email', authMiddleware, async (req, res) => {
    try {
        const { emailType, subject, body, tone } = req.body;
        if (!['upcoming', 'day1', 'day7', 'day14'].includes(emailType)) {
            return res.status(400).json({ error: 'Invalid email type' });
        }

        const { data: user } = await supabase
            .from('users')
            .select('subscription_status, plan_type')
            .eq('id', req.userId)
            .single();

        const isPaid = user?.subscription_status === 'active';
        const hasAccess = isPaid && (user?.plan_type === 'pro' || user?.plan_type === 'premium');

        if (!hasAccess) {
            return res.status(403).json({ error: 'Feature gated. Upgrade to Pro/Premium.' });
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
        res.json({ message: 'Email saved', invoice: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save email' });
    }
});

const proofStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uuid = crypto.randomUUID();
        cb(null, `proof-${uuid}${ext}`);
    }
});

const uploadProof = multer({
    storage: proofStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type.'));
        }
    }
});

router.patch('/:id/paid', authMiddleware, uploadProof.single('proof'), async (req, res) => {
    try {
        const updateData = {
            status: 'paid',
            paid_at: new Date().toISOString()
        };

        if (req.file) {
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
        res.status(500).json({ error: 'Failed to mark as paid' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabase
            .from('invoices')
            .delete()
            .eq('id', req.params.id)
            .eq('user_id', req.userId);

        if (error) throw error;
        res.json({ message: 'Invoice deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

module.exports = router;
