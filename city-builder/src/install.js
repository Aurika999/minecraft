// Instalarea jocului ca aplicație (PWA): butonul „Instalează” folosește evenimentul browserului.
import { useEffect, useState } from 'react';

let deferred = null;
const subs = new Set();
const notify = () => subs.forEach(f => f());

// evenimentul vine o singură dată, devreme, așa că îl prindem imediat ce se încarcă scriptul
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; notify(); });
addEventListener('appinstalled', () => { deferred = null; notify(); });

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isSecure = () => window.isSecureContext;

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force(n => n + 1);
    subs.add(f);
    return () => subs.delete(f);
  }, []);
  return {
    installed: isStandalone(),
    canPrompt: !!deferred,
    async prompt() {
      if (!deferred) return false;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      notify();
      return outcome === 'accepted';
    },
  };
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
