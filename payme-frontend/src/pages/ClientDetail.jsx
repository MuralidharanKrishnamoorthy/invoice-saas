import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Building2, MapPin, Edit, Trash2, FileText, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../components/UI';
import { LoadingOverlay } from '../components/Loading';

export default function ClientDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClientData();
    }, [id]);

    const fetchClientData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');

            // Fetch client details
            const clientRes = await fetch(`http://localhost:3000/api/clients/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const clientData = await clientRes.json();
            if (!clientRes.ok) throw new Error(clientData.message);
            setClient(clientData.client);

            // Fetch client invoices
            const invoicesRes = await fetch(`http://localhost:3000/api/clients/${id}/invoices`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const invoicesData = await invoicesRes.json();
            if (invoicesRes.ok) setInvoices(invoicesData.invoices);

            // Fetch client stats
            const statsRes = await fetch(`http://localhost:3000/api/clients/${id}/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const statsData = await statsRes.json();
            if (statsRes.ok) setStats(statsData.stats);

        } catch (error) {
            console.error('Fetch error:', error);
            toast.error(error.message || 'Failed to load client');
            navigate('/clients');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to deactivate this client?')) return;

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:3000/api/clients/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            toast.success('Client deactivated successfully');
            navigate('/clients');
        } catch (error) {
            toast.error(error.message || 'Failed to delete client');
        }
    };

    if (!client && loading) return null;
    if (!client && !loading) return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
            <p className="text-zinc-500">Client not found</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <header className="bg-white border-b border-zinc-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="secondary" onClick={() => navigate('/clients')}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">{client.name}</h1>
                                <p className="text-sm text-zinc-600">{client.company || 'No company'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="secondary" onClick={() => navigate(`/clients/${id}/edit`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                            <Button variant="secondary" onClick={handleDelete} className="text-red-600 hover:bg-red-50">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <Card>
                            <div className="text-sm text-zinc-600 mb-1">Total Invoices</div>
                            <div className="text-3xl font-bold">{stats.totalInvoices}</div>
                        </Card>
                        <Card>
                            <div className="text-sm text-zinc-600 mb-1">Paid Invoices</div>
                            <div className="text-3xl font-bold text-green-600">{stats.paidInvoices}</div>
                        </Card>
                        <Card>
                            <div className="text-sm text-zinc-600 mb-1">Pending Invoices</div>
                            <div className="text-3xl font-bold text-orange-600">{stats.pendingInvoices}</div>
                        </Card>
                        <Card>
                            <div className="text-sm text-zinc-600 mb-1">Amount Due</div>
                            <div className="text-3xl font-bold">${stats.pendingAmount.toLocaleString()}</div>
                        </Card>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Client Info */}
                    <div className="lg:col-span-1">
                        <Card>
                            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-zinc-600 mt-0.5" />
                                    <div>
                                        <div className="text-sm text-zinc-600">Email</div>
                                        <div className="font-medium">{client.email}</div>
                                    </div>
                                </div>
                                {client.phone && (
                                    <div className="flex items-start gap-3">
                                        <Phone className="w-5 h-5 text-zinc-600 mt-0.5" />
                                        <div>
                                            <div className="text-sm text-zinc-600">Phone</div>
                                            <div className="font-medium">{client.phone}</div>
                                        </div>
                                    </div>
                                )}
                                {client.company && (
                                    <div className="flex items-start gap-3">
                                        <Building2 className="w-5 h-5 text-zinc-600 mt-0.5" />
                                        <div>
                                            <div className="text-sm text-zinc-600">Company</div>
                                            <div className="font-medium">{client.company}</div>
                                        </div>
                                    </div>
                                )}
                                {client.address && (
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-zinc-600 mt-0.5" />
                                        <div>
                                            <div className="text-sm text-zinc-600">Address</div>
                                            <div className="font-medium">{client.address}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {client.notes && (
                                <div className="mt-6 pt-6 border-t border-zinc-200">
                                    <div className="text-sm text-zinc-600 mb-2">Notes</div>
                                    <p className="text-sm">{client.notes}</p>
                                </div>
                            )}

                            <div className="mt-6 pt-6 border-t border-zinc-200">
                                <div className="text-sm text-zinc-600">Status</div>
                                <span className={`inline-block mt-1 px-3 py-1 text-sm font-medium rounded-full ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-700'
                                    }`}>
                                    {client.status}
                                </span>
                            </div>
                        </Card>
                    </div>

                    {/* Invoices */}
                    <div className="lg:col-span-2">
                        <Card className="p-0">
                            <div className="p-6 border-b border-zinc-200">
                                <h2 className="text-lg font-semibold">Invoices</h2>
                            </div>
                            {invoices.length === 0 ? (
                                <div className="p-12 text-center">
                                    <FileText className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                                    <p className="text-zinc-600">No invoices found for this client</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-zinc-50 border-b border-zinc-200">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-sm font-semibold">Invoice #</th>
                                                <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
                                                <th className="px-6 py-3 text-left text-sm font-semibold">Due Date</th>
                                                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200">
                                            {invoices.map((invoice) => (
                                                <tr key={invoice.id} className="hover:bg-zinc-50">
                                                    <td className="px-6 py-4 text-sm font-medium">#{invoice.invoice_number}</td>
                                                    <td className="px-6 py-4 text-sm text-right font-medium">
                                                        ${parseFloat(invoice.amount).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm">{invoice.due_date}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${invoice.status === 'paid'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-orange-100 text-orange-700'
                                                            }`}>
                                                            {invoice.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
