import { useRef, useEffect } from 'react';
import { formatCurrency } from '../lib/validation';
import logo from '/vite.svg'; // Assuming standard Vite logo or we can use text if image fails

export default function ProofCard({ invoice, userName, proofUrl, onReady }) {
    const cardRef = useRef(null);

    // Notify parent when mounted, in case we need to trigger capture
    useEffect(() => {
        if (cardRef.current && onReady) {
            onReady(cardRef.current);
        }
    }, [onReady]);

    const bgPattern = {
        backgroundImage: 'radial-gradient(circle at 10% 20%, rgb(242, 246, 252) 0%, rgb(255, 255, 255) 90.1%)'
    };

    return (
        <div ref={cardRef} className="w-[600px] h-[315px] p-8 flex flex-col justify-between relative shadow-2xl overflow-hidden" style={bgPattern}>
            {/* Header */}
            <div className="flex justify-between items-start z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-indigo-600 tracking-tight">PayMe.ai</span>
                    </div>
                    <div className="text-sm text-zinc-500 font-medium">#GetPaidFaster</div>
                </div>
                <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Paid in Full
                </div>
            </div>

            {/* Main Content */}
            <div className="z-10 mt-4">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-2">
                    {formatCurrency(invoice.amount, invoice.currency)} RECOVERED!
                </h1>
                <p className="text-lg text-slate-600 font-medium">
                    <span className="font-bold text-slate-800">{invoice.client}</span> just paid Invoice #{invoice.invoice}
                </p>
            </div>

            {/* Stats Row */}
            <div className="flex gap-8 mt-6 z-10">
                <div>
                    <div className="text-3xl font-bold text-emerald-600">87%</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase">Success Rate</div>
                </div>
                <div>
                    <div className="text-3xl font-bold text-indigo-600">12 Days</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase">Saved vs Avg</div>
                </div>
            </div>

            {/* Proof Thumbnail (Circular) */}
            {proofUrl && (
                <div className="absolute right-8 bottom-8 w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden z-10 bg-zinc-100">
                    <img
                        src={proofUrl}
                        alt="Proof"
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                    />
                </div>
            )}

            {/* Footer / Watermark */}
            <div className="text-xs text-zinc-400 font-medium mt-auto z-10 select-none">
                Built for Agencies & Freelancers
            </div>

            {/* Decorative Blobs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute bottom-[-20px] left-20 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
        </div>
    );
}
