const express = require('express');
const supabase = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validate, clientSchema } = require('../middleware/validation');
const { asyncHandler, NotFoundError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const router = express.Router();

// Get all clients for user (with pagination and search)
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });

    // Search filter
    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // Status filter
    if (status !== 'all') {
        query = query.eq('status', status);
    }

    // Pagination
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: clients, error, count } = await query;

    if (error) {
        logger.error('Get clients error:', error);
        throw new Error('Failed to fetch clients');
    }

    res.json({
        success: true,
        clients,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / limit)
        }
    });
}));

// Get single client
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .single();

    if (error || !client) {
        throw new NotFoundError('Client not found');
    }

    res.json({
        success: true,
        client
    });
}));

// Get client's invoices
router.get('/:id/invoices', authMiddleware, asyncHandler(async (req, res) => {
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_id', req.params.id)
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });

    if (error) {
        logger.error('Get client invoices error:', error);
        throw new Error('Failed to fetch client invoices');
    }

    res.json({
        success: true,
        invoices
    });
}));

// Create new client
router.post('/', authMiddleware, validate(clientSchema), asyncHandler(async (req, res) => {
    const { name, email, phone, company, address, notes } = req.body;

    // Check if client with this email already exists for this user
    const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', req.userId)
        .eq('email', email)
        .single();

    if (existing) {
        throw new ConflictError('Client with this email already exists');
    }

    const { data: client, error } = await supabase
        .from('clients')
        .insert({
            user_id: req.userId,
            name,
            email,
            phone,
            company,
            address,
            notes,
            status: 'active'
        })
        .select()
        .single();

    if (error) {
        logger.error('Create client error:', error);
        throw new Error('Failed to create client');
    }

    logger.info(`Client created: ${client.email} by user ${req.userId}`);

    res.status(201).json({
        success: true,
        client
    });
}));

// Update client
router.put('/:id', authMiddleware, validate(clientSchema), asyncHandler(async (req, res) => {
    const { name, email, phone, company, address, notes } = req.body;

    // Check if client exists and belongs to user
    const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .single();

    if (!existing) {
        throw new NotFoundError('Client not found');
    }

    // Check if email is being changed to one that already exists
    const { data: emailConflict } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', req.userId)
        .eq('email', email)
        .neq('id', req.params.id)
        .single();

    if (emailConflict) {
        throw new ConflictError('Another client with this email already exists');
    }

    const { data: client, error } = await supabase
        .from('clients')
        .update({
            name,
            email,
            phone,
            company,
            address,
            notes
        })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();

    if (error) {
        logger.error('Update client error:', error);
        throw new Error('Failed to update client');
    }

    logger.info(`Client updated: ${client.id} by user ${req.userId}`);

    res.json({
        success: true,
        client
    });
}));

// Update client status
router.patch('/:id/status', authMiddleware, asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!['active', 'inactive', 'blocked'].includes(status)) {
        throw new ValidationError('Invalid status. Must be active, inactive, or blocked');
    }

    const { data: client, error } = await supabase
        .from('clients')
        .update({ status })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();

    if (error || !client) {
        throw new NotFoundError('Client not found');
    }

    logger.info(`Client status updated: ${client.id} to ${status}`);

    res.json({
        success: true,
        client
    });
}));

// Delete client (soft delete by setting status to inactive)
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
    const { data: client, error } = await supabase
        .from('clients')
        .update({ status: 'inactive' })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();

    if (error || !client) {
        throw new NotFoundError('Client not found');
    }

    logger.info(`Client soft deleted: ${client.id}`);

    res.json({
        success: true,
        message: 'Client deactivated successfully'
    });
}));

// Get client statistics
router.get('/:id/stats', authMiddleware, asyncHandler(async (req, res) => {
    const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .single();

    if (!client) {
        throw new NotFoundError('Client not found');
    }

    // Get invoice statistics
    const { data: stats } = await supabase
        .from('invoices')
        .select('status, amount')
        .eq('client_id', req.params.id)
        .eq('user_id', req.userId);

    const totalInvoices = stats.length;
    const paidInvoices = stats.filter(s => s.status === 'paid').length;
    const pendingInvoices = stats.filter(s => s.status !== 'paid').length;
    const totalAmount = stats.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const paidAmount = stats.filter(s => s.status === 'paid').reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const pendingAmount = totalAmount - paidAmount;

    res.json({
        success: true,
        stats: {
            totalInvoices,
            paidInvoices,
            pendingInvoices,
            totalAmount,
            paidAmount,
            pendingAmount
        }
    });
}));

module.exports = router;
