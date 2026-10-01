export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span className={`inline-flex animate-spin ${className}`}>
      <svg className="h-full w-full" viewBox="0 0 24 24" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </span>
  );
}
