import { X } from "lucide-react";

export default function Chip({
    label,
    onDelete
}: {
    label: string;
    onDelete: () => void;
}) {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent)]/20 text-[var(--color-text-primary)] text-sm rounded-lg border border-[var(--color-accent)]/30 group animate-[fade-in_0.2s_ease-out]">
            {label}
            <button
                type="button"
                onClick={onDelete}
                className="hover:bg-[var(--color-accent)]/30 rounded p-0.5 transition-colors duration-150"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </span>
    );
}
