import React from "react";

interface ZodiacIconProps {
  sign: string;
  size?: number;
  className?: string;
}

export default function ZodiacIcon({ sign, size = 16, className }: ZodiacIconProps) {
  const normalizedSign = sign.toLowerCase();

  // Common hand-drawn doodle style for all icons
  const paths: Record<string, React.ReactNode> = {
    aries: (
      <path
        d="M4 12C4 8 6 6 8 6C10 6 12 8 12 10V18M20 12C20 8 18 6 16 6C14 6 12 8 12 10V18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    ),
    taurus: (
      <g>
        <circle cx="12" cy="14" r="5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M6 6C8 10 16 10 18 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    ),
    gemini: (
      <path
        d="M7 6H17M7 18H17M9 6V18M15 6V18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    ),
    cancer: (
      <g>
        <circle cx="8" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M11 9C16 9 18 11 18 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="15" r="3" stroke="currentColor" strokeWidth="2" />
        <path
          d="M13 15C8 15 6 13 6 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    ),
    leo: (
      <path
        d="M6 16C8 18 12 18 14 14C16 10 12 6 8 8C4 10 6 16 12 16C18 16 20 12 20 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    ),
    virgo: (
      <path
        d="M6 8V14C6 16 8 18 10 18C12 18 13 16 13 14V8C13 6 11 4 9 4C7 4 6 6 6 8M13 8V14C13 16 15 18 17 18C19 18 20 16 20 14M20 14V18C20 20 18 22 16 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    ),
    libra: (
      <g>
        <path d="M12 8C10 8 8 10 8 12H16C16 10 14 8 12 8Z" stroke="currentColor" strokeWidth="2" />
        <path d="M4 18H20M4 14H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
    scorpio: (
      <path
        d="M6 8V14C6 16 8 18 10 18C12 18 13 16 13 14V8C13 6 11 4 9 4C7 4 6 6 6 8M13 8V14C13 16 15 18 17 18V12M17 18L20 21M17 18L20 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    ),
    sagittarius: (
      <g>
        <path
          d="M6 18L18 6M18 6H12M18 6V12M9 9L15 15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    ),
    capricorn: (
      <path
        d="M6 8V14C6 16 8 18 10 18C12 18 13 16 13 14V8C13 10 18 10 18 14C18 18 20 20 22 20M14 18L12 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    ),
    aquarius: (
      <g>
        <path
          d="M4 10L8 6L12 10L16 6L20 10M4 16L8 12L12 16L16 12L20 16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    ),
    pisces: (
      <g>
        <path
          d="M6 6C10 8 10 16 6 18M18 6C14 8 14 16 18 18M6 12H18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    ),
  };

  const icon = paths[normalizedSign] || (
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Doodle background/sticker effect */}
      <circle cx="12" cy="12" r="10" fill="var(--fill)" opacity="0.3" />
      {icon}
    </svg>
  );
}
