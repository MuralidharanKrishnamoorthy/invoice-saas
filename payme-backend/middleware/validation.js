const Joi = require('joi');

// User registration validation
const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).max(128).required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.max': 'Password must not exceed 128 characters',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'any.required': 'Password is required'
        }),
    name: Joi.string().min(2).max(100).optional().messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name must not exceed 100 characters'
    })
});

// User login validation
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
        'any.required': 'Password is required'
    })
});

// Invoice validation
const invoiceSchema = Joi.object({
    invoice_number: Joi.string().min(1).max(100).required().messages({
        'string.empty': 'Invoice number is required',
        'string.max': 'Invoice number must not exceed 100 characters'
    }),
    client_name: Joi.string().min(1).max(255).required().messages({
        'string.empty': 'Client name is required',
        'string.max': 'Client name must not exceed 255 characters'
    }),
    client_email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid client email address',
        'any.required': 'Client email is required'
    }),
    amount: Joi.number().positive().precision(2).required().messages({
        'number.positive': 'Amount must be a positive number',
        'any.required': 'Amount is required'
    }),
    due_date: Joi.date().iso().required().messages({
        'date.format': 'Due date must be in YYYY-MM-DD format',
        'any.required': 'Due date is required'
    })
});

// Client validation
const clientSchema = Joi.object({
    name: Joi.string().min(2).max(255).required().messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name must not exceed 255 characters',
        'any.required': 'Name is required'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    phone: Joi.string().max(50).optional().allow('', null),
    company: Joi.string().max(255).optional().allow('', null),
    address: Joi.string().max(500).optional().allow('', null),
    notes: Joi.string().max(1000).optional().allow('', null)
});

// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Return all errors, not just the first one
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        // Replace req.body with validated and sanitized data
        req.body = value;
        next();
    };
};

module.exports = {
    validate,
    registerSchema,
    loginSchema,
    invoiceSchema,
    clientSchema
};
