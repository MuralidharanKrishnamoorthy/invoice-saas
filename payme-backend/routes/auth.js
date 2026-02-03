const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/database');
const { validate, registerSchema, loginSchema } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const { asyncHandler, AuthenticationError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

router.post(
    '/register',
    authLimiter,
    validate(registerSchema),
    asyncHandler(async (req, res) => {
        const { email, password, name } = req.body;

        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }

        const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const { data: user, error } = await supabase
            .from('users')
            .insert({
                email,
                password_hash: passwordHash,
                name
            })
            .select('id, email, name, created_at, subscription_status, plan_type, lifetime_invoices, trial_notification_seen')
            .single();

        if (error) {
            logger.error('User creation failed:', error);
            throw new Error('Failed to create user');
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        logger.info(`New user registered: ${user.email}`);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                created_at: user.created_at,
                subscription_status: user.subscription_status,
                plan_type: user.plan_type,
                lifetime_invoices: user.lifetime_invoices,
                trial_notification_seen: user.trial_notification_seen
            },
        });
    })
);

router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, password_hash, name, subscription_status, plan_type, lifetime_invoices, trial_notification_seen')
            .eq('email', email)
            .single();

        if (error || !user) {
            throw new AuthenticationError('Invalid email or password');
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            throw new AuthenticationError('Invalid email or password');
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        logger.info(`User logged in: ${user.email}`);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                subscription_status: user.subscription_status,
                plan_type: user.plan_type,
                lifetime_invoices: user.lifetime_invoices,
                trial_notification_seen: user.trial_notification_seen
            },
        });
    })
);

router.get(
    '/me',
    asyncHandler(async (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            throw new AuthenticationError('No token provided');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const { data: user, error: dbError } = await supabase
                .from('users')
                .select('id, email, name, created_at, subscription_status, plan_type, lifetime_invoices, trial_notification_seen')
                .eq('id', decoded.userId)
                .single();

            if (dbError || !user) {
                logger.error('User not found during token verification:', { userId: decoded.userId, error: dbError });
                throw new AuthenticationError('User not found');
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    created_at: user.created_at,
                    subscription_status: user.subscription_status,
                    plan_type: user.plan_type,
                    lifetime_invoices: user.lifetime_invoices,
                    trial_notification_seen: user.trial_notification_seen
                }
            });
        } catch (error) {
            if (error instanceof AuthenticationError) {
                throw error;
            }
            logger.error('Token verification failed:', { error: error.message });
            throw new AuthenticationError('Invalid or expired token');
        }
    })
);

router.patch(
    '/me/notification-seen',
    asyncHandler(async (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) throw new AuthenticationError('No token provided');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { data: user, error } = await supabase
            .from('users')
            .update({ trial_notification_seen: true })
            .eq('id', decoded.userId)
            .select('id, trial_notification_seen')
            .single();

        if (error || !user) throw new Error('Failed to update notification status');

        res.json({ success: true, trial_notification_seen: user.trial_notification_seen });
    })
);

module.exports = router;
