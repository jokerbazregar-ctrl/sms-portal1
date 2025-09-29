// src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import './index.css'; // حواست باشه این فایل رو در src بسازی و CSS را در آن قرار بدی

const CORRECT_PHONE = '09164568890';
const CORRECT_CODE = 'SDmkl56yuu';
const MAX_ATTEMPTS = 3;

function sampleLogs() {
  const now = Date.now();
  return [
    {
      id: 1,
      sender: 'طلبکار',
      timestamp: new Date(now - 1000 * 60 * 60).toLocaleString(),
      message: 'اگر پول را نیاوری، خبر همه را می‌دهم.',
      isThreat: true,
    },
    {
      id: 2,
      sender: 'مادر',
      timestamp: new Date(now - 1000 * 60 * 60 * 2).toLocaleString(),
      message: 'خوبی؟ شام خوردی؟',
      isThreat: false,
    },
    {
      id: 3,
      sender: 'دوست قدیمی',
      timestamp: new Date(now - 1000 * 60 * 30).toLocaleString(),
      message: 'همیشه کنارت هستم. هر کمکی بخوای بگو.',
      isThreat: false,
    },
    {
      id: 4,
      sender: "درخواست از برادر مقتول",
      timestamp: new Date(now - 1000 * 60 * 10).toLocaleString(),
      message: 'جایی برای مخفی شدن پیدا کن. من پول را می‌فرستم.',
      isThreat: false,
    },
    {
      id: 5,
      sender: 'طلبکار',
      timestamp: new Date(now - 1000 * 30).toLocaleString(),
      message: 'آخرین فرصت است — فردا شب دیر است.',
      isThreat: true,
    },
  ];
}

export default function App() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [accessGranted, setAccessGranted] = useState(false);
  const [alert, setAlert] = useState(null); // {type: 'success'|'error', message}
  const [logs] = useState(sampleLogs());
  const [playingId, setPlayingId] = useState(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
        audioCtxRef.current = null;
      }
    };
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (accessGranted) return;
    if (attempts >= MAX_ATTEMPTS) {
      setAlert({ type: 'error', message: 'Maximum attempts reached. Inputs disabled.' });
      return;
    }

    if (phone.trim() === CORRECT_PHONE && code.trim() === CORRECT_CODE) {
      setAccessGranted(true);
      setAlert({ type: 'success', message: 'Access to logs granted ✅' });
    } else {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setAlert({ type: 'error', message: `Wrong number or code! Attempt ${next} of ${MAX_ATTEMPTS}. Inputs disabled.` });
      } else {
        setAlert({ type: 'error', message: `Wrong number or code! Attempt ${next} of ${MAX_ATTEMPTS}` });
      }
    }
  }

  function disabledInputs() {
    return attempts >= MAX_ATTEMPTS || accessGranted;
  }

  // Synthesize a short threat-like tone using Web Audio API (no external files)
  function playThreatTone(id) {
    // toggle: if the same id is playing, stop it
    if (playingId === id) {
      setPlayingId(null);
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) {}
        audioCtxRef.current = null;
      }
      return;
    }

    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const dur = 1.2; // seconds
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = 'sawtooth';
    o.frequency.value = 150;
    o.frequency.linearRampToValueAtTime(420, ctx.currentTime + dur);

    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);

    o.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);

    o.start();
    setPlayingId(id);

    o.stop(ctx.currentTime + dur + 0.05);

    setTimeout(() => {
      setPlayingId(null);
      try { ctx.close(); } catch (e) {}
      audioCtxRef.current = null;
    }, (dur + 0.12) * 1000);
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="file-badge">File # <span className="file-number">11</span></div>
        <h1 className="title">Criminal Investigation — Case File</h1>
      </header>

      <main className="main-grid">
        <section className="panel form-panel">
          <h2 className="panel-title">Agent Access</h2>
          <form className="access-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="label-text">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0916xxxxxxx"
                disabled={disabledInputs()}
                inputMode="numeric"
                className="input"
              />
            </label>

            <label className="field">
              <span className="label-text">Access Code</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter access code"
                disabled={disabledInputs()}
                className="input"
              />
            </label>

            <div className="actions">
              <button type="submit" className="btn btn-pink" disabled={disabledInputs()}>
                Unlock Logs
              </button>
              <div className="attempts">Attempts: {attempts} / {MAX_ATTEMPTS}</div>
            </div>

            {alert && (
              <div className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                {alert.message}
              </div>
            )}

            {attempts >= MAX_ATTEMPTS && !accessGranted && (
              <div className="notice">Maximum attempts reached. Contact administrator.</div>
            )}
          </form>

          {accessGranted && (
            <div className="audio-section">
              <h3>Threat Audio</h3>
              <p className="muted">Play synthesized audio for threat-type messages.</p>
              <div className="audio-controls">
                <button className="btn btn-outline" onClick={() => playThreatTone('global')}>
                  {playingId === 'global' ? 'Stop' : 'Play Sample Threat Tone'}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="panel logs-panel" aria-hidden={!accessGranted}>
          <h2 className="panel-title">Case Logs</h2>

          {!accessGranted ? (
            <div className="locked-state">Enter correct phone and code to view logs.</div>
          ) : (
            <div className="logs-list" role="log">
              {logs.map((log) => (
                <div key={log.id} className={`log-item ${log.isThreat ? 'threat' : ''}`}>
                  <div className="log-head">
                    <div className="sender">{log.sender}</div>
                    <div className="ts">{log.timestamp}</div>
                  </div>
                  <div className="log-body">
                    <div className="msg">
                      {log.isThreat ? (
                        <span className="msg-text"><span className="kw">{log.message}</span></span>
                      ) : (
                        <span className="msg-text">{log.message}</span>
                      )}
                    </div>
                    {log.isThreat && (
                      <div className="log-actions">
                        <button className="tiny" onClick={() => playThreatTone(log.id)}>
                          {playingId === log.id ? 'Stop' : 'Play Audio'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>

      <footer className="app-footer">
        <div className="note">UI prototype — responsive, modern, and themed for dark purple/black casework.</div>
      </footer>
    </div>
  );
}
