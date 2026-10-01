import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { homePath } from '@farmaplus/domain';
import { api } from '../api/client';
import { AuthUser, getToken, getUser, setSession } from '../api/session';
import { Field } from '../components/Field';
import { InstallAppButton } from '../components/InstallAppButton';
import { SubmitButton } from '../components/SubmitButton';
import { ThemeToggle } from '../components/ThemeToggle';
import { inputClass } from '../components/formClasses';
import { LABELS } from '../constants/labels';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (getToken()) return <Navigate to={homePath(getUser())} replace />;

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
      navigate(homePath(result.user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-canvas relative grid min-h-screen place-items-center p-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <InstallAppButton />
        <ThemeToggle />
      </div>
      <form className="w-full max-w-md rounded-[28px] bg-white/90 p-6 shadow-sm ring-1 ring-white/80 backdrop-blur sm:p-8" onSubmit={onSubmit}>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{LABELS.appName}</h1>
        <p className="mt-1 text-sm text-slate-500">Farmacia Matute Molina — acceso local</p>
        <Field label={LABELS.user}>
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={LABELS.userPlaceholder}
            autoComplete="username"
            autoFocus
          />
        </Field>
        <Field label={LABELS.password}>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={LABELS.passwordPlaceholder}
            autoComplete="current-password"
          />
        </Field>
        {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
        <SubmitButton loading={loading} className="mt-5 w-full">{LABELS.enter}</SubmitButton>
      </form>
    </div>
  );
}
