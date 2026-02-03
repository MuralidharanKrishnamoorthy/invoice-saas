import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Rocket, DollarSign, Zap, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../lib/validation';
import { SkeletonCard } from './Loading';

export default function StatsWidget() {
    const { stats, statsLoading: loading, fetchStats } = useApp();

    useEffect(() => {
        if (!stats) {
            fetchStats();
        }
    }, [stats, fetchStats]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Card 1: Recovery Rate (White) */}
            <div className="relative overflow-hidden rounded-xl p-6 bg-white border border-zinc-200 text-zinc-900 shadow-sm transition-all hover:shadow-md">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-zinc-500 font-medium text-sm uppercase tracking-wide">
                        <Rocket className="w-4 h-4 text-zinc-900" />
                        <span>Recovery Rate</span>
                    </div>
                    <div className="text-4xl font-bold mb-2 tracking-tight">{stats.recoveryRate}%</div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        vs Industry 45%
                    </div>
                </div>
            </div>

            {/* Card 2: Expected Revenue (Black) */}
            <div className="relative overflow-hidden rounded-xl p-6 bg-zinc-900 text-white shadow-lg ring-1 ring-zinc-900/5 transition-all hover:ring-zinc-900/10 hover:shadow-xl">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-zinc-400 font-medium text-sm uppercase tracking-wide">
                        <DollarSign className="w-4 h-4 text-white" />
                        <span>Expected Revenue</span>
                    </div>
                    <div className="text-4xl font-bold mb-2 tracking-tight">
                        {formatCurrency(stats.expectedRecovery)}
                    </div>
                    <div className="text-sm text-zinc-400">
                        Forecast for next 14 days
                    </div>
                </div>
                {/* Subtle highlight */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            </div>

            {/* Card 3: Days Saved (White) */}
            <div className="relative overflow-hidden rounded-xl p-6 bg-white border border-zinc-200 text-zinc-900 shadow-sm transition-all hover:shadow-md">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 text-zinc-500 font-medium text-sm uppercase tracking-wide">
                        <Zap className="w-4 h-4 text-zinc-900" />
                        <span>Days Saved</span>
                    </div>
                    <div className="text-4xl font-bold mb-2 tracking-tight">
                        {stats.daysSaved} days
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <span className="w-2 h-2 rounded-full bg-zinc-900"></span>
                        faster vs 45-day avg
                    </div>
                </div>
            </div>
        </div>
    );
}
