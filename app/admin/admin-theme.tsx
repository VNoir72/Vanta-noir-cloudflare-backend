'use client';
import {useEffect, useState} from 'react';
import {installAdminTheme} from '@/lib/admin-theme';
declare global { interface Window { __vnAdminThemeStop?: () => void } }
export function AdminAppearance() {
  useEffect(() => {
    window.__vnAdminThemeStop ??= installAdminTheme();
    document.querySelectorAll('[data-admin-theme-control]').forEach(control => { if (control instanceof HTMLSelectElement) control.value = document.documentElement.dataset.vnAdminMode || 'system'; });
    return () => { window.__vnAdminThemeStop?.(); delete window.__vnAdminThemeStop; };
  }, []);
  return <div className="vn-appearance-bar"><label className="vn-theme-control">Appearance<select aria-label="Admin appearance" data-admin-theme-control defaultValue="system"><option value="system">Auto · device</option><option value="schedule">Auto · time (7am–7pm light)</option><option value="light">Light</option><option value="dark">Dark</option></select></label></div>;
}
export function useAdminTheme() {
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  useEffect(() => {
    const update = () => setTheme(document.documentElement.dataset.vnAdminTheme === 'dark' ? 'dark' : 'light');
    update(); window.addEventListener('vn-admin-theme-change', update);
    return () => window.removeEventListener('vn-admin-theme-change', update);
  }, []);
  return theme;
}
