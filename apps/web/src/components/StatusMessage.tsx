export function StatusMessage({ error, message, className = '' }: { error?: string; message?: string; className?: string }) {
  return (
    <>
      {error ? <p className={`mt-3 font-semibold text-red-600 ${className}`}>{error}</p> : null}
      {message ? <p className={`mt-3 font-semibold text-emerald-700 ${className}`}>{message}</p> : null}
    </>
  );
}
