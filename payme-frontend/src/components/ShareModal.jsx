import { useState, useRef } from 'react';
import { Share2, Download, Copy, X, Twitter, Linkedin } from 'lucide-react';
import { Button } from './UI';
import ProofCard from './ProofCard';
import html2canvas from 'html2canvas'; // We need to install this!
import toast from 'react-hot-toast';

// Simple WhatsApp icon since Lucide might not have it or it varies
const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
);

export default function ShareModal({ invoice, proofUrl, onClose }) {
    const [generating, setGenerating] = useState(false);
    const cardRef = useRef(null);
    const [cardElement, setCardElement] = useState(null);

    const generateImage = async () => {
        if (!cardElement) return null;
        setGenerating(true);
        try {
            const canvas = await html2canvas(cardElement, {
                scale: 2, // Retina quality
                backgroundColor: null,
                useCORS: true // Important for external images
            });
            return canvas.toDataURL('image/png');
        } catch (err) {
            console.error('Failed to generate image:', err);
            toast.error('Failed to generate image');
            return null;
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async () => {
        const dataUrl = await generateImage();
        if (!dataUrl) return;

        const link = document.createElement('a');
        link.download = `PayMe-Proof-${invoice.invoice}.png`;
        link.href = dataUrl;
        link.click();
        toast.success('Image downloaded!');
    };

    const handleShare = async (platform) => {
        // Since we can't easily programmatically upload the image to Twitter/WA without their APIs,
        // we will generate sharing text and link to the app (or generic landing page for now).
        // Ideally, we'd upload the generated image to Supabase and share that URL.

        const text = `🎉 Just got paid ${invoice.currency} ${invoice.amount} for Invoice #${invoice.invoice}! Recovered 12 days faster with @PayMe_AI. #FreelanceLife #GetPaid`;
        const url = 'https://payme.ai'; // Placeholder

        let shareUrl = '';
        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`; // LinkedIn only takes URL
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText('https://payme.ai');
        toast.success('Link copied to clipboard!');
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">

                {/* Left: Preview Area */}
                <div className="flex-1 bg-zinc-100 p-8 flex items-center justify-center overflow-hidden relative">
                    {/* Render ProofCard off-screen or scaled down if needed, but here we show it */}
                    <div className="scale-75 md:scale-90 origin-center transition-transform hover:scale-100">
                        <ProofCard
                            invoice={invoice}
                            proofUrl={proofUrl}
                            onReady={setCardElement}
                        />
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="w-full md:w-80 p-6 flex flex-col gap-6 border-l border-zinc-200">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">Share the win!</h2>
                        <p className="text-zinc-600 text-sm">
                            Celebrate getting paid and help others find PayMe.ai.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button onClick={() => handleShare('twitter')} className="w-full justify-start gap-3 bg-[#1DA1F2] hover:bg-[#1a91da] text-white border-none">
                            <Twitter className="w-4 h-4" /> Share on Twitter
                        </Button>
                        <Button onClick={() => handleShare('whatsapp')} className="w-full justify-start gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white border-none">
                            <WhatsAppIcon /> Share on WhatsApp
                        </Button>
                        <Button onClick={() => handleShare('linkedin')} className="w-full justify-start gap-3 bg-[#0A66C2] hover:bg-[#0958a8] text-white border-none">
                            <Linkedin className="w-4 h-4" /> Share on LinkedIn
                        </Button>
                    </div>

                    <div className="pt-6 border-t border-zinc-200 space-y-3 mt-auto">
                        <Button variant="outline" onClick={handleDownload} className="w-full justify-start gap-3" disabled={generating}>
                            <Download className="w-4 h-4" />
                            {generating ? 'Generating...' : 'Download Image'}
                        </Button>
                        <Button variant="ghost" onClick={handleCopyLink} className="w-full justify-start gap-3">
                            <Copy className="w-4 h-4" /> Copy Link
                        </Button>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 md:hidden bg-white/50 p-2 rounded-full"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="hidden md:block absolute top-4 right-4">
                        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
