import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Clock, CheckCircle2, Mail, Eye, X, Trash2, Loader2, RefreshCw, Pause, Play, Edit2, Save, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../components/UI';
import { LoadingOverlay, SkeletonCard, SkeletonTable } from '../components/Loading';
import PaymentProofModal from '../components/PaymentProofModal';
import StatsWidget from '../components/StatsWidget';
import ShareModal from '../components/ShareModal';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/validation';
import { api } from '../services/api';

export default function Dashboard() {
    const navigate = useNavigate();
    const { invoices, loading, appLoading, user, logout, markAsPaid, deleteInvoice, pauseInvoice, resumeInvoice, editEmail, isSubscribed, fetchInvoices } = useApp();
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Fetch invoices on mount
    useEffect(() => {
        if (user) {
            fetchInvoices();
        }
    }, [user, fetchInvoices]);
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [pauseModalInvoice, setPauseModalInvoice] = useState(null);
    const [pauseDuration, setPauseDuration] = useState('7');
    const [pauseReason, setPauseReason] = useState('');

    // Share Modal State
    const [shareModalData, setShareModalData] = useState(null); // { invoice, proofUrl }

    // Computed values using useMemo for performance
    const activeInvoices = useMemo(
        () => invoices.filter((inv) => inv.status !== 'paid'),
        [invoices]
    );

    // No longer need local stats calculation if using Widget, but keep for table if needed
    // Actually, keeping the old logic for table sorting/filtering if I add that later? 
    // The prompt replaced the "stats" section. I will keep the existing stats for now below the new widget? 
    // "Dashboard.jsx top hero section". The prompt implies main stats. 
    // Let's Put StatsWidget at the top. The existing "active chasing / total invoices" cards are mighty useful too though.
    // I will replace the existing simple grid with the new StatsWidget as requested.

    // Dynamic Email Preview State
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState({
        upcoming: null,
        day1: null,
        day7: null,
        day14: null
    });
    const [activePreviewTab, setActivePreviewTab] = useState('day1');
    const [isEditing, setIsEditing] = useState(false);
    const [editedSubject, setEditedSubject] = useState('');
    const [editedBody, setEditedBody] = useState('');
    const [isRegenerating, setIsRegenerating] = useState(false);

    const fetchEmailPreviews = useCallback(async (invoiceId) => {
        setPreviewLoading(true);
        try {
            // Fetch previews in parallel
            const types = ['upcoming', 'day1', 'day7', 'day14'];
            const results = await Promise.all(
                types.map(async (type) => {
                    try {
                        const { data } = await api.invoices.previewEmail(invoiceId, type);
                        return { type, data };
                    } catch (err) {
                        console.error(`Failed to fetch ${type} preview:`, err);
                        return { type, error: true };
                    }
                })
            );

            const newPreviews = {};
            results.forEach(res => {
                if (!res.error) newPreviews[res.type] = res.data;
            });

            setPreviewData(prev => ({ ...prev, ...newPreviews }));
        } catch (err) {
            toast.error('Failed to generate email previews');
        } finally {
            setPreviewLoading(false);
        }
    }, []);

    // Effect to load previews when modal opens
    useEffect(() => {
        if (selectedInvoice) {
            fetchEmailPreviews(selectedInvoice.id);
            // Default to 'upcoming' if invoice is not late yet, else 'day1'
            setActivePreviewTab(selectedInvoice.daysLate < 0 ? 'upcoming' : 'day1');
        } else {
            setPreviewData({ upcoming: null, day1: null, day7: null, day14: null });
        }
    }, [selectedInvoice, fetchEmailPreviews]);

    const getStatusBadge = (status) => {
        const badges = {
            pending: { text: 'Pending', color: 'bg-zinc-100 text-zinc-700' },
            day1_sent: { text: 'Day 1 Sent', color: 'bg-zinc-200 text-zinc-800' },
            day7_sent: { text: 'Day 7 Sent', color: 'bg-zinc-300 text-zinc-900' },
            day14_sent: { text: 'Day 14 Sent', color: 'bg-zinc-800 text-white' },
            paid: { text: 'Paid', color: 'bg-zinc-900 text-white' },
            paused: { text: 'Paused', color: 'bg-amber-100 text-amber-700' },
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.text}
            </span>
        );
    };

    const handlePaymentConfirm = async (file) => {
        if (!paymentInvoice) return;
        try {
            const result = await markAsPaid(paymentInvoice.id, file); // markAsPaid usually returns void in context? 
            // In context/AppContext.jsx:
            // const markAsPaid = async (id, proofFile) => { ... const { data } = await api.payments.markAsPaid(id, proofFile); ... return data; }
            // So it returns the updated invoice.

            toast.success(`Invoice #${paymentInvoice.invoice} marked as paid!`);

            // Open Share Modal
            // We need the payment proof URL. If returned by backend, use it.
            // result is the invoice object from DB.
            const proofUrl = result.paymentProofUrl ? `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${result.paymentProofUrl}` : null;

            setShareModalData({
                invoice: paymentInvoice,
                proofUrl: proofUrl
            });

            setPaymentInvoice(null);
        } catch (err) {
            toast.error(err.message || 'Failed to mark as paid');
        }
    };

    const handleDelete = async (id, invoiceNumber) => {
        if (window.confirm(`Are you sure you want to delete Invoice #${invoiceNumber}?`)) {
            try {
                await deleteInvoice(id);
                toast.success(`Invoice #${invoiceNumber} deleted`);
            } catch (err) {
                toast.error(err.message || 'Failed to delete invoice');
            }
        }
    };

    const handlePause = async () => {
        if (!pauseModalInvoice) return;
        try {
            await pauseInvoice(pauseModalInvoice.id, pauseDuration, pauseReason);
            toast.success(`Reminders paused for Invoice #${pauseModalInvoice.invoice}`);
            setPauseModalInvoice(null);
        } catch (err) {
            toast.error(err.message || 'Failed to pause reminders');
        }
    };

    const handleResume = async (invoice) => {
        try {
            await resumeInvoice(invoice.id);
            toast.success(`Reminders resumed for Invoice #${invoice.invoice}`);
        } catch (err) {
            toast.error(err.message || 'Failed to resume reminders');
        }
    };

    const handleSaveEmail = async () => {
        if (!selectedInvoice) return;
        try {
            await editEmail(selectedInvoice.id, {
                emailType: activePreviewTab,
                subject: editedSubject,
                body: editedBody
            });
            toast.success('Email saved successfully');
            setIsEditing(false);
            // Update local preview data
            setPreviewData(prev => ({
                ...prev,
                [activePreviewTab]: {
                    ...prev[activePreviewTab],
                    subject: editedSubject,
                    body: editedBody,
                    user_edited: true
                }
            }));
        } catch (err) {
            toast.error(err.message || 'Failed to save email');
        }
    };

    const handleRegenerate = async (tone) => {
        if (!selectedInvoice) return;
        setIsRegenerating(true);
        try {
            toast.loading(`Regenerating with ${tone} tone...`, { id: 'regenerate' });

            // Re-fetch from backend with tone and forceRegenerate
            const { data } = await api.invoices.previewEmail(selectedInvoice.id, activePreviewTab, tone, true);

            setEditedSubject(data.subject);
            setEditedBody(data.body);
            setPreviewData(prev => ({ ...prev, [activePreviewTab]: data }));

            toast.success('Regenerated successfully', { id: 'regenerate' });
        } catch (err) {
            toast.error('Failed to regenerate', { id: 'regenerate' });
        } finally {
            setIsRegenerating(false);
        }
    };



    return (
        <div className="min-h-screen bg-zinc-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-zinc-200 min-h-screen flex flex-col fixed h-full z-10">
                {/* Logo */}
                <div className="p-6 border-b border-zinc-200">
                    <div
                        className="text-2xl font-bold cursor-pointer"
                        onClick={() => navigate('/')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
                    >
                        PayMe.ai
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/upload')}
                            className="w-full text-left px-4 py-3 rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors font-medium"
                        >
                            Upload New CSV
                        </button>
                        <button
                            onClick={() => navigate('/subscription')}
                            className="w-full text-left px-4 py-3 rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors font-medium"
                        >
                            Subscription
                        </button>
                    </div>
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-zinc-200">
                    {user && (
                        <div className="px-4 py-2 text-sm text-zinc-600 mb-2">
                            {user.name || user.email}
                        </div>
                    )}
                    <button
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors font-medium"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 ml-64 overflow-auto min-h-screen">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

                    {/* Stats Widget (New) */}
                    <StatsWidget />

                    {/* Invoice Table */}
                    {loading ? (
                        <SkeletonTable rows={5} />
                    ) : invoices.length === 0 ? (
                        <Card className="text-center py-12">
                            <h3 className="text-xl font-semibold mb-2">No invoices yet</h3>
                            <p className="text-zinc-600 mb-6">Upload your first CSV to start chasing invoices</p>
                            <Button onClick={() => navigate('/upload')}>Upload CSV</Button>
                        </Card>
                    ) : (
                        <Card className="overflow-hidden p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full" role="table">
                                    <thead className="bg-zinc-50 border-b border-zinc-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Invoice</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Client</th>
                                            <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Due Date</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200">
                                        {invoices.map((invoice) => (
                                            <tr key={invoice.id} className="hover:bg-zinc-50">
                                                <td className="px-6 py-4 text-sm font-medium">#{invoice.invoice}</td>
                                                <td className="px-6 py-4 text-sm">{invoice.client}</td>
                                                <td className="px-6 py-4 text-sm text-right font-medium">
                                                    {formatCurrency(invoice.amount, invoice.currency)}
                                                </td>
                                                <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                    <div>{invoice.due}</div>
                                                    <div className="text-[11px] mt-0.5">
                                                        {invoice.daysLate > 0 ? (
                                                            <span className="text-red-600 font-medium">{invoice.daysLate} days late</span>
                                                        ) : invoice.daysLate < 0 ? (
                                                            <span className="text-emerald-600 font-medium">{Math.abs(invoice.daysLate)} days until due</span>
                                                        ) : (
                                                            <span className="text-zinc-500">Due today</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                    {getStatusBadge(invoice.status)}
                                                    {invoice.reminderStatus === 'paused' && (
                                                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 font-bold border border-amber-200 uppercase">
                                                            Paused
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {invoice.status !== 'paid' && (
                                                            <>
                                                                <button
                                                                    onClick={() => setSelectedInvoice(invoice)}
                                                                    className="text-zinc-600 hover:text-zinc-900 transition-colors"
                                                                    aria-label={`View/Edit emails for invoice ${invoice.invoice}`}
                                                                    title="View/Edit emails"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                {invoice.reminderStatus === 'paused' ? (
                                                                    <button
                                                                        onClick={() => handleResume(invoice)}
                                                                        className="text-amber-600 hover:text-amber-800 transition-colors"
                                                                        aria-label={`Resume reminders for invoice ${invoice.invoice}`}
                                                                        title="Resume Reminders"
                                                                    >
                                                                        <Play className="w-4 h-4" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setPauseModalInvoice(invoice)}
                                                                        className="text-zinc-600 hover:text-zinc-900 transition-colors"
                                                                        aria-label={`Pause reminders for invoice ${invoice.invoice}`}
                                                                        title="Pause Reminders"
                                                                    >
                                                                        <Pause className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setPaymentInvoice(invoice)}
                                                                    className="text-zinc-600 hover:text-zinc-900 transition-colors"
                                                                    aria-label={`Mark invoice ${invoice.invoice} as paid`}
                                                                    title="Mark as paid"
                                                                >
                                                                    <CheckCircle2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(invoice.id, invoice.invoice)}
                                                            className="text-zinc-600 hover:text-zinc-900 transition-colors"
                                                            aria-label={`Delete invoice ${invoice.invoice}`}
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Email Preview Modal */}
                {selectedInvoice && (
                    <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
                        onClick={() => setSelectedInvoice(null)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                    >
                        <Card
                            className="max-w-2xl w-full max-h-[80vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 id="modal-title" className="text-2xl font-bold">
                                    Email Preview - Invoice #{selectedInvoice.invoice}
                                </h2>
                                <button
                                    onClick={() => setSelectedInvoice(null)}
                                    className="text-zinc-600 hover:text-zinc-900 transition-colors"
                                    aria-label="Close modal"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex gap-2 mb-6 border-b border-zinc-200 overflow-x-auto pb-2">
                                {['upcoming', 'day1', 'day7', 'day14'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setActivePreviewTab(type)}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activePreviewTab === type
                                            ? 'bg-zinc-900 text-white'
                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                            }`}
                                    >
                                        {type === 'upcoming' ? 'Pre-Due (-3 Days)' :
                                            type === 'day1' ? 'Day 1 (Overdue)' :
                                                type === 'day7' ? 'Day 7 (Follow-up)' : 'Day 14 (Final)'}
                                    </button>
                                ))}
                            </div>

                            <div className="min-h-[300px]">
                                {previewLoading && !previewData[activePreviewTab] ? (
                                    <div className="flex items-center justify-center h-64 flex-col gap-3 text-zinc-500">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                        <p>Generating preview with AI...</p>
                                    </div>
                                ) : previewData[activePreviewTab] ? (
                                    <div className="animate-in fade-in duration-300">
                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Subject Line</label>
                                                    <input
                                                        type="text"
                                                        value={editedSubject}
                                                        onChange={(e) => setEditedSubject(e.target.value)}
                                                        className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-950 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-zinc-500 uppercase mb-1">Email Body</label>
                                                    <textarea
                                                        rows={10}
                                                        value={editedBody}
                                                        onChange={(e) => setEditedBody(e.target.value)}
                                                        className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-zinc-950 transition-all font-mono"
                                                    />
                                                </div>
                                                <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-xl">
                                                    <div className="flex gap-2 text-xs font-medium">
                                                        <span className="text-zinc-500 mr-2 self-center">TONE:</span>
                                                        <button onClick={() => handleRegenerate('friendly')} className="px-3 py-1.5 bg-white border border-zinc-200 rounded-md hover:border-zinc-400">Friendly</button>
                                                        <button onClick={() => handleRegenerate('professional')} className="px-3 py-1.5 bg-white border border-zinc-200 rounded-md hover:border-zinc-400">Professional</button>
                                                        <button onClick={() => handleRegenerate('firm')} className="px-3 py-1.5 bg-zinc-100 border border-zinc-300 rounded-md hover:bg-zinc-200 text-zinc-900 border-dashed"><Sparkles className="w-3 h-3 inline mr-1" /> Firm</button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                                                        <Button size="sm" onClick={handleSaveEmail} className="gap-2">
                                                            <Save className="w-3.5 h-3.5" /> Save Email
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="text-xs font-semibold text-zinc-500 uppercase mb-1">Subject</div>
                                                        <div className="text-sm font-medium text-zinc-900">{previewData[activePreviewTab].subject}</div>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5 h-8"
                                                        onClick={() => {
                                                            setEditedSubject(previewData[activePreviewTab].subject);
                                                            setEditedBody(previewData[activePreviewTab].body);
                                                            setIsEditing(true);
                                                        }}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> Edit
                                                    </Button>
                                                </div>
                                                <div className="text-xs font-semibold text-zinc-500 uppercase mb-1">Body</div>
                                                <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 text-sm whitespace-pre-wrap leading-relaxed relative group">
                                                    {previewData[activePreviewTab].body}
                                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="text-[10px] bg-zinc-900 text-white px-2 py-1 rounded">AI Generated</div>
                                                    </div>
                                                </div>
                                                {previewData[activePreviewTab].user_edited && (
                                                    <div className="mt-4 text-[11px] text-amber-600 font-medium flex items-center gap-1">
                                                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                                        You have manually edited this version.
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-64 text-zinc-400">
                                        Failed to load preview.
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}


                {/* Payment Proof Modal */}
                {paymentInvoice && (
                    <PaymentProofModal
                        invoice={paymentInvoice}
                        onClose={() => setPaymentInvoice(null)}
                        onConfirm={handlePaymentConfirm}
                    />
                )}

                {/* Share Modal (New) */}
                {shareModalData && (
                    <ShareModal
                        invoice={shareModalData.invoice}
                        proofUrl={shareModalData.proofUrl}
                        onClose={() => setShareModalData(null)}
                    />
                )}

                {/* Pause Reminders Modal */}
                {pauseModalInvoice && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setPauseModalInvoice(null)}>
                        <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Pause Reminders</h2>
                                <button onClick={() => setPauseModalInvoice(null)}><X className="w-5 h-5" /></button>
                            </div>

                            <p className="text-sm text-zinc-600 mb-6">
                                Temporarily stop automatic reminders for Invoice <strong>#{pauseModalInvoice.invoice}</strong>.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-2">Pause Duration</label>
                                    <select
                                        value={pauseDuration}
                                        onChange={(e) => setPauseDuration(e.target.value)}
                                        className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-950"
                                    >
                                        <option value="7">Pause for 7 days</option>
                                        <option value="14">Pause for 14 days</option>
                                        <option value="30">Pause for 30 days</option>
                                        <option value="indefinite">Pause indefinitely</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 mb-2">Reason (Optional)</label>
                                    <textarea
                                        value={pauseReason}
                                        onChange={(e) => setPauseReason(e.target.value)}
                                        placeholder="e.g. Client said payment coming next week"
                                        className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-950"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <Button variant="ghost" className="flex-1" onClick={() => setPauseModalInvoice(null)}>Cancel</Button>
                                <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={handlePause}>Confirm Pause</Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
