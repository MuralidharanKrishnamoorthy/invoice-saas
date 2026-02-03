import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Upload, FileText, Loader2, Calendar, Mail } from 'lucide-react';
import { Button, Card } from './UI';

export default function PaymentProofModal({ invoice, isPro, onClose, onConfirm }) {
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [sendThankYou, setSendThankYou] = useState(true);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            if (selected.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }
            if (!['image/jpeg', 'image/png', 'application/pdf'].includes(selected.type)) {
                alert('Only Images (JPG, PNG) and PDF files are allowed');
                return;
            }
            setFile(selected);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onConfirm(file, {
                paymentDate,
                sendThankYou
            });
            onClose();
        } catch (error) {
            console.error('Error in modal submit:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
            onClick={onClose}
        >
            <Card
                className="max-w-md w-full"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Mark as Paid</h2>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-5">
                    <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3 space-y-1">
                        <p className="text-zinc-600 text-sm flex justify-between">
                            <span>Mark Invoice <strong>#{invoice.invoice}</strong> as paid</span>
                        </p>
                        <div className="pt-2 border-t border-zinc-200 mt-2 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Original Amount:</span>
                                <span className="font-medium">{invoice.currency} {parseFloat(invoice.amount).toLocaleString()}</span>
                            </div>

                            {invoice.lateFee > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-amber-600 font-medium">Late Fee:</span>
                                    <span className="text-amber-600 font-bold">+{invoice.currency}{invoice.lateFee}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-base pt-1 border-t border-zinc-200 font-bold text-zinc-900">
                                <span>Total to Collect:</span>
                                <span>{invoice.currency} {(parseFloat(invoice.amount) + (invoice.lateFee || 0)).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-2">
                            <Calendar className="w-4 h-4" />
                            Payment received on
                        </label>
                        <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">
                            Payment Proof
                        </label>
                        {isPro ? (
                            <div className="border-2 border-dashed border-zinc-200 rounded-lg p-4 text-center hover:bg-zinc-50 transition-colors relative cursor-pointer">
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept="image/png, image/jpeg, application/pdf"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {file ? (
                                    <div className="flex flex-col items-center">
                                        <FileText className="w-6 h-6 text-blue-500 mb-1" />
                                        <span className="text-sm font-medium text-zinc-900">{file.name}</span>
                                        <span className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            className="mt-1 text-xs text-red-500 hover:underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Upload className="w-6 h-6 text-zinc-400 mb-1" />
                                        <span className="text-sm text-zinc-600">PNG, JPG or PDF up to 5MB</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 text-center">
                                <p className="text-xs text-zinc-500 mb-2">Proof upload is a Pro feature</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-[10px] h-7"
                                    onClick={() => navigate('/subscription')}
                                >
                                    Upgrade to Upload
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                        <input
                            type="checkbox"
                            id="sendThankYou"
                            checked={sendThankYou}
                            onChange={(e) => setSendThankYou(e.target.checked)}
                            className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                        />
                        <label htmlFor="sendThankYou" className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                            <Mail className="w-4 h-4" />
                            Send thank-you email to client
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="secondary" size="sm" className="px-3 py-1 text-xs whitespace-nowrap" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button size="sm" className="px-3 py-1 text-xs whitespace-nowrap" onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Payment'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
