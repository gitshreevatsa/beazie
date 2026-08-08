/** Veil brand mark — sealed mystery box. */
export function VeilLogo({
  className = "",
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="64" height="64" rx="14" fill="#FF5A5F" stroke="#121212" strokeWidth="4" />
      <rect x="14" y="28" width="36" height="26" fill="#FFE566" stroke="#121212" strokeWidth="3" />
      <path
        d="M12 28h40l-4-10H16l-4 10z"
        fill="#B8E8D8"
        stroke="#121212"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="29" y="18" width="6" height="36" fill="#121212" />
      {/* ? mark as paths so it scales cleanly */}
      <path
        d="M28.2 40.2c0-3.4 2.2-5.2 4.6-5.2 2.2 0 3.8 1.4 3.8 3.4 0 1.6-0.8 2.5-2.4 3.5l-0.8.5v2.4h-2.6v-3.6l1.2-.7c1.1-.7 1.6-1.2 1.6-2.1 0-.8-.6-1.4-1.5-1.4-.9 0-1.6.6-1.6 1.7h-2.3z"
        fill="#121212"
      />
      <circle cx="32.2" cy="48.6" r="1.4" fill="#121212" />
    </svg>
  );
}

export default VeilLogo;
