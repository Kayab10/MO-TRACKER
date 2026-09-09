import { db } from './db';

export type Role = 'admin' | 'user';
export interface User {
  id: string;
  role: Role;
  name: string;
  passwordHash: string;
}
export interface Session {
  id: string;
  role: Role;
  name: string;
}

const SESSION_KEY = 'mo.session.v1';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULTS: { id: string; role: Role; name: string; password: string }[] = [
  { id: 'admin', role: 'admin', name: 'Administrator', password: 'admin123' },
  { id: 'user', role: 'user', name: 'Viewer', password: 'user123' },
];

async function ensureUsers(): Promise<User[]> {
  let users = db.rawRead<User[]>(db._usersKey, []);
  if (!users.length) {
    users = [];
    for (const d of DEFAULTS)
      users.push({ id: d.id, role: d.role, name: d.name, passwordHash: await sha256(d.password) });
    db.rawWrite(db._usersKey, users);
  }
  return users;
}

export async function login(id: string, password: string): Promise<Session | null> {
  const users = await ensureUsers();
  const u = users.find((x) => x.id.toLowerCase() === id.trim().toLowerCase());
  if (!u) return null;
  if (u.passwordHash !== (await sha256(password))) return null;
  const session: Session = { id: u.id, role: u.role, name: u.name };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function currentSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function changePassword(id: string, oldPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (newPassword.length < 4) return { ok: false, error: 'New password must be at least 4 characters.' };
  const users = await ensureUsers();
  const u = users.find((x) => x.id === id);
  if (!u) return { ok: false, error: 'User not found.' };
  if (u.passwordHash !== (await sha256(oldPassword))) return { ok: false, error: 'Current password is incorrect.' };
  u.passwordHash = await sha256(newPassword);
  db.rawWrite(db._usersKey, users);
  return { ok: true };
}

export async function adminResetPassword(targetId: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (newPassword.length < 4) return { ok: false, error: 'New password must be at least 4 characters.' };
  const users = await ensureUsers();
  const u = users.find((x) => x.id === targetId);
  if (!u) return { ok: false, error: 'User not found.' };
  u.passwordHash = await sha256(newPassword);
  db.rawWrite(db._usersKey, users);
  return { ok: true };
}

export async function listUsers(): Promise<Session[]> {
  const users = await ensureUsers();
  return users.map((u) => ({ id: u.id, role: u.role, name: u.name }));
}
