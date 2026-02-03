import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/UI';
import { useApp } from '../context/AppContext';

export default function Subscription() {
    const navigate = useNavigate();
    const { user } = useApp();

    const plans = [
        {
            id: 'basic',
            name: 'Basic',
            price: '$19',
            features: ['Unlimited invoices', 'AI reminders (4 stages)', 'Payment tracking', 'Manual mark as paid']
        },
        {
            id: 'pro',
            name: 'Pro',
            price: '$29',
            features: ['Everything in Basic', 'Email preview & edit', 'Pause/resume reminders', 'Payment proof upload', 'Auto-payment detection', 'Late fee calculator'],
            badge: 'Most Popular'
        },
        {
            id: 'premium',
            name: 'Premium',
            price: '$49',
            features: ['Everything in Pro', 'Legal escalation templates', 'Pre-legal warnings', 'Court document generator', 'Priority support']
        }
    ];

    return (
        <div className="min-h-screen bg-zinc-50">
            <header className="bg-white border-b border-zinc-200 px-8 py-6 flex items-center justify-between">
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
                    >
                        PayMe.ai
                    </div>
                </div>
                {user ? (
                    <Button variant="secondary" onClick={() => navigate('/dashboard')}>Dashboard</Button>
                ) : (
                    <Button onClick={() => navigate('/login')}>Login</Button>
                )}
            </header>

            <div className="max-w-6xl mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold mb-4">Simple Pricing</h1>
                    <p className="text-xl text-zinc-600">Choose the plan that's right for your business.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`rounded-2xl p-8 bg-white border-2 transition-all flex flex-col ${plan.badge
                                ? 'border-zinc-900 shadow-xl relative scale-105 z-1'
                                : 'border-zinc-200 shadow-lg'
                                }`}
                        >
                            {plan.badge && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-zinc-900 text-white px-4 py-1 rounded-full text-xs font-bold uppercase">
                                    {plan.badge}
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold">{plan.price}</span>
                                    <span className="text-zinc-500">/mo</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start text-sm">
                                        <Check className="w-5 h-5 text-zinc-900 mr-3 shrink-0" />
                                        <span className="text-zinc-600">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => toast.success('Subscription flow coming soon!')}
                                variant={plan.badge ? 'primary' : 'outline'}
                                className="w-full py-6 text-lg"
                            >
                                Get Started
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
