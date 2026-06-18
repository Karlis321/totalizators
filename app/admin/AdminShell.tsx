'use client';
import { useState, useEffect } from 'react';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

export default function AdminShell() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_token');
    setToken(stored);
    setReady(true);
  }, []);

  if (!ready) return null;

  function handleLogin(t: string) {
    sessionStorage.setItem('admin_token', t);
    setToken(t);
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_token');
    setToken(null);
  }

  if (!token) return <AdminLogin onLogin={handleLogin} />;
  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
