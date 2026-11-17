'use client';

import { useState, type FormEvent } from 'react';
import { Heart, LockKeyhole } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Sign-in failed.');
      window.location.assign('/admin');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign-in failed.');
      setBusy(false);
    }
  }

  return <main className="admin-login">
    <a className="admin-login-brand" href="/"><Heart size={20} /> Made for You <span>by Sahara</span></a>
    <form className="admin-login-card" onSubmit={submit}>
      <div className="admin-login-mark"><LockKeyhole size={23}/></div>
      <p className="admin-eyebrow">OWNER ACCESS</p>
      <h1>Welcome back</h1>
      <p className="admin-muted">Sign in to manage your handmade boutique.</p>
      <label>Email address<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button className="admin-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
      <a className="admin-login-back" href="/">← Back to the website</a>
    </form>
  </main>;
}
