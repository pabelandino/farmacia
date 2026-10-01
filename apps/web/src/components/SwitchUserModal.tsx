import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { homePath } from '@farmaplus/domain';
import { api } from '../api/client';
import { AuthUser, setSession } from '../api/session';
import { LABELS } from '../constants/labels';
import { Field } from './Field';
import { inputClass } from './formClasses';
import { SubmitButton } from './SubmitButton';

export function SwitchUserModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const titleId = useId();
  const cardRef = useRef<HTMLFormElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsername('');
    setPassword('');
    setError('');
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cardRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) onClose();
    }

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api<{ token: string; user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setSession(result.token, result.user);
      onClose();
      navigate(homePath(result.user), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar de usuario');
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div
      className="confirm-modal-backdrop no-print fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <form
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="confirm-modal-card w-full max-w-md rounded-[28px] bg-white/90 p-5 shadow-sm ring-1 ring-white/80 outline-none backdrop-blur sm:p-6"
        onSubmit={onSubmit}
      >
        <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900">
          {LABELS.switchUser}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{LABELS.switchUserHint}</p>
        <Field label={LABELS.user}>
          <input
            className={inputClass}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoFocus
            autoComplete="username"
          />
        </Field>
        <Field label={LABELS.password}>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </Field>
        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <SubmitButton type="button" variant="ghost" disabled={loading} onClick={onClose}>
            {LABELS.cancel}
          </SubmitButton>
          <SubmitButton type="submit" loading={loading}>
            {LABELS.enter}
          </SubmitButton>
        </div>
      </form>
    </div>,
    document.body,
  );
}
