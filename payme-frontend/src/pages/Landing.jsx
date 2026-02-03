import { ArrowRight, CheckCircle2, TrendingUp, Users } from 'lucide-react';
import { Button } from '../components/UI';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-zinc-200">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="text-2xl font-bold">PayMe.ai</div>
                    <Button variant="secondary" onClick={() => navigate('/login')}>
                        Sign In
                    </Button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="max-w-6xl mx-auto px-6 py-24">
                <div className="max-w-3xl">
                    <h1 className="text-6xl font-bold leading-tight mb-6">
                        Upload CSV → Get Paid 21 Days Faster
                    </h1>
                    <p className="text-xl text-zinc-600 mb-8">
                        Automated invoice chasing that recovers your cash automatically.
                        No more manual follow-ups.
                    </p>
                    <Button onClick={() => navigate('/upload')} className="inline-flex items-center">
                        Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>

                {/* Early Access Badge */}
                <div className="mt-16 inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-sm">
                    <span className="w-2 h-2 bg-zinc-900 rounded-full animate-pulse"></span>
                    <span className="font-medium">Early Access - Be among the first agencies</span>
                </div>
            </section>

            {/* Features */}
            <section className="bg-zinc-50 border-y border-zinc-200 py-20">
                <div className="max-w-6xl mx-auto px-6">
                    <h2 className="text-3xl font-bold mb-12">How it works</h2>
                    <div className="grid grid-cols-3 gap-8">
                        <div>
                            <div className="w-12 h-12 bg-zinc-900 text-white rounded-lg flex items-center justify-center font-bold text-xl mb-4">
                                1
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Upload CSV</h3>
                            <p className="text-zinc-600">
                                Drag and drop your invoice export. We support QuickBooks, Xero, and custom formats.
                            </p>
                        </div>
                        <div>
                            <div className="w-12 h-12 bg-zinc-900 text-white rounded-lg flex items-center justify-center font-bold text-xl mb-4">
                                2
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Automated Email Generation</h3>
                            <p className="text-zinc-600">
                                Personalized, polite reminders for Day 1, Day 7, and Day 14. Professional tone guaranteed.
                            </p>
                        </div>
                        <div>
                            <div className="w-12 h-12 bg-zinc-900 text-white rounded-lg flex items-center justify-center font-bold text-xl mb-4">
                                3
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Get Paid</h3>
                            <p className="text-zinc-600">
                                87% of invoices paid within 21 days. Track everything in your dashboard.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Value Proposition */}
            <section className="max-w-6xl mx-auto px-6 py-20">
                <div className="grid grid-cols-3 gap-8">
                    <div className="border border-zinc-200 rounded-lg p-6">
                        <h3 className="text-xl font-semibold mb-2">Save Time</h3>
                        <p className="text-zinc-600">
                            Stop spending hours writing follow-up emails. Let us handle it automatically.
                        </p>
                    </div>
                    <div className="border border-zinc-200 rounded-lg p-6">
                        <h3 className="text-xl font-semibold mb-2">Professional Tone</h3>
                        <p className="text-zinc-600">
                            Our automated system maintains professionalism while being persistent.
                        </p>
                    </div>
                    <div className="border border-zinc-200 rounded-lg p-6">
                        <h3 className="text-xl font-semibold mb-2">Track Everything</h3>
                        <p className="text-zinc-600">
                            Dashboard shows all invoices, email status, and payment tracking in one place.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-zinc-900 text-white py-20">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <h2 className="text-4xl font-bold mb-4">Ready to get paid faster?</h2>
                    <p className="text-xl text-zinc-300 mb-8">
                        Join the early access program. Start free, no credit card required.
                    </p>
                    <Button onClick={() => navigate('/upload')} className="inline-flex items-center">
                        Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-200 py-8">
                <div className="max-w-6xl mx-auto px-6 text-center text-zinc-600">
                    © 2026 PayMe.ai. Built for agencies who deserve to get paid on time.
                </div>
            </footer>
        </div>
    );
}
