import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { adminResetPassword, changePassword, listUsers } from '../store/auth';
import { PageHead, SectionTitle } from '../components/ui';

export default function Settings() {
  const { session, logout, countMode, setCountMode, lowThreshold, setLowThreshold } = useApp();
  const nav = useNavigate();
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [nw2, setNw2] = useState('');
  const [msg, setMsg] = useState('');

  const [users, setUsers] = useState<{ id: string; role: string; name: string }[]>([]);
  const [target, setTarget] = useState('user');
  const [resetPw, setResetPw] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    if (session?.role === 'admin') listUsers().then(setUsers);
  }, [session?.role]);

  async function submitChange(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (nw !== nw2) return setMsg('New passwords do not match.');
    const res = await changePassword(session!.id, cur, nw);
    setMsg(res.ok ? 'Password changed.' : res.error || 'Failed.');
    if (res.ok) {
      setCur('');
      setNw('');
      setNw2('');
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminResetPassword(target, resetPw);
    setResetMsg(res.ok ? `Password for "${target}" reset.` : res.error || 'Failed.');
    if (res.ok) setResetPw('');
  }

  return (
    <div>
      <PageHead title="Settings" subtitle={`${session?.name} · ${session?.role}`} />

      <SectionTitle>Change my password</SectionTitle>
      <form onSubmit={submitChange} className="card space-y-3 p-4">
        <input className="field" type="password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} />
        <input className="field" type="password" placeholder="New password" value={nw} onChange={(e) => setNw(e.target.value)} />
        <input className="field" type="password" placeholder="Confirm new password" value={nw2} onChange={(e) => setNw2(e.target.value)} />
        <button className="btn-primary w-full">Update password</button>
        {msg && <p className="text-sm font-medium text-violet-700">{msg}</p>}
      </form>

      {session?.role === 'admin' && (
        <>
          <SectionTitle>Achievement "Number" counting</SectionTitle>
          <div className="card space-y-2 p-4 text-sm">
            <label className="flex items-start gap-3">
              <input
                type="radio"
                className="mt-1"
                checked={countMode === 'strict'}
                onChange={() => setCountMode('strict')}
              />
              <span>
                <b>Strict</b> (as per instruction) — a converted lead counts towards the Number only if it has an
                account / policy / folio number in the file.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="radio"
                className="mt-1"
                checked={countMode === 'lenient'}
                onChange={() => setCountMode('lenient')}
              />
              <span>
                <b>Lenient</b> — every converted lead counts, even if the account-number column is blank. Use this
                if your export doesn't always fill account numbers (e.g. Govt. Scheme leads).
              </span>
            </label>
          </div>

          <SectionTitle>Low-performance threshold</SectionTitle>
          <div className="card flex items-center justify-between gap-3 p-4 text-sm">
            <span>An MO is flagged "Low" when overall Achievement % is below</span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={100}
                value={lowThreshold}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (n >= 1 && n <= 100) setLowThreshold(n);
                }}
                className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-right"
              />
              <b>%</b>
            </span>
          </div>

          <SectionTitle>Reset a user's password</SectionTitle>
          <form onSubmit={submitReset} className="card space-y-3 p-4">
            <select className="field" value={target} onChange={(e) => setTarget(e.target.value)}>
              {users
                .filter((u) => u.id !== 'admin')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.id})
                  </option>
                ))}
            </select>
            <input className="field" type="text" placeholder="New password for this user" value={resetPw} onChange={(e) => setResetPw(e.target.value)} />
            <button className="btn-ghost w-full">Reset password</button>
            {resetMsg && <p className="text-sm font-medium text-emerald-600">{resetMsg}</p>}
          </form>
        </>
      )}

      <button
        className="btn mt-6 w-full bg-rose-50 text-rose-700 hover:bg-rose-100"
        onClick={() => {
          logout();
          nav('/login');
        }}
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>

      <p className="mt-6 text-center text-[11px] text-gray-400">MO Track · data stored on this device</p>
    </div>
  );
}
