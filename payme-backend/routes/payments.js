const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const supabase = require('../config/database');
const authMiddleware = require('../middleware/auth');
const logger = require('../config/logger');

// Create Lemon Squeezy Checkout Link
router.post('/create-checkout-link', authMiddleware, async (req, res) => {
    try {
        const { variantId } = req.body; // Product Variant ID from Frontend
        const userId = req.userId;
        const userEmail = req.userEmail;

        if (!variantId) {
            return res.status(400).json({ error: 'Variant ID is required' });
        }

        // Call Lemon Squeezy API to create checkout
        const response = await axios.post(
            'https://api.lemonsqueezy.com/v1/checkouts',
            {
                data: {
                    type: 'checkouts',
                    attributes: {
                        checkout_data: {
                            email: userEmail,
                            custom: {
                                user_id: userId // CRITICAL: Link payment to user
                            }
                        }
                    },
                    relationships: {
                        store: {
                            data: {
                                type: 'stores',
                                id: process.env.LEMON_SQUEEZY_STORE_ID
                            }
                        },
                        variant: {
                            data: {
                                type: 'variants',
                                id: variantId
                            }
                        }
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
                    'Content-Type': 'application/vnd.api+json',
                    'Accept': 'application/vnd.api+json'
                }
            }
        );

        const checkoutUrl = response.data.data.attributes.url;
        res.json({ url: checkoutUrl });

    } catch (error) {
        logger.error('Lemon Squeezy Checkout Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to create checkout link' });
    }
});

// Lemon Squeezy Webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
        const hmac = crypto.createHmac('sha256', secret);
        const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
        const signature = Buffer.from(req.get('X-Signature') || '', 'utf8');

        if (!crypto.timingSafeEqual(digest, signature)) {
            logger.error('Invalid Webhook Signature');
            return res.status(401).send('Invalid signature');
        }

        const payload = JSON.parse(req.body);
        const eventName = payload.meta.event_name;
        const customData = payload.meta.custom_data;

        if (!customData || !customData.user_id) {
            // Might be a test event or unrelated
            return res.json({ received: true });
        }

        const userId = customData.user_id;

        // Handle specific events
        if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
            await supabase.from('users').update({
                subscription_status: 'active',
                lemonsqueezy_customer_id: payload.data.attributes.customer_id,
                plan_type: 'pro',
                daily_email_count: 0 // Reset limits
            }).eq('id', userId);

            logger.info(`✅ Subscription activated for User ${userId}`);
        } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
            await supabase.from('users').update({
                subscription_status: 'canceled'
            }).eq('id', userId);

            logger.info(`🚫 Subscription canceled for User ${userId}`);
        }

        res.json({ received: true });
    } catch (error) {
        logger.error('Webhook Error:', error.message);
        res.status(500).send('Webhook Processing Failed');
    }
});

module.exports = router;
