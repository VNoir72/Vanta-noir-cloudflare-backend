'use client';
import {useEffect, useState, useRef} from 'react';
import {useStoreSettings} from '@/lib/store-settings';
import {accentInk} from '@/lib/brand-accent';
import {installAdminTheme} from '@/lib/admin-theme';
declare global { interface Window { __vnAdminThemeStop?: () => void } }
export function AdminAppearance() {
  const settings=useStoreSettings();
  useEffect(()=>{const root=document.documentElement;root.style.setProperty('--admin-accent',settings.brandAccent.admin);root.style.setProperty('--admin-on-accent',accentInk(settings.brandAccent.admin));return()=>{root.style.removeProperty('--admin-accent');root.style.removeProperty('--admin-on-accent');};},[settings.brandAccent.admin]);
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

/** Hydrated dashboard controls mount after the initial theme controller applies. */
export function AdminThemeSelect({className}:{className?:string}) {
 const ref=useRef<HTMLSelectElement>(null);
 useEffect(()=>{const sync=()=>{if(ref.current)ref.current.value=document.documentElement.dataset.vnAdminMode||'system';};sync();window.addEventListener('vn-admin-theme-change',sync);return()=>window.removeEventListener('vn-admin-theme-change',sync);},[]);
 return <select ref={ref} aria-label="Admin appearance" data-admin-theme-control defaultValue="system" className={className}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option><option value="schedule">Auto · time</option></select>;
}
