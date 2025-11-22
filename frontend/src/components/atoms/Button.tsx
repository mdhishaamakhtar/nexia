export default function Button({
    children,
    onClick,
    isLoading = false,
    type = "button",
    variant = "primary",
    className = "",
}: {
    children: React.ReactNode;
    onClick?: () => void;
    isLoading?: boolean;
    type?: "button" | "submit" | "reset";
    variant?: "primary" | "secondary" | "destructive";
    className?: string;
}) {
    const baseStyles = "px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
        primary: "bg-[var(--color-accent-cta)] hover:bg-[#8F3E67] text-[var(--color-text-primary)] active:scale-[0.97]",
        secondary: "bg-[var(--color-surface)] hover:bg-[#4A2340] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] active:scale-[0.97]",
        destructive: "bg-red-600 hover:bg-red-700 text-white active:scale-[0.97]",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isLoading}
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        >
            {isLoading ? (
                <span className="shimmer-bg inline-block w-16 h-4 rounded animate-[shimmer_2s_linear_infinite]" />
            ) : (
                children
            )}
        </button>
    );
}
