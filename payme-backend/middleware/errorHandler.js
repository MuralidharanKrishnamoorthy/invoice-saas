const logger = require('../config/logger');

// Custom error classes
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'You do not have permission to perform this action') {
        super(message, 403);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;

    // Log error
    if (error.statusCode >= 500) {
        logger.error('Server Error:', {
            message: error.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip,
            userId: req.userId
        });
    } else {
        logger.warn('Client Error:', {
            message: error.message,
            statusCode: error.statusCode,
            url: req.originalUrl,
            method: req.method,
            ip: req.ip
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        error = new ConflictError(`${field} already exists`);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        error = new ValidationError(messages.join(', '));
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new AuthenticationError('Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        error = new AuthenticationError('Token expired');
    }

    // Supabase errors
    if (err.code === '23505') { // Unique violation
        error = new ConflictError('Record already exists');
    }

    if (err.code === '23503') { // Foreign key violation
        error = new ValidationError('Invalid reference');
    }

    // Don't leak error details in production
    const response = {
        status: error.status || 'error',
        message: error.message || 'Something went wrong'
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        response.error = err;
    }

    res.status(error.statusCode).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
const notFoundHandler = (req, res, next) => {
    next(new NotFoundError(`Route ${req.originalUrl} not found`));
};

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    errorHandler,
    asyncHandler,
    notFoundHandler
};
