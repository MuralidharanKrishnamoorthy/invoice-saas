const logger = require('../config/logger');

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
    constructor(message = 'Permission denied') {
        super(message, 403);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Conflict') {
        super(message, 409);
    }
}

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;

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

    if (err.name === 'JsonWebTokenError') {
        error = new AuthenticationError('Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        error = new AuthenticationError('Token expired');
    }

    if (err.code === '23505') {
        error = new ConflictError('Record already exists');
    }

    if (err.code === '23503') {
        error = new ValidationError('Invalid reference');
    }

    const response = {
        status: error.status || 'error',
        message: error.message || 'Something went wrong'
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        response.error = err;
    }

    res.status(error.statusCode).json(response);
};

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

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
