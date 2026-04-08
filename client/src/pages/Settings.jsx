import { useState, useEffect } from 'react';
import { api } from '../api/client';

const labelStyle = { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, display: 'block' };
const cardStyle  = { background: 'white', borderRadius: 10, padding: '16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' };
const btnStyle   = (bg) => ({
  background: bg, color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginBottom: 8,
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

async function subscribeToPush(vapidKey) {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
}

export default function Settings() {
  const [settings, setSettings]           = useState({ notification_time: '08:00' });
  const [subscribed, setSubscribed]       = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [status, setStatus]               = useState('');

  useEffect(() => {
    api.getSettings().then(setSettings);
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(supported);
    if (supported) {
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
      );
    }
  }, []);

  const handleTimeChange = async (e) => {
    const value = e.target.value;
    setSettings(s => ({ ...s, notification_time: value }));
    await api.updateSetting('notification_time', value);
    setStatus('Saved!');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleSubscribe = async () => {
    try {
      const { key } = await api.getVapidKey();
      const sub = await subscribeToPush(key);
      const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh'))));
      const auth   = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))));
      await api.subscribe({ endpoint: sub.endpoint, keys: { p256dh, auth } });
      setSubscribed(true);
      setStatus('Notifications enabled!');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
    setTimeout(() => setStatus(''), 3000);
  };

  const handleUnsubscribe = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await api.unsubscribe(sub.endpoint);
    }
    setSubscribed(false);
    setStatus('Notifications disabled.');
    setTimeout(() => setStatus(''), 2000);
  };

  const handleTestPush = async () => {
    try {
      await api.testPush();
      setStatus('Test notification sent!');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#2e7d32', marginBottom: 20 }}>⚙️ Settings</h1>
      <div style={cardStyle}>
        <label style={labelStyle}>Notification time</label>
        <input
          type="time"
          value={settings.notification_time}
          onChange={handleTimeChange}
          style={{ fontSize: 18, border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', width: '100%' }}
        />
      </div>
      <div style={cardStyle}>
        <label style={labelStyle}>Push notifications</label>
        {!pushSupported ? (
          <p style={{ color: '#aaa', fontSize: 13 }}>Not supported in this browser.</p>
        ) : subscribed ? (
          <>
            <p style={{ fontSize: 13, color: '#2e7d32', marginBottom: 12 }}>✅ Notifications are enabled</p>
            <button style={btnStyle('#e65100')} onClick={handleUnsubscribe}>Disable notifications</button>
            <button style={{ ...btnStyle('#1565c0'), marginTop: 4 }} onClick={handleTestPush}>Send test notification</button>
          </>
        ) : (
          <button style={btnStyle('#2e7d32')} onClick={handleSubscribe}>Enable notifications</button>
        )}
      </div>
      {status && <p style={{ color: '#2e7d32', fontWeight: 600, textAlign: 'center' }}>{status}</p>}
    </div>
  );
}
