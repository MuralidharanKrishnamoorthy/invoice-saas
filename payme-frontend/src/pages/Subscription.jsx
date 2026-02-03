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
            features: [
                { text: 'Unlimited invoices' },
                { text: 'Automated reminders (4 stages)' },
                { text: 'Payment tracking' },
                { text: 'Manual mark as paid' }
            ]
        },
        {
            id: 'pro',
            name: 'Pro',
            price: '$29',
            features: [
                { text: 'Everything in Basic' },
                { text: 'Email preview & edit' },
                { text: 'Pause/resume reminders' },
                { text: 'Payment proof upload' },
                { text: 'Late fee calculator' }
            ],
            badge: 'Most Popular'
        },
        {
            id: 'premium',
            name: 'Premium',
            price: '$49',
            features: [
                { text: 'Everything in Pro' },
                { text: 'Legal escalation templates', comingSoon: true },
                { text: 'Pre-legal warnings', comingSoon: true },
                { text: 'Court document generator', comingSoon: true },
                { text: 'Priority support', comingSoon: true }
            ]
        }
    ];

    const handleSubscribe = async (planId, tier) => {
        try {
            toast.loading('Initializing payment...', { id: 'subscribe' });
            const { data: countryData } = await api.subscriptions.detectCountry();
            const { data: subData } = await api.subscriptions.create({
                planTier: tier,
                country: countryData.country
            });

            const options = {
                key: subData.razorpayKeyId,
                subscription_id: subData.subscriptionId,
                name: 'PayMe.ai',
                description: `${tier.toUpperCase()} Plan Subscription`,
                handler: function (response) {
                    toast.success('Payment successful! Your account is being updated.', { id: 'subscribe' });
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 2000);
                },
                prefill: {
                    name: user?.name,
                    email: user?.email
                },
                theme: {
                    color: '#18181b'
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error('Payment failed. Please try again.', { id: 'subscribe' });
            });
            rzp.open();
        } catch (err) {
            toast.error(err.message || 'Failed to start subscription', { id: 'subscribe' });
        }
    };

    return (
        <div className="min-h-screen bg-zinc-50 font-inter">
            <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => user ? navigate('/dashboard') : navigate('/')}
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
            </header>

            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="text-center mb-10">
                    {/* <h1 className="text-3xl font-bold mb-1">Simple Pricing</h1> */}
                    <p className="text-base text-zinc-600">Choose the plan that's right for your business.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`rounded-2xl p-6 bg-white border-2 transition-all flex flex-col relative overflow-hidden ${plan.badge
                                ? 'border-zinc-900 shadow-xl scale-102 z-1'
                                : 'border-zinc-200 shadow-lg'
                                }`}
                        >
                            {/* Slanted Ribbon for Popular/Soon status */}
                            {(plan.badge || plan.id === 'premium') && (
                                <div className="absolute top-0 right-0 overflow-hidden w-28 h-28 pointer-events-none">
                                    <div className={`absolute top-0 right-0 text-white text-[9px] font-bold uppercase py-1.5 w-[150%] text-center transform translate-x-[30%] translate-y-[30%] rotate-45 shadow-md ${plan.id === 'premium' ? 'bg-zinc-500' : 'bg-zinc-900'
                                        }`}>
                                        {plan.id === 'premium' ? 'Soon' : plan.badge.replace('Most ', '')}
                                    </div>
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">{plan.price}</span>
                                    <span className="text-zinc-500 text-sm">/mo</span>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start justify-between text-xs group">
                                        <div className="flex items-start">
                                            <Check className="w-4 h-4 text-zinc-900 mr-2 shrink-0 mt-0.5" />
                                            <span className="text-zinc-600 font-medium leading-tight">{feature.text}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            {plan.id !== 'premium' && (
                                <Button
                                    onClick={() => handleSubscribe(plan.id, plan.id)}
                                    variant={plan.badge ? 'primary' : 'outline'}
                                    className="w-full py-2.5 text-sm"
                                >
                                    {user?.plan_type === plan.id ? 'Current Plan' : 'Get Started'}
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
