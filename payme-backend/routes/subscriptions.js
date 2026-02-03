const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const supabase = require('../config/database');
const authMiddleware = require('../middleware/auth');
const logger = require('../config/logger');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const getCountry = (req) => {
    if (req.query.country) return req.query.country.toUpperCase();
    const cfCountry = req.headers['cf-ipcountry'];
    if (cfCountry) return cfCountry.toUpperCase();
    return 'US';
};

router.get('/detect-country', (req, res) => {
    const country = getCountry(req);
    const isIndia = country === 'IN';
    res.json({
        country,
        currency: isIndia ? 'INR' : 'USD',
        symbol: isIndia ? '₹' : '$'
    });
});

router.get('/pricing', (req, res) => {
    const country = getCountry(req);
    const isIndia = country === 'IN';

    const pricing = {
        country,
        currency: isIndia ? 'INR' : 'USD',
        symbol: isIndia ? '₹' : '$',
        plans: isIndia ? {
            basic: {
                name: 'Basic',
                monthly: 999,
                monthlyDisplay: '₹999',
                planId: process.env.PLAN_INR_BASIC,
                features: ['Unlimited invoices', 'AI reminders (4 stages)', 'Payment tracking', 'Manual mark as paid']
            },
            pro: {
                name: 'Pro',
                monthly: 1999,
                monthlyDisplay: '₹1,999',
                planId: process.env.PLAN_INR_PRO,
                features: ['Everything in Basic', 'Email preview & edit', 'Pause/resume reminders', 'Payment proof upload', 'Auto-payment detection', 'Late fee calculator'],
                badge: 'Most Popular'
            },
            premium: {
                name: 'Premium',
                monthly: 2999,
                monthlyDisplay: '₹2,999',
                planId: process.env.PLAN_INR_PREMIUM,
                features: ['Everything in Pro', 'Legal escalation templates', 'Pre-legal warnings', 'Court document generator', 'Priority support']
            }
        } : {
            basic: {
                name: 'Basic',
                monthly: 19,
                monthlyDisplay: '$19',
                planId: process.env.PLAN_USD_BASIC,
                features: ['Unlimited invoices', 'AI reminders (4 stages)', 'Payment tracking', 'Manual mark as paid']
            },
            pro: {
                name: 'Pro',
                monthly: 29,
                monthlyDisplay: '$29',
                planId: process.env.PLAN_USD_PRO,
                features: ['Everything in Basic', 'Email preview & edit', 'Pause/resume reminders', 'Payment proof upload', 'Auto-payment detection', 'Late fee calculator'],
                badge: 'Most Popular'
            },
            premium: {
                name: 'Premium',
                monthly: 49,
                monthlyDisplay: '$49',
                planId: process.env.PLAN_USD_PREMIUM,
                features: ['Everything in Pro', 'Legal escalation templates', 'Pre-legal warnings', 'Court document generator', 'Priority support']
            }
        }
    };
    res.json(pricing);
});

router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { planTier, country } = req.body;
        const userId = req.userId;

        let planId;
        if (country === 'IN') {
            if (planTier === 'basic') planId = process.env.PLAN_INR_BASIC;
            else if (planTier === 'pro') planId = process.env.PLAN_INR_PRO;
            else if (planTier === 'premium') planId = process.env.PLAN_INR_PREMIUM;
        } else {
            if (planTier === 'basic') planId = process.env.PLAN_USD_BASIC;
            else if (planTier === 'pro') planId = process.env.PLAN_USD_PRO;
            else if (planTier === 'premium') planId = process.env.PLAN_USD_PREMIUM;
        }

        if (!planId) {
            return res.status(400).json({ error: 'Config error' });
        }

        const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();

        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
            total_count: 12,
            quantity: 1,
            notes: {
                user_id: userId,
                email: user?.email,
                country: country,
                plan_tier: planTier
            }
        });

        res.json({
            success: true,
            subscriptionId: subscription.id,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            currency: country === 'IN' ? 'INR' : 'USD'
        });
    } catch (err) {
        logger.error('Subscription error:', err);
        res.status(500).json({ error: 'Failed to initiate' });
    }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !secret) {
        return res.status(400).send('Webhook setup error');
    }

    const body = req.body.toString();
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');

    if (expectedSignature !== signature) {
        return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(body);
    const payload = event.payload;

    try {
        switch (event.event) {
            case 'subscription.charged': {
                const sub = payload.subscription.entity;
                const userId = sub.notes.user_id;
                const planTier = sub.notes.plan_tier;
                const country = sub.notes.country;

                await supabase
                    .from('users')
                    .update({
                        subscription_status: 'active',
                        subscription_id: sub.id,
                        plan_type: planTier,
                        currency: country === 'IN' ? 'INR' : 'USD',
                        current_period_start: new Date().toISOString(),
                        current_period_end: new Date(sub.current_end * 1000).toISOString()
                    })
                    .eq('id', userId);
                break;
            }
            case 'subscription.cancelled': {
                const sub = payload.subscription.entity;
                await supabase
                    .from('users')
                    .update({ subscription_status: 'cancelled' })
                    .eq('subscription_id', sub.id);
                break;
            }
        }
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        logger.error('Webhook error:', err);
        res.status(500).send('Error');
    }
});

module.exports = router;
