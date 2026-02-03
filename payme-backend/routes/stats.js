const express = require('express');
const authMiddleware = require('../middleware/auth');
const supabase = require('../config/database');
const router = express.Router();

router.get('/recovery', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;

        const totalInvoices = invoices.length;
        if (totalInvoices === 0) {
            return res.json({
                totalChasing: 0,
                recoveryRate: 0,
                expectedRecovery: 0,
                daysSaved: 0
            });
        }

        const paidInvoices = invoices.filter(inv => inv.status === 'paid');
        const chasingInvoices = invoices.filter(inv => inv.status !== 'paid');

        const paidCount = paidInvoices.length;
        const chasingCount = chasingInvoices.length;
        const relevantCount = paidCount + chasingCount;

        const recoveryRate = relevantCount > 0 ? (paidCount / relevantCount) * 100 : 0;
        const totalChasingAmount = chasingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const expectedRecovery = totalChasingAmount * (recoveryRate / 100);

        let totalDaysSaved = 0;
        let daysSavedCount = 0;

        paidInvoices.forEach(inv => {
            if (inv.paid_at && inv.due_date) {
                const paidDate = new Date(inv.paid_at);
                const dueDate = new Date(inv.due_date);
                const industryAvgLateDays = 45;
                const msPerDay = 1000 * 60 * 60 * 24;

                const industryPaymentTime = dueDate.getTime() + (industryAvgLateDays * msPerDay);
                const actualPaymentTime = paidDate.getTime();

                const savedMs = industryPaymentTime - actualPaymentTime;
                const savedDays = savedMs / msPerDay;

                totalDaysSaved += savedDays;
                daysSavedCount++;
            }
        });

        const avgDaysSaved = daysSavedCount > 0 ? Math.round(totalDaysSaved / daysSavedCount) : 0;

        res.json({
            totalChasing: chasingCount,
            recoveryRate: Math.round(recoveryRate),
            expectedRecovery: Math.round(expectedRecovery),
            daysSaved: avgDaysSaved
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
