import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login } from '../store/auth';
import { useApp } from '../context/AppContext';
import { Logo } from '../components/Brand';

export default function Login() {
  const { session, setSession } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={(loc.state as { from?: string })?.from || '/'} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const s = await login(id, pw);
    setBusy(false);
    if (!s) {
      setErr('Incorrect username or password.');
      return;
    }
    setSession(s);
    nav((loc.state as { from?: string })?.from || '/', { replace: true });
  }

  return (
    <div className="flex min-h-full justify-center bg-gradient-to-b from-sky1 to-sky2 px-6">
      <div className="flex w-full max-w-md flex-col pt-16 pb-10 text-white">
        <h1 className="text-center text-5xl font-extrabold tracking-tight drop-shadow-sm">MO Track</h1>
        <p className="mt-1 text-center text-sm font-medium text-white/80">Use for GKB &amp; Team</p>

        <div className="mx-auto my-8 rounded-2xl bg-white/95 p-3 shadow-lg">
          <Logo className="h-12 w-12" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full rounded-full bg-white/95 px-5 py-3.5 text-sm text-gray-800 placeholder-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-white"
            placeholder="Phone Number, Username or Email"
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoCapitalize="none"
            autoComplete="username"
          />
          <input
            type="password"
            className="w-full rounded-full bg-white/95 px-5 py-3.5 text-sm text-gray-800 placeholder-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-white"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="current-password"
          />
          {err && (
            <p className="rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-medium text-white">
              {err}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-loginbtn py-3.5 text-base font-bold text-white shadow-md transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Log In'}
          </button>
        </form>

        <button
          className="mt-4 text-center text-base font-semibold text-white/90"
          onClick={() =>
            setErr('Ask the Administrator to reset your password (Settings → Reset user password).')
          }
        >
          Forgot Password?
        </button>

        <div className="flex-1" />
        <p className="mt-10 text-center text-sm font-medium text-white/80">
          Marketing Officers Performance
          <br />
          Tracking System
        </p>
        <p className="mt-4 text-center text-[11px] text-white/60">
          Demo logins — admin / admin123 &nbsp;·&nbsp; user / user123
        </p>
      </div>
    </div>
  );
}
