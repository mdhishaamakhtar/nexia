export function NexiaIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hand-drawn circle/blob */}
      <path
        d="M35 20C35 28.2843 28.2843 35 20 35C11.7157 35 5 28.2843 5 20C5 11.7157 11.7157 5 20 5C28.2843 5 35 11.7157 35 20Z"
        fill="currentColor"
        stroke="var(--border-mid)"
        strokeWidth="1.5"
      />
      {/* Doodle Face */}
      <path
        d="M13 18C13 18 14 16 16 16C18 16 19 18 19 18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M21 18C21 18 22 16 24 16C26 16 27 18 27 18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M15 25C15 25 17 28 20 28C23 28 25 25 25 25"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StickerSparkle({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
        fill="currentColor"
        stroke="var(--border-mid)"
        strokeWidth="1"
      />
      <circle cx="18" cy="18" r="2" fill="var(--peach)" />
      <circle cx="5" cy="5" r="1.5" fill="var(--lavender)" />
    </svg>
  );
}
