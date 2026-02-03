const Joi = require('joi');

const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
    name: Joi.string().min(2).max(100).optional()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const invoiceSchema = Joi.object({
    invoice_number: Joi.string().min(1).max(100).required(),
    client_name: Joi.string().min(1).max(255).required(),
    client_email: Joi.string().email().required(),
    amount: Joi.number().positive().precision(2).required(),
    due_date: Joi.date().iso().required()
});

const clientSchema = Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().max(50).optional().allow('', null),
    company: Joi.string().max(255).optional().allow('', null),
    address: Joi.string().max(500).optional().allow('', null),
    notes: Joi.string().max(1000).optional().allow('', null)
});

const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
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
