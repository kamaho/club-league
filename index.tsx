import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  rootElement.innerHTML = `<div style="padding:1rem;font-family:sans-serif;max-width:480px"><h2 style="color:#b91c1c">App failed to load</h2><pre style="background:#fef2f2;padding:0.75rem;border-radius:6px;font-size:12px;overflow:auto">${msg}</pre><p style="margin-top:0.5rem;font-size:14px">Sjekk konsollen (F12) for mer info. Prøv hard refresh (Ctrl+Shift+R / Cmd+Shift+R).</p></div>`;
  console.error(err);
}