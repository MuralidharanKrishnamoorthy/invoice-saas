import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            // Server responded with error
            const message = error.response.data?.message || 'An error occurred';
            return Promise.reject(new Error(message));
        } else if (error.request) {
            // Request made but no response
            return Promise.reject(new Error('Network error. Please check your connection.'));
        } else {
            // Something else happened
            return Promise.reject(new Error('An unexpected error occurred'));
        }
    }
);

// API methods
export const api = {
    // Invoice endpoints
    invoices: {
        getAll: () => apiClient.get('/invoices'),
        getById: (id) => apiClient.get(`/invoices/${id}`),
        create: (data) => apiClient.post('/invoices', data),
        update: (id, data) => apiClient.put(`/invoices/${id}`, data),
        delete: (id) => apiClient.delete(`/invoices/${id}`),
        uploadCSV: (formData) =>
            apiClient.post('/invoices/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            }),
        generateEmails: (id) => apiClient.post(`/invoices/${id}/generate-emails`),
        previewEmail: (id, emailType, tone = null, forceRegenerate = false) => apiClient.post(`/invoices/${id}/preview-email`, { emailType, tone, forceRegenerate }),
        pause: (id, duration, reason) => apiClient.patch(`/invoices/${id}/pause`, { duration, reason }),
        resume: (id) => apiClient.patch(`/invoices/${id}/resume`),
        editEmail: (id, emailData) => apiClient.patch(`/invoices/${id}/edit-email`, emailData),
        // The original markAsPaid method is being replaced/moved to payments
    },

    // Payments endpoints
    payments: {
        getHistory: () => apiClient.get('/payments'),
        markAsPaid: (id, proofFile) => {
            const formData = new FormData();
            if (proofFile) formData.append('proof', proofFile);
            return apiClient.patch(`/invoices/${id}/paid`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
    },

    // User endpoints (for future auth)
    auth: {
        login: (credentials) => apiClient.post('/auth/login', credentials),
        register: (userData) => apiClient.post('/auth/register', userData),
        logout: () => apiClient.post('/auth/logout'),
        getCurrentUser: () => apiClient.get('/auth/me'),
        me: () => apiClient.get('/auth/me'),
    },

    // Stats endpoints
    stats: {
        getRecovery: () => apiClient.get('/stats/recovery'),
    },

    // Subscriptions endpoints
    subscriptions: {
        getPricing: (country = null) => apiClient.get('/subscriptions/pricing', { params: { country } }),
        detectCountry: () => apiClient.get('/subscriptions/detect-country'),
        create: (data) => apiClient.post('/subscriptions/create', data),
    },
};

export default apiClient;
