import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../components/UI';
import { LoadingOverlay } from '../components/Loading';

export default function ClientFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        notes: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isEdit) {
            fetchClient();
        }
    }, [id]);

    const fetchClient = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:3000/api/clients/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setFormData({
                name: data.client.name || '',
                email: data.client.email || '',
                phone: data.client.phone || '',
                company: data.client.company || '',
                address: data.client.address || '',
                notes: data.client.notes || ''
            });
        } catch (error) {
            toast.error(error.message || 'Failed to load client');
            navigate('/clients');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('auth_token');

            const response = await fetch(
                isEdit
                    ? `http://localhost:3000/api/clients/${id}`
                    : 'http://localhost:3000/api/clients',
                {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                // Handle validation errors from backend
                if (data.details) {
                    const backendErrors = {};
                    data.details.forEach(err => {
                        backendErrors[err.field] = err.message;
                    });
                    setErrors(backendErrors);
                }
                throw new Error(data.message || 'Failed to save client');
            }

            toast.success(isEdit ? 'Client updated successfully' : 'Client created successfully');
            navigate(isEdit ? `/clients/${id}` : '/clients');
        } catch (error) {
            toast.error(error.message || 'Failed to save client');
        } finally {
            setSubmitting(false);
        }
    };



    return (
        <div className="min-h-screen bg-zinc-50">


            {/* Header */}
            <header className="bg-white border-b border-zinc-200">
                <div className="max-w-3xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <Button variant="secondary" onClick={() => navigate(isEdit ? `/clients/${id}` : '/clients')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <h1 className="text-2xl font-bold">{isEdit ? 'Edit Client' : 'New Client'}</h1>
                    </div>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-6 py-8">
                <Card>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6">
                            {/* Name */}
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium mb-2">
                                    Name <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 ${errors.name ? 'border-red-500' : 'border-zinc-300'
                                        }`}
                                    placeholder="John Doe"
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2">
                                    Email <span className="text-red-600">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 ${errors.email ? 'border-red-500' : 'border-zinc-300'
                                        }`}
                                    placeholder="john@example.com"
                                />
                                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                            </div>

                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium mb-2">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>

                            {/* Company */}
                            <div>
                                <label htmlFor="company" className="block text-sm font-medium mb-2">
                                    Company
                                </label>
                                <input
                                    type="text"
                                    id="company"
                                    name="company"
                                    value={formData.company}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                                    placeholder="Acme Corporation"
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium mb-2">
                                    Address
                                </label>
                                <textarea
                                    id="address"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                                    placeholder="123 Main St, City, State 12345"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium mb-2">
                                    Notes
                                </label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                                    placeholder="Additional notes about this client..."
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-8 flex items-center justify-end gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => navigate(isEdit ? `/clients/${id}` : '/clients')}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting} className="min-w-[140px] flex items-center justify-center">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <><Save className="w-4 h-4 mr-2" /> {isEdit ? 'Update Client' : 'Create Client'}</>
                                )}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
