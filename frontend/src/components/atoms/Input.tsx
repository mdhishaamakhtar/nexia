export default function Input({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    error,
    className = "",
}: {
    label?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    error?: string;
    className?: string;
}) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {label && (
                <label className="text-sm font-medium text-[var(--color-text-primary)]">
                    {label}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`
          bg-[var(--color-surface)] 
          text-[var(--color-text-primary)] 
          px-4 py-3 
          rounded-xl 
          border 
          ${error ? 'border-red-500' : 'border-[var(--color-border-subtle)]'}
          focus:border-[var(--color-accent)] 
          focus:outline-none 
          focus:ring-2 
          focus:ring-[var(--color-accent)] 
          focus:ring-opacity-20
          transition-all 
          duration-200
          placeholder:text-[var(--color-text-secondary)]
        `}
            />
            {error && (
                <span className="text-sm text-red-500">{error}</span>
            )}
        </div>
    );
}
