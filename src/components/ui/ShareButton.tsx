'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Twitter, MessageCircle } from 'lucide-react';

interface ShareButtonProps {
    text: string;
    title?: string;
    url?: string;
}

export function ShareButton({ text, title = 'Bíblia', url }: ShareButtonProps) {
    const [copied, setCopied] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title,
                    text,
                    url: shareUrl,
                });
            } catch (err) {
                // User cancelled or share failed
                console.log('Share cancelled');
            }
        } else {
            setShowOptions(!showOptions);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(`${text}\n\n${shareUrl}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleWhatsApp = () => {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleTwitter = () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
    };

    return (
        <div className="relative">
            <button
                onClick={handleNativeShare}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                aria-label="Compartilhar"
            >
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Compartilhar</span>
            </button>

            {showOptions && (
                <div className="absolute bottom-full mb-2 left-0 bg-slate-800 border border-white/10 rounded-xl p-2 shadow-xl z-50 min-w-[160px]">
                    <button
                        onClick={handleCopy}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        <span className="text-sm">{copied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                    <button
                        onClick={handleWhatsApp}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <MessageCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm">WhatsApp</span>
                    </button>
                    <button
                        onClick={handleTwitter}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <Twitter className="w-4 h-4 text-blue-400" />
                        <span className="text-sm">Twitter</span>
                    </button>
                </div>
            )}
        </div>
    );
}
