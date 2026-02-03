import { useState } from 'react';
import { X, Upload, FileText, Check } from 'lucide-react';
import { Button, Card } from './UI';

export default function PaymentProofModal({ invoice, onClose, onConfirm }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            // Basic validation
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
            await onConfirm(file);
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

                <div className="mb-6">
                    <p className="text-zinc-600 mb-4">
                        Are you sure you want to mark Invoice <strong>#{invoice.invoice}</strong> as paid?
                    </p>

                    <div className="border-2 border-dashed border-zinc-200 rounded-lg p-6 text-center hover:bg-zinc-50 transition-colors relative cursor-pointer">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept="image/png, image/jpeg, application/pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />

                        {file ? (
                            <div className="flex flex-col items-center">
                                <FileText className="w-8 h-8 text-blue-500 mb-2" />
                                <span className="text-sm font-medium text-zinc-900">{file.name}</span>
                                <span className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                    }}
                                    className="mt-2 text-xs text-red-500 hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                                <span className="text-sm font-medium text-zinc-900">Upload Pay Proof (Optional)</span>
                                <span className="text-xs text-zinc-500 mt-1">PNG, JPG or PDF up to 5MB</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Payment'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
