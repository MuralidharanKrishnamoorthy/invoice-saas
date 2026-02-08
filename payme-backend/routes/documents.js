const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/database');
const { generateEvidencePack } = require('../services/documentGenerator');
const logger = require('../config/logger');

router.get('/invoices/:id/evidence', authMiddleware, async (req, res) => {
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

        const { data: user } = await supabase
            .from('users')
            .select('name, email, plan_type, subscription_status')
            .eq('id', req.userId)
            .single();

        const isPremium = user?.plan_type === 'premium' || user?.subscription_status === 'premium';
        if (!isPremium) {
            return res.status(403).json({ error: 'Premium feature only' });
        }

        const logs = [];
        if (invoice.last_email_sent_at) {
            logs.push({ date: invoice.last_email_sent_at, type: 'last_email', subject: ' Reminder Email' });
        }
        // In a real app, we would fetch from a 'email_logs' table

        const pdfBuffer = await generateEvidencePack(invoice, user, logs);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Evidence_Pack_${invoice.invoice_number}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        logger.error('Evidence generation error:', error);
        res.status(500).json({ error: 'Failed to generate evidence pack' });
    }
});

module.exports = router;
