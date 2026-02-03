const Joi = require('joi');

// Define environment variable schema
const envSchema = Joi.object({
    // Server
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number()
        .default(3000),
    LOG_LEVEL: Joi.string()
        .valid('error', 'warn', 'info', 'debug')
        .default('info'),

    // Database
    SUPABASE_URL: Joi.string()
        .uri()
        .required()
        .messages({
            'any.required': 'SUPABASE_URL is required',
            'string.uri': 'SUPABASE_URL must be a valid URL'
        }),
    SUPABASE_ANON_KEY: Joi.string()
        .required()
        .messages({
            'any.required': 'SUPABASE_ANON_KEY is required'
        }),
    SUPABASE_SERVICE_KEY: Joi.string()
        .required()
        .messages({
            'any.required': 'SUPABASE_SERVICE_KEY is required'
        }),

    // JWT
    JWT_SECRET: Joi.string()
        .min(32)
        .required()
        .messages({
            'any.required': 'JWT_SECRET is required',
            'string.min': 'JWT_SECRET must be at least 32 characters for security'
        }),
    JWT_EXPIRES_IN: Joi.string()
        .default('7d'),

    // OpenAI
    OPENAI_API_KEY: Joi.string()
        .required()
        .messages({
            'any.required': 'OPENAI_API_KEY is required for AI invoice parsing'
        }),

    // Email
    EMAIL_HOST: Joi.string()
        .default('smtp.gmail.com'),
    EMAIL_PORT: Joi.number()
        .default(587),
    EMAIL_USER: Joi.string()
        .email()
        .allow(''),
    EMAIL_PASS: Joi.string()
        .allow(''),
    EMAIL_FROM: Joi.string()
        .default('PayMe.ai <noreply@payme.ai>'),

    // Frontend
    FRONTEND_URL: Joi.string()
        .uri()
        .required()
        .messages({
            'any.required': 'FRONTEND_URL is required for CORS',
            'string.uri': 'FRONTEND_URL must be a valid URL'
        }),

    // Cron
    CRON_SCHEDULE: Joi.string()
        .default('0 9 * * *'),

    // Security
    BCRYPT_SALT_ROUNDS: Joi.number()
        .min(10)
        .max(15)
        .default(12),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: Joi.number()
        .default(900000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: Joi.number()
        .default(100),

}).unknown(); // Allow other env vars

// Validate environment variables
const { error, value: validatedEnv } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false
});

if (error) {
    const errors = error.details.map(detail => `  - ${detail.message}`).join('\n');
    console.error('❌ Environment variable validation failed:\n' + errors);
    process.exit(1);
}

// Log validation success
if (validatedEnv.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated successfully');
}

module.exports = validatedEnv;
