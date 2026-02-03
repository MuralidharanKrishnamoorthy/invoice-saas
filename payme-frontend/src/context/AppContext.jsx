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

    // Logout helper - defined early so it can be used in useEffect
    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
        setInvoices([]);
    }, []);

    // Fallback: Load from localStorage
    const loadFromLocalStorage = useCallback(() => {
        const stored = localStorage.getItem('invoices');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setInvoices(data);
            } catch (err) {
                console.error('Failed to parse stored invoices:', err);
            }
        }
    }, []);

    // Fetch invoices from API
    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('🌐 Calling API to fetch invoices...');
            const response = await api.invoices.getAll();
            console.log('📥 Received invoices response:', response.data);

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
                pauseReason: inv.pause_reason
            }));

            setInvoices(mappedInvoices);
            return mappedInvoices;
        } catch (err) {
            console.error('Fetch invoices error:', err);
            setError(err.message);
            // Fallback to localStorage
            loadFromLocalStorage();
        } finally {
            setLoading(false);
        }
    }, [loadFromLocalStorage]);

    // Check if user is logged in on mount
    useEffect(() => {
        const syncUser = async () => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                try {
                    const { data } = await api.auth.me();
                    setUser(data.user);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    await fetchInvoices();
                } catch (err) {
                    console.error('Failed to sync user session:', err);
                    if (err.response?.status === 401) {
                        logout();
                    }
                }
            }
        };

        syncUser();
    }, [fetchInvoices, logout]);

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
            return response.data.invoices;
        } catch (err) {
            console.error('Add invoices error:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices, convertToCSV]);

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
        } catch (err) {
            console.error('Delete invoice error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices]);

    // Mark as paid
    const markAsPaid = useCallback(async (id, proofFile = null) => {
        setLoading(true);
        try {
            await api.payments.markAsPaid(id, proofFile);
            await fetchInvoices();
        } catch (err) {
            console.error('Mark as paid error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetchInvoices]);

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
        return true; // Reverted flow
    }, []);

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
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
