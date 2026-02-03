const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/database');
const { validate, registerSchema, loginSchema } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');
const { asyncHandler, AuthenticationError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Register
router.post(
    '/register',
    authLimiter,
    validate(registerSchema),
    asyncHandler(async (req, res) => {
        const { email, password, name } = req.body;

        // Check if user exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            throw new ConflictError('User with this email already exists');
        }

        // Hash password with higher cost factor for production
        const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const { data: user, error } = await supabase
            .from('users')
            .insert({
                email,
                password_hash: passwordHash,
                name
            })
            .select('id, email, name, created_at')
            .single();

        if (error) {
            logger.error('User creation failed:', error);
            throw new Error('Failed to create user');
        }

        // Generate JWT
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
                created_at: user.created_at
            },
        });
    })
);

// Login
router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, password_hash, name, subscription_status, trial_end, plan_tier, currency, current_period_end')
            .eq('email', email)
            .single();

        if (error || !user) {
            // Don't reveal whether email exists
            throw new AuthenticationError('Invalid email or password');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            throw new AuthenticationError('Invalid email or password');
        }

        // Generate JWT
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
                trial_end: user.trial_end,
                plan_tier: user.plan_tier,
                currency: user.currency,
                current_period_end: user.current_period_end
            },
        });
    })
);

// Me / Verify profile
router.get(
    '/me',
    asyncHandler(async (req, res) => {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            throw new AuthenticationError('No token provided');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Optionally fetch fresh user data
            const { data: user } = await supabase
                .from('users')
                .select('id, email, name, created_at')
                .eq('id', decoded.userId)
                .single();

            if (!user) {
                throw new AuthenticationError('User not found');
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    created_at: user.created_at
                }
            });
        } catch (error) {
            throw new AuthenticationError('Invalid or expired token');
        }
    })
);

module.exports = router;
