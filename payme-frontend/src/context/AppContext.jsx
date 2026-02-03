import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
        setInvoices([]);
    }, []);

    const loadFromLocalStorage = useCallback(() => {
        const stored = localStorage.getItem('invoices');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setInvoices(data);
            } catch (err) {
            }
        }
    }, []);

    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const { data } = await api.stats.getRecovery();
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // Fetch invoices from API
    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.invoices.getAll();

            // Map backend field names to frontend format
            const mappedInvoices = response.data.map(inv => ({
                id: inv.id,
                invoice: inv.invoice_number,
                client: inv.client_name,
                email: inv.client_email,
                amount: inv.amount,
                currency: inv.currency || 'USD',
                due: inv.due_date,
                daysLate: inv.days_late,
                status: inv.status,
                emailsSent: inv.emails_sent,
                lastEmailSentAt: inv.last_email_sent_at,
                paidAt: inv.paid_at,
                createdAt: inv.created_at,
                reminderStatus: inv.reminder_status || 'active',
                pausedUntil: inv.reminders_paused_until,
                pauseReason: inv.pause_reason,
                lateFee: inv.late_fee || 0
            }));

            setInvoices(mappedInvoices);
            return mappedInvoices;
        } catch (err) {
            setError(err.message);
            loadFromLocalStorage();
        } finally {
            setLoading(false);
        }
    }, [loadFromLocalStorage]);

    const syncUser = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const { data } = await api.auth.me();
                setUser(data.user);
                localStorage.setItem('user', JSON.stringify(data.user));
                await fetchInvoices();
                await fetchStats();
                return data.user;
            } catch (err) {
                if (err.response?.status === 401) {
                    logout();
                }
                return null;
            }
        }
        return null;
    }, [fetchInvoices, fetchStats, logout]);

    // Check if user is logged in on mount
    useEffect(() => {
        syncUser();
    }, [syncUser]);

    // Convert invoices to CSV format helper
    const convertToCSV = useCallback((invoices) => {
        const headers = 'Invoice,Client,Email,Amount,Due\n';
        const rows = invoices.map(inv =>
            `${inv.invoice},${inv.client},${inv.email},${inv.amount},${inv.due}`
        ).join('\n');
        return headers + rows;
    }, []);

    // Add invoices (from CSV upload)
    const addInvoices = useCallback(async (newInvoices) => {
        setLoading(true);
        setError(null);
        try {
            const csvContent = convertToCSV(newInvoices);
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const formData = new FormData();
            formData.append('file', blob, 'invoices.csv');

            const response = await api.invoices.uploadCSV(formData);
            await fetchInvoices();
            await fetchStats();
            return response.data.invoices;
        } catch (err) {
            console.error('Add invoices error:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices, fetchStats, convertToCSV]);

    // Update invoice
    const updateInvoice = useCallback(async (id, updates) => {
        setLoading(true);
        setError(null);
        try {
            await api.invoices.update(id, updates);
            await fetchInvoices();
        } catch (err) {
            console.error('Update invoice error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices]);

    // Delete invoice
    const deleteInvoice = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            await api.invoices.delete(id);
            await fetchInvoices();
            await fetchStats();
        } catch (err) {
            console.error('Delete invoice error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices, fetchStats]);

    // Mark as paid
    const markAsPaid = useCallback(async (id, proofFile = null, paymentData = {}) => {
        setLoading(true);
        try {
            const result = await api.payments.markAsPaid(id, proofFile, paymentData);
            await fetchInvoices();
            await fetchStats();
            return result?.data;
        } catch (err) {
            console.error('Mark as paid error:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices, fetchStats]);

    // Pause reminders
    const pauseInvoice = useCallback(async (id, duration, reason) => {
        setLoading(true);
        try {
            await api.invoices.pause(id, duration, reason);
            await fetchInvoices();
        } catch (err) {
            console.error('Pause error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices]);

    // Resume reminders
    const resumeInvoice = useCallback(async (id) => {
        setLoading(true);
        try {
            await api.invoices.resume(id);
            await fetchInvoices();
        } catch (err) {
            console.error('Resume error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices]);

    // Edit email
    const editEmail = useCallback(async (id, emailData) => {
        setLoading(true);
        try {
            await api.invoices.editEmail(id, emailData);
            await fetchInvoices();
        } catch (err) {
            console.error('Edit email error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices]);

    // Clear all invoices
    const clearInvoices = useCallback(() => {
        setInvoices([]);
        localStorage.removeItem('invoices');
    }, []);

    const isSubscribed = useCallback(() => {
        return user?.subscription_status === 'active';
    }, [user]);

    const value = {
        invoices,
        loading,
        error,
        user,
        setUser,
        fetchInvoices,
        addInvoices,
        updateInvoice,
        deleteInvoice,
        markAsPaid,
        pauseInvoice,
        resumeInvoice,
        editEmail,
        clearInvoices,
        logout,
        isSubscribed,
        syncUser,
        stats,
        statsLoading,
        fetchStats,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
