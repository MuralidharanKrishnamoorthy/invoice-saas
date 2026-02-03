import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../components/UI';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/validation';

export default function Upload() {
    const navigate = useNavigate();
    const { addInvoices, invoices, loading, fetchInvoices } = useApp();
    const [previewInvoices, setPreviewInvoices] = useState([]);

    const [isDragging, setIsDragging] = useState(false);
    const [errors, setErrors] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleUpload(files);
        }
    }, []);

    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleUpload(files);
        }
    };

    const handleUpload = async (files) => {
        console.log('🚀 Starting upload process...', files.length, 'file(s)');
        setIsProcessing(true);
        setErrors([]);

        const formData = new FormData();
        Array.from(files).forEach((file) => {
            console.log('📎 Adding file:', file.name, file.type, file.size, 'bytes');
            formData.append('file', file);
        });

        try {
            // Use the new Universal Agent endpoint
            // We need to bypass the context addInvoices for the initial upload step
            // to allow review before saving if desired, but for MVP we save directly
            // as per the backend implementation.

            // However, the backend route saves directly to DB. 
            // We should fetch the result and update local state to show the user.

            // To properly integrate with current context, we might need a direct API call here
            // instead of context wrapper if context doesn't support multipart yet.
            // Let's assume we can use a direct fetch for this special "Agent" upload.

            const token = localStorage.getItem('auth_token');
            console.log('🔑 Token:', token ? 'Present' : 'Missing');

            console.log('📤 Sending request to API...');
            const response = await fetch('http://localhost:3000/api/invoices/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // FormData automatically sets Content-Type
                },
                body: formData
            });

            console.log('📥 Response status:', response.status, response.statusText);
            const data = await response.json();
            console.log('📦 Response data:', data);

            if (!response.ok) {
                if (response.status === 403 && data.error === 'LIMIT_REACHED') {
                    toast.error(data.message, { duration: 5000 });
                    // Optional: Redirect to subscription after a delay or show a button
                    setTimeout(() => navigate('/subscription'), 2000);
                    throw new Error(data.message); // Stop processing
                }
                throw new Error(data.message || 'Upload failed');
            }

            // Fetch invoices to get properly mapped data (snake_case -> camelCase)
            await fetchInvoices();

            toast.success(`Successfully uploaded ${data.invoices.length} invoice(s)!`);
            navigate('/dashboard');

        } catch (err) {
            console.error('❌ Upload Error:', err);
            toast.error(err.message || 'Failed to process files');
            setErrors([err.message]);
        } finally {
            setIsProcessing(false);
            console.log('✅ Upload process completed');
        }
    };

    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const avgDaysLate = invoices.length
        ? Math.round(invoices.reduce((sum, inv) => sum + inv.daysLate, 0) / invoices.length)
        : 0;

    const handleStartChasing = async () => {
        try {
            await addInvoices(invoices);
            toast.success(`Started chasing ${invoices.length} invoice(s)!`);
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.message || 'Failed to save invoices');
        }
    };

    const handleRemoveInvoice = (id) => {
        setPreviewInvoices(previewInvoices.filter((inv) => inv.id !== id));
        toast.success('Invoice removed');
    };

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <header className="bg-white border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div
                        className="text-2xl font-bold cursor-pointer"
                        onClick={() => navigate('/')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
                    >
                        PayMe.ai
                    </div>
                    <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                        Dashboard
                    </Button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-12">
                <h1 className="text-4xl font-bold mb-2">Upload Invoices</h1>
                <p className="text-zinc-600 mb-8">
                    Upload your CSV file with columns: Invoice, Client, Email, Amount, Due
                </p>

                {/* Error Messages */}
                {errors.length > 0 && (
                    <Card className="mb-6 border-zinc-300 bg-zinc-100">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-zinc-900 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-zinc-900 mb-2">Validation Errors</h3>
                                <ul className="text-sm text-zinc-700 space-y-1">
                                    {errors.slice(0, 5).map((error, idx) => (
                                        <li key={idx}>• {error}</li>
                                    ))}
                                    {errors.length > 5 && (
                                        <li className="font-medium">... and {errors.length - 5} more</li>
                                    )}
                                </ul>
                            </div>
                            <button
                                onClick={() => setErrors([])}
                                className="text-zinc-600 hover:text-zinc-900"
                                aria-label="Dismiss errors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </Card>
                )}

                {/* Upload Zone */}
                {invoices.length === 0 ? (
                    <Card
                        className={`border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${isDragging ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-300'
                            }`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-input').click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('file-input').click()}
                        aria-label="Upload files"
                    >
                        <div className="relative w-16 h-16 mx-auto mb-6">
                            <UploadIcon className="w-16 h-16 text-zinc-400" />
                            <div className="absolute -bottom-2 -right-2 bg-zinc-900 text-white text-xs font-bold px-2 py-1 rounded-full">
                                AI
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold mb-3">Universal File Upload</h3>
                        <p className="text-zinc-600 mb-6 text-lg">
                            Drag & drop <span className="font-bold text-zinc-900">PDF, Excel, or CSV</span> files
                        </p>
                        <div className="flex justify-center gap-3 text-sm text-zinc-500 mb-6">
                            <span className="bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">.pdf</span>
                            <span className="bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">.xlsx</span>
                            <span className="bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">.csv</span>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Our AI Agent extracts invoice data from any format automatically
                        </p>
                        <input
                            id="file-input"
                            type="file"
                            accept=".csv,.pdf,.xlsx,.xls"
                            multiple
                            onChange={handleFileInput}
                            className="hidden"
                            aria-label="File input"
                        />
                    </Card>
                ) : (
                    <>
                        {/* Preview Summary */}
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <Card>
                                <div className="text-sm text-zinc-600 mb-1">Total Invoices</div>
                                <div className="text-3xl font-bold">{invoices.length}</div>
                            </Card>
                            <Card>
                                <div className="text-sm text-zinc-600 mb-1">Total Amount</div>
                                <div className="text-3xl font-bold">{formatCurrency(totalAmount)}</div>
                            </Card>
                            <Card>
                                <div className="text-sm text-zinc-600 mb-1">Avg Days Late</div>
                                <div className="text-3xl font-bold">{avgDaysLate}</div>
                            </Card>
                        </div>

                        {/* Invoice Table */}
                        <Card className="overflow-hidden p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full" role="table">
                                    <thead className="bg-zinc-50 border-b border-zinc-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Invoice</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Client</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                                            <th className="px-6 py-3 text-right text-sm font-semibold">Amount</th>
                                            <th className="px-6 py-3 text-left text-sm font-semibold">Due Date</th>
                                            <th className="px-6 py-3 text-right text-sm font-semibold">Days Late</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200">
                                        {invoices.map((invoice) => (
                                            <tr key={invoice.id} className="hover:bg-zinc-50">
                                                <td className="px-6 py-4 text-sm font-medium">#{invoice.invoice}</td>
                                                <td className="px-6 py-4 text-sm">{invoice.client}</td>
                                                <td className="px-6 py-4 text-sm text-zinc-600">{invoice.email}</td>
                                                <td className="px-6 py-4 text-sm text-right font-medium">
                                                    {formatCurrency(invoice.amount, invoice.currency)}
                                                </td>
                                                <td className="px-6 py-4 text-sm">{invoice.due}</td>
                                                <td className="px-6 py-4 text-sm text-right">
                                                    {invoice.daysLate > 0 ? (
                                                        <span className="text-zinc-900 font-medium">{invoice.daysLate} days</span>
                                                    ) : (
                                                        <span className="text-zinc-600">On time</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-center">
                                                    <button
                                                        onClick={() => handleRemoveInvoice(invoice.id)}
                                                        className="text-zinc-600 hover:text-zinc-900 transition-colors"
                                                        aria-label={`Remove invoice ${invoice.invoice}`}
                                                    >
                                                        <X className="w-4 h-4 inline" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Actions */}
                        <div className="flex justify-between items-center mt-8">
                            <Button variant="secondary" onClick={() => setPreviewInvoices([])}>
                                Upload Different File
                            </Button>
                            <Button onClick={handleStartChasing} disabled={loading}>
                                Start Chasing {invoices.length} Invoice{invoices.length !== 1 ? 's' : ''}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
