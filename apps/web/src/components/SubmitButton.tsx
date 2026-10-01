import { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

type SubmitProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: 'primary' | 'blue' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
};

const variants = {
  primary: 'border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60',
  blue: 'border-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-400 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900/60',
  danger: 'border-red-400 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-400 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-900/60',
  ghost: 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
};

const sizes = {
  md: 'rounded-full px-4 py-1.5 text-sm',
  sm: 'rounded-full px-3 py-1 text-xs leading-4',
};

export function SubmitButton({ loading, children, className = '', variant = 'primary', size = 'md', disabled, type = 'submit', ...props }: SubmitProps) {
  return (
    <button
      type={type}
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1 border font-medium disabled:cursor-not-allowed disabled:opacity-60 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading ? <Spinner /> : null}
      {loading ? 'Procesando...' : children}
    </button>
  );
}
