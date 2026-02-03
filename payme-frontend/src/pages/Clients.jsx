import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Filter, Mail, Phone, Building2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../components/UI';
import { LoadingOverlay } from '../components/Loading';

export default function ClientsPage() {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    useEffect(() => {
        fetchClients();
    }, [page, search, statusFilter]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            const params = new URLSearchParams({
                page,
                limit: 20,
                search,
                status: statusFilter
            });

            const response = await fetch(`http://localhost:3000/api/clients?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to fetch clients');
            }

            setClients(data.clients);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Fetch clients error:', error);
            toast.error(error.message || 'Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1); // Reset to first page on search
    };

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-zinc-50">


            {/* Header */}
            <header className="bg-white border-b border-zinc-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-zinc-900" />
                        <h1 className="text-2xl font-bold">Clients</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                            Dashboard
                        </Button>
                        <Button onClick={() => navigate('/clients/new')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Client
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Filters */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or company..."
                            value={search}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleStatusFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === 'all'
                                ? 'bg-zinc-900 text-white'
                                : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => handleStatusFilter('active')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === 'active'
                                ? 'bg-zinc-900 text-white'
                                : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => handleStatusFilter('inactive')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === 'inactive'
                                ? 'bg-zinc-900 text-white'
                                : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                                }`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>

                {/* Stats */}
                {pagination && (
                    <div className="mb-6 text-sm text-zinc-600">
                        Showing {clients.length} of {pagination.total} clients
                    </div>
                )}

                {/* Clients Grid */}
                {clients.length === 0 ? (
                    <Card className="text-center py-12">
                        <Users className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No clients found</h3>
                        <p className="text-zinc-600 mb-4">
                            {search ? 'Try adjusting your search' : 'Get started by adding your first client'}
                        </p>
                        {!search && (
                            <Button onClick={() => navigate('/clients/new')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Client
                            </Button>
                        )}
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {clients.map((client) => (
                            <Card key={client.id} className="hover:shadow-lg transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg mb-1">{client.name}</h3>
                                        {client.company && (
                                            <div className="flex items-center gap-2 text-sm text-zinc-600">
                                                <Building2 className="w-4 h-4" />
                                                {client.company}
                                            </div>
                                        )}
                                    </div>
                                    <span
                                        className={`px-2 py-1 text-xs font-medium rounded-full ${client.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-zinc-100 text-zinc-700'
                                            }`}
                                    >
                                        {client.status}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-zinc-600">
                                        <Mail className="w-4 h-4" />
                                        {client.email}
                                    </div>
                                    {client.phone && (
                                        <div className="flex items-center gap-2 text-sm text-zinc-600">
                                            <Phone className="w-4 h-4" />
                                            {client.phone}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-zinc-200">
                                    <div>
                                        <div className="text-xs text-zinc-600">Invoices</div>
                                        <div className="text-lg font-semibold">{client.total_invoices || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-zinc-600">Amount Due</div>
                                        <div className="text-lg font-semibold">
                                            ${(client.total_amount_due || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => navigate(`/clients/${client.id}`)}
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                </Button>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="px-4 py-2 text-sm text-zinc-600">
                            Page {page} of {pagination.totalPages}
                        </span>
                        <Button
                            variant="secondary"
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
