import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, AlertCircle, X, CheckCircle2, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '../components/UI';
import { useApp } from '../context/AppContext';
import { LoadingSpinner } from '../components/Loading';

import { api } from '../services/api';

export default function Upload() {
    const navigate = useNavigate();
    const { fetchInvoices, user, syncUser } = useApp();

    const [isDragging, setIsDragging] = useState(false);
    const [errors, setErrors] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(null); // { count, firstSendDate }

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

    const calculateFirstSendDate = () => {
        const now = new Date();
        // Add 24-hour buffer
        now.setHours(now.getHours() + 24);
        // Round to next 9 AM
        if (now.getHours() >= 9) {
            now.setDate(now.getDate() + 1);
        }
        now.setHours(9, 0, 0, 0);
        return now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const handleUpload = async (files) => {
        setIsProcessing(true);
        setErrors([]);
        setUploadSuccess(null);

        const formData = new FormData();
        Array.from(files).forEach((file) => {
            formData.append('file', file);
        });

        try {
            const { data } = await api.invoices.uploadCSV(formData);

            await fetchInvoices();
            await syncUser();

            setUploadSuccess({
                count: data.invoices.length,
                firstSendDate: calculateFirstSendDate()
            });

        } catch (err) {
            if (err.message.includes('LIMIT_REACHED')) {
                toast.error(err.message, { duration: 5000 });
                setTimeout(() => navigate('/subscription'), 2000);
            } else {
                toast.error(err.message || 'Failed to process files');
                setErrors([err.message]);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // Success State
    if (uploadSuccess) {
        return (
            <div className="min-h-screen bg-zinc-50">
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
                    </div>
                </header>

                <div className="max-w-2xl mx-auto px-6 py-12">
                    <Card className="text-center py-8">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>

                        <h1 className="text-3xl font-bold mb-1">Reminders Activated!</h1>

                        <p className="text-zinc-600 mb-4">
                            {uploadSuccess.count} invoice{uploadSuccess.count !== 1 ? 's' : ''} uploaded and scheduled successfully.
                        </p>

                        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 mb-6 inline-flex items-center gap-3">
                            <Clock className="w-5 h-5 text-zinc-500" />
                            <div className="text-left">
                                <div className="text-sm font-medium text-zinc-900">First emails will send on</div>
                                <div className="text-lg font-bold text-zinc-900">{uploadSuccess.firstSendDate}</div>
                            </div>
                        </div>

                        <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                            You have 24 hours to review and edit email templates before they're sent.
                            You can preview, edit, or pause reminders anytime from the dashboard.
                        </p>

                        <div className="flex gap-3 justify-center">
                            <Button variant="secondary" onClick={() => setUploadSuccess(null)}>
                                Upload More
                            </Button>
                            <Button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2">
                                Go to Dashboard <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <header className="bg-white border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-zinc-600 hover:text-zinc-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
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
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="flex justify-between items-end mb-1">
                    <h1 className="text-3xl font-bold">Upload Invoices</h1>
                    <div className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full border border-zinc-200">
                        Usage: <span className="text-zinc-900">{user?.lifetime_invoices || 0}</span> / 5 free
                    </div>
                </div>
                <p className="text-zinc-600 mb-6">
                    Upload your CSV, Excel, or PDF files. Our AI will extract invoice data automatically.
                </p>

                {/* Limit Reached State */}
                {(!user?.subscription_status || user?.subscription_status === 'free') && (user?.lifetime_invoices || 0) >= 5 ? (
                    <Card className="border-amber-200 bg-amber-50/50 p-12 text-center py-16">
                        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Clock className="w-10 h-10 text-amber-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-zinc-900 mb-2">Usage Limit Reached</h2>
                        <p className="text-zinc-600 mb-8 max-w-md mx-auto text-lg leading-relaxed">
                            You've used your 5 free invoices. To continue sending automated reminders and tracking payments, please upgrade your plan.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Button size="lg" onClick={() => navigate('/subscription')} className="px-8 py-6 text-lg gap-2">
                                View Pricing <ArrowRight className="w-5 h-5" />
                            </Button>
                            <Button size="lg" variant="secondary" onClick={() => navigate('/dashboard')} className="px-8 py-6 text-lg">
                                Back to Dashboard
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Error Messages */}
                        {errors.length > 0 && (
                            <Card className="mb-6 border-zinc-300 bg-zinc-100">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-zinc-900 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-zinc-900 mb-2">Upload Error</h3>
                                        <ul className="text-sm text-zinc-700 space-y-1">
                                            {errors.map((error, idx) => (
                                                <li key={idx}>• {error}</li>
                                            ))}
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
                        <Card
                            className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-300 hover:border-zinc-400'
                                } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => !isProcessing && document.getElementById('file-input').click()}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && !isProcessing && document.getElementById('file-input').click()}
                            aria-label="Upload files"
                        >
                            {isProcessing ? (
                                <div className="py-6">
                                    <LoadingSpinner size="lg" className="mb-3" />
                                    <h3 className="text-xl font-bold mb-1">Processing your files...</h3>
                                    <p className="text-zinc-600">Our AI is extracting invoice data</p>
                                </div>
                            ) : (
                                <>
                                    <div className="relative w-12 h-12 mx-auto mb-4">
                                        <UploadIcon className="w-12 h-12 text-zinc-400" />
                                        <div className="absolute -bottom-1 -right-1 bg-zinc-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                            AI
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Upload Invoice Files</h3>
                                    <p className="text-zinc-600 mb-4 text-base">
                                        Drag & drop <span className="font-bold text-zinc-900">PDF, Excel, or CSV</span> files
                                    </p>
                                    <div className="flex justify-center gap-2 text-xs text-zinc-500 mb-4">
                                        <span className="bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">.pdf</span>
                                        <span className="bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">.xlsx</span>
                                        <span className="bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200">.csv</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-400">
                                        AI extracts invoice data automatically. Reminders will be scheduled with a 24-hour review period.
                                    </p>
                                </>
                            )}
                            <input
                                id="file-input"
                                type="file"
                                accept=".csv,.pdf,.xlsx,.xls"
                                multiple
                                onChange={handleFileInput}
                                className="hidden"
                                aria-label="File input"
                                disabled={isProcessing}
                            />
                        </Card>
                    </>
                )}

                {/* Info Box */}
                <div className="mt-6 bg-zinc-100 border border-zinc-200 rounded-lg p-5">
                    <h4 className="font-semibold mb-3">How it works</h4>
                    <ol className="space-y-2 text-sm text-zinc-600">
                        <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-zinc-900 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                            <span>Upload your invoices (CSV, Excel, or PDF)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-zinc-900 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                            <span>AI generates personalized reminder emails (4 stages)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-zinc-900 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                            <span>You have 24 hours to review and edit before sending</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-zinc-900 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                            <span>Reminders send automatically - track everything in dashboard</span>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
