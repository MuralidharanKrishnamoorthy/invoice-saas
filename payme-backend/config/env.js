const Joi = require('joi');

const envSchema = Joi.object({

    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number()
        .default(3000),
    LOG_LEVEL: Joi.string()
        .valid('error', 'warn', 'info', 'debug')
        .default('info'),

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

    JWT_SECRET: Joi.string()
        .min(32)
        .required()
        .messages({
            'any.required': 'JWT_SECRET is required',
            'string.min': 'JWT_SECRET must be at least 32 characters for security'
        }),
    JWT_EXPIRES_IN: Joi.string()
        .default('7d'),

    OPENAI_API_KEY: Joi.string()
        .required()
        .messages({
            'any.required': 'OPENAI_API_KEY is required for AI invoice parsing'
        }),

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

    FRONTEND_URL: Joi.string()
        .uri()
        .required()
        .messages({
            'any.required': 'FRONTEND_URL is required for CORS',
            'string.uri': 'FRONTEND_URL must be a valid URL'
        }),

    CRON_SCHEDULE: Joi.string()
        .default('0 9 * * *'),

    BCRYPT_SALT_ROUNDS: Joi.number()
        .min(10)
        .max(15)
        .default(12),

    RATE_LIMIT_WINDOW_MS: Joi.number()
        .default(900000),
    RATE_LIMIT_MAX_REQUESTS: Joi.number()
        .default(100),

}).unknown();

const { error, value: validatedEnv } = envSchema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false
});

if (error) {
    const errors = error.details.map(detail => `  - ${detail.message}`).join('\n');
    console.error('❌ Environment variable validation failed:\n' + errors);
    process.exit(1);
}

if (validatedEnv.NODE_ENV === 'development') {
    console.log('✅ Environment variables validated successfully');
}

module.exports = validatedEnv;
