import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function Pricing() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleUpgrade = async (variantId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/register');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post('/payments/create-checkout-link', {
                variantId: variantId
            });
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Upgrade failed:', error);
            alert('Failed to start checkout. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="pricing" className="py-20 bg-zinc-50 border-t border-zinc-200">
            <div className="max-w-6xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-20">
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                        Simple Pricing. Massive Cashflow.
                    </h2>
                    <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
                        Join 127 agencies getting paid 21 days faster
                    </p>
                </div>

                {/* Plans */}
                <div className="grid md:grid-cols-3 gap-8">
                    {/* Starter */}
                    <div className="bg-white rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all border border-zinc-100 relative overflow-hidden">
                        <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-8 mx-auto">
                            <span className="text-2xl font-bold text-blue-600">S</span>
                        </div>
                        <h3 className="text-2xl font-bold text-zinc-900 mb-2 text-center">Starter</h3>
                        <div className="text-5xl font-bold text-blue-600 mb-8 text-center flex justify-center items-baseline">
                            ₹299<span className="text-xl text-zinc-500 ml-1">/mo</span>
                        </div>

                        <ul className="space-y-4 mb-10">
                            {[
                                '50 invoices/mo',
                                '150 emails',
                                '87% success rate',
                                'CSV Upload'
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center text-zinc-600">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-3 shrink-0">
                                        <Check className="w-4 h-4 text-green-600" />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => navigate('/register')}
                            className="block w-full bg-blue-600 text-white py-4 px-8 rounded-2xl text-center font-semibold hover:bg-blue-700 transition-all"
                        >
                            Start Free Trial
                        </button>
                    </div>

                    {/* Pro (Recommended) */}
                    <div className="bg-zinc-900 text-white rounded-3xl p-10 shadow-2xl relative border-2 border-purple-500 transform scale-105 z-10">
                        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-purple-500 px-6 py-2 rounded-full text-white font-bold text-sm uppercase tracking-wide">
                            Most Popular
                        </div>
                        <div className="flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-8 mx-auto">
                            <span className="text-2xl font-bold">P</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-center">Pro</h3>
                        <div className="text-5xl font-bold mb-8 text-center flex justify-center items-baseline">
                            ₹699<span className="text-xl opacity-60 ml-1">/mo</span>
                        </div>

                        <ul className="space-y-4 mb-10">
                            {[
                                '200 invoices/mo',
                                '600 emails',
                                'Custom templates',
                                '3 team seats',
                                'Priority support',
                                'PDF Upload'
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center">
                                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center mr-3 shrink-0">
                                        <Check className="w-4 h-4 text-purple-400" />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => handleUpgrade(import.meta.env.VITE_PRO_PLAN_VARIANT_ID)}
                            disabled={loading || !import.meta.env.VITE_PRO_PLAN_VARIANT_ID}
                            className="block w-full bg-white text-zinc-900 py-4 px-8 rounded-2xl text-center font-bold hover:bg-zinc-100 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Get Pro Plan'}
                        </button>
                    </div>

                    {/* Enterprise */}
                    <div className="bg-white rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all border border-zinc-100">
                        <div className="flex items-center justify-center w-16 h-16 bg-zinc-100 rounded-2xl mb-8 mx-auto">
                            <span className="text-2xl font-bold text-zinc-700">E</span>
                        </div>
                        <h3 className="text-2xl font-bold text-zinc-900 mb-2 text-center">Enterprise</h3>
                        <div className="text-5xl font-bold text-zinc-900 mb-8 text-center flex justify-center items-baseline">
                            ₹1499<span className="text-xl text-zinc-500 ml-1">/mo</span>
                        </div>

                        <ul className="space-y-4 mb-10">
                            {[
                                'Unlimited invoices',
                                'Unlimited emails',
                                'API access',
                                '10 team seats',
                                'Custom branding',
                                'Dedicated manager'
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center text-zinc-600">
                                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-3 shrink-0">
                                        <Check className="w-4 h-4 text-green-600" />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => window.location.href = 'mailto:sales@payme.ai'}
                            className="block w-full border-2 border-zinc-900 text-zinc-900 py-4 px-8 rounded-2xl text-center font-semibold hover:bg-zinc-900 hover:text-white transition-all"
                        >
                            Contact Sales
                        </button>
                    </div>
                </div>

                {/* Annual Discount Banner */}
                <div className="mt-20 p-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl text-center shadow-lg">
                    <p className="text-2xl font-semibold mb-2">Save 20% with Annual Billing</p>
                    <p className="text-lg opacity-90">Pay ₹559/mo for Pro (billed annually)</p>
                </div>
            </div>
        </section>
    );
}
