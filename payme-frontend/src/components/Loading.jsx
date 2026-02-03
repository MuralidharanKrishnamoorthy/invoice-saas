import { PuffLoader } from 'react-spinners';

export function LoadingSpinner({ size = 'md', className = '' }) {
    // legacy support for size prop mapping to pixel values if needed, 
    // but PuffLoader takes absolute size.
    const sizeMap = {
        sm: 20,
        md: 40,
        lg: 60
    };

    return (
        <div className={`flex justify-center items-center ${className}`}>
            <PuffLoader color="#18181b" size={sizeMap[size] || 40} />
        </div>
    );
}

export function LoadingOverlay({ message = 'Loading...' }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl border border-white/20">
                <PuffLoader color="#18181b" size={60} />
                <p className="text-zinc-700 font-medium text-lg animate-pulse">{message}</p>
            </div>
        </div>
    );
}

export function SkeletonCard() {
    return (
        <div className="card animate-pulse">
            <div className="h-4 bg-zinc-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-zinc-200 rounded w-1/2"></div>
        </div>
    );
}

export function SkeletonTable({ rows = 5 }) {
    return (
        <div className="card p-0 overflow-hidden">
            <div className="p-6 border-b border-zinc-200 bg-zinc-50 animate-pulse">
                <div className="h-4 bg-zinc-200 rounded w-1/4"></div>
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="p-6 border-b border-zinc-200 animate-pulse">
                    <div className="flex gap-4">
                        <div className="h-4 bg-zinc-200 rounded w-1/6"></div>
                        <div className="h-4 bg-zinc-200 rounded w-1/4"></div>
                        <div className="h-4 bg-zinc-200 rounded w-1/5"></div>
                        <div className="h-4 bg-zinc-200 rounded w-1/6"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
