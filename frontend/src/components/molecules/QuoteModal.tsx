"use client";

import { useState } from "react";
import { X } from "lucide-react";

export default function QuoteModal({
    quote,
    onClose
}: {
    quote: string;
    onClose: () => void;
}) {
    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-[var(--color-surface)] rounded-2xl p-8 max-w-2xl w-full border border-[var(--color-border-subtle)] max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-2xl font-semibold">Words they said</h3>
                    <button
                        onClick={onClose}
                        className="hover:bg-[var(--color-bg)] rounded-lg p-2 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <blockquote className="text-lg leading-relaxed text-[var(--color-text-primary)] font-serif italic">
                    &ldquo;{quote}&rdquo;
                </blockquote>
            </div>
        </div>
    );
}
