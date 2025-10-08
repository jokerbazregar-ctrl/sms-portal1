// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import "./index.css";

const CONFIG = {
  pdfFiles: [
    "case_notes.pdf",
    "evidence_map.pdf",
    "witness_statement.pdf",
  ],
  // سه ترک نمونه — اسم فایل‌ها را در public/assets/audio/ قرار بده
  audioList: ["music11.mp3", "music12.mp3", "music13.mp3"],
  examplePhone: "09164568890",
  exampleCode: "X9vK24pq",
};

const CORRECT_PHONE = "09164568890";
const CORRECT_CODE = "SDMKL56YUU"; // case-sensitive ✅
const MAX_ATTEMPTS = 3;

export default function App() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [accessGranted, setAccessGranted] = useState(false);
  const [alert, setAlert] = useState(null);

  const [lockTime, setLockTime] = useState(0);
  const lockIntervalRef = useRef(null);

  // audio
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // multi-track
  const [selectedTrack, setSelectedTrack] = useState(CONFIG.audioList[0] || null);

  // speed control
  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const speedPanelRef = useRef(null);
  const headerRef = useRef(null);

  const [logs, setLogs] = useState([]);

  const audioSrc = selectedTrack ? `/assets/audio/${selectedTrack}` : null;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (lockIntervalRef.current) {
        clearInterval(lockIntervalRef.current);
        lockIntervalRef.current = null;
      }
    };
  }, []);

  // When selectedTrack changes, update src but DO NOT change currentTime unless user switches (natural behavior)
  useEffect(() => {
    if (!audioRef.current) return;
    const prevPlaying = isPlaying;
    audioRef.current.src = audioSrc;
    try { audioRef.current.playbackRate = playbackRate; } catch (e) {}
    if (prevPlaying) {
      audioRef.current.play().catch(() => {});
    }
  }, [selectedTrack, audioSrc]); // eslint-disable-line

  // ensure changing playbackRate does not restart audio — only update playbackRate on the element
  useEffect(() => {
    if (audioRef.current) {
      try {
        audioRef.current.playbackRate = playbackRate;
      } catch (e) {}
    }
  }, [playbackRate]);

  // lock timer behavior
  useEffect(() => {
    if (lockIntervalRef.current) {
      clearInterval(lockIntervalRef.current);
      lockIntervalRef.current = null;
    }
    if (lockTime > 0) {
      lockIntervalRef.current = setInterval(() => {
        setLockTime((prev) => {
          if (prev <= 1) {
            clearInterval(lockIntervalRef.current);
            lockIntervalRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (lockIntervalRef.current && lockTime === 0) {
        clearInterval(lockIntervalRef.current);
        lockIntervalRef.current = null;
      }
    };
  }, [lockTime]);

  // click-outside to hide speed panel
  useEffect(() => {
    function handleDocClick(e) {
      if (!showSpeedControl) return;
      if (speedPanelRef.current && speedPanelRef.current.contains(e.target)) return;
      if (headerRef.current && headerRef.current.contains(e.target)) return;
      setShowSpeedControl(false);
    }
    document.addEventListener("click", handleDocClick);
    return () => document.removeEventListener("click", handleDocClick);
  }, [showSpeedControl]);

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function recordLog({ phoneValue, codeValue, success }) {
    const time = new Date();
    const codeUC = String(codeValue || "").toUpperCase();
    const entry = {
      phone: phoneValue || "",
      code: codeUC,
      success: !!success,
      timestamp: time.toISOString(),
    };
    setLogs((prev) => [entry, ...prev].slice(0, 200));
    console.log("LOG SENT:", entry);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (accessGranted) return;

    if (lockTime > 0) {
      setAlert({ type: "error", text: `پنل قفل شده است — لطفاً ${formatTime(lockTime)} صبر کنید.` });
      recordLog({ phoneValue: phone, codeValue: code, success: false });
      return;
    }

    const isPhoneOk = phone.trim() === CORRECT_PHONE;
    const isCodeOk = code.trim() === CORRECT_CODE; // case-sensitive
    const success = isPhoneOk && isCodeOk;
    recordLog({ phoneValue: phone, codeValue: code, success });

    if (success) {
      setAccessGranted(true);
      setAlert({ type: "success", text: "دسترسی به پرونده داده شد ✅" });
      setAttempts(0);
      setLockTime(0);
      return;
    }

    const next = attempts + 1;
    setAttempts(next);
    setAlert({ type: "error", text: `شماره یا کد اشتباه است — تلاش ${next} از ${MAX_ATTEMPTS}.` });

    if (next % 3 === 0) {
      const groupNumber = next / 3;
      const minutes = 5 * groupNumber;
      setLockTime(minutes * 60);
    }
  }

  function toggleAudio() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }

  function handleBadgeClick(e) {
    e.stopPropagation();
    setShowSpeedControl((s) => !s);
  }

  function decreaseSpeed() {
    setPlaybackRate((p) => {
      const next = Math.max(0.5, Math.round((p - 0.1) * 10) / 10);
      return next;
    });
  }
  function increaseSpeed() {
    setPlaybackRate((p) => {
      const next = Math.min(2.0, Math.round((p + 0.1) * 10) / 10);
      return next;
    });
  }
  function onSpeedChange(e) {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setPlaybackRate(v);
  }

  function selectTrack(track) {
    setSelectedTrack(track);
  }

  // color mapping for track buttons
  const trackColors = {
    "music11.mp3": { bg: "linear-gradient(90deg,#3b0236,#ff33a8)", border: "#ff33a8", text: "#fff" },
    "music12.mp3": { bg: "linear-gradient(90deg,#002b3b,#6ad0ff)", border: "#6ad0ff", text: "#fff" },
    "music13.mp3": { bg: "linear-gradient(90deg,#2b0018,#b56bff)", border: "#b56bff", text: "#fff" },
  };

  return (
    <div className="ci-app">
      <header className="ci-header" ref={headerRef} style={{ position: "relative" }}>
        <div
          className="badge"
          style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onClick={handleBadgeClick}
        >
          <div className="badge-num" title="نمایش کنترل سرعت پنهان">#11</div>
          <h1 className="ci-title">پنل پرونده محرمانه</h1>
        </div>

        {showSpeedControl && (
          <div
            ref={speedPanelRef}
            className="speed-control"
            style={{
              position: "absolute",
              top: 64,
              left: 18,
              zIndex: 1200,
              background: "linear-gradient(180deg, rgba(18,8,20,0.98), rgba(28,10,30,0.96))",
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.04)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
              minWidth: 280,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "#f1e8ff" }}>کنترل سرعت موسیقی</strong>
              <span style={{ color: "#cfc7e6" }}>{playbackRate.toFixed(1)}x</span>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <button className="btn tiny" onClick={decreaseSpeed}>−</button>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={playbackRate}
                onChange={onSpeedChange}
                style={{ flex: 1 }}
              />
              <button className="btn tiny" onClick={increaseSpeed}>+</button>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "#bfb7d9" }}>
              سرعت بلافاصله و بدون ری‌استارت اعمال می‌شود (اگر موزیک در حال پخش باشد، ادامه خواهد یافت).
            </div>
          </div>
        )}
      </header>

      <main className="ci-main">
        <section className="panel form-panel" aria-labelledby="access-title">
          <h2 id="access-title">دسترسی مامور</h2>

          <form className="access-form" onSubmit={handleSubmit}>
            <label className="field">
              <div className="label">شماره تلفن</div>
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={`مثال: ${CONFIG.examplePhone}`}
                inputMode="numeric"
                disabled={accessGranted || lockTime > 0}
                aria-label="phone"
              />
            </label>

            <label className="field">
              <div className="label">کد دسترسی</div>
              <input
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`مثال: ${CONFIG.exampleCode}`}
                disabled={accessGranted || lockTime > 0}
                aria-label="access-code"
              />
              <div className="muted small" style={{ marginTop: 6 }}>
                توجه: کد را <strong>حتماً با حروف بزرگ</strong> وارد کنید 
              </div>
            </label>

            <div className="form-row">
              <button className="btn btn-primary" type="submit" disabled={accessGranted || lockTime > 0}>
                باز کردن پرونده
              </button>

              <div className="attempts">تلاش: {attempts} / {MAX_ATTEMPTS}</div>
            </div>

            {lockTime > 0 && (
              <div className="alert error" style={{ marginTop: 12 }}>
                پنل قفل شده است — زمان باقی‌مانده: <strong>{formatTime(lockTime)}</strong>
              </div>
            )}

            {alert && lockTime === 0 && (
              <div className={`alert ${alert.type === "success" ? "success" : "error"}`} style={{ marginTop: 12 }}>
                {alert.text}
              </div>
            )}
          </form>

          {/* audio panel */}
          <div className="audio-panel">
            <h3>پلیر موسیقی پرونده (انتخابی)</h3>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              {CONFIG.audioList.map((track) => {
                const active = selectedTrack === track;
                const colors = trackColors[track] || {};
                return (
                  <button
                    key={track}
                    className={`btn tiny track-btn`}
                    onClick={() => selectTrack(track)}
                    style={{
                      border: active ? `2px solid ${colors.border || "#ff33a8"}` : "1px solid rgba(255,255,255,0.04)",
                      background: active ? (colors.bg || "rgba(255,51,168,0.08)") : "transparent",
                      color: colors.text || "#fff",
                      padding: "6px 10px",
                      borderRadius: 8,
                      fontWeight: 700,
                    }}
                  >
                    {track.replace(/\.[^/.]+$/, "")}
                  </button>
                );
              })}
            </div>

            <audio
              ref={audioRef}
              src={audioSrc}
              preload="none"
              onEnded={() => setIsPlaying(false)}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn btn-outline" onClick={toggleAudio}>
                {isPlaying ? "متوقف کردن موسیقی" : "پخش موسیقی پرونده"}
              </button>
              <div style={{ color: "#bfb7d9", fontSize: 13 }}>
                فایل فعلی: <code>{selectedTrack}</code> · سرعت: {playbackRate.toFixed(1)}x
              </div>
            </div>

            <div style={{ marginTop: 8, color: "#a99fd6", fontSize: 13 }}>
              
            </div>
          </div>
        </section>

        <aside className="panel logs-panel" aria-labelledby="files-title">
          <h2 id="files-title">فایل‌ها و لاگ‌ها</h2>

          {!accessGranted ? (
            <div className="locked-note">بعد از وارد کردن شماره و کد صحیح، لینک دسترسی به شما نمایش داده می‌شود.</div>
          ) : (
            <>
              {/* فایل‌های پی‌دی‌اف (قیمت/مقدار نمایش) حذف شد — به‌جای آن لینک پرداخت/دسترسی نمایش داده می‌شود */}
              <div style={{ padding: 18, borderRadius: 12, background: "linear-gradient(180deg, rgba(255,255,255,0.008), rgba(255,255,255,0.004))", boxShadow: "var(--soft-shadow)" }}>
                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>دسترسی فعال شد</div>
                <div style={{ color: "#cfc7e6", marginBottom: 12 }}>برای دریافت اطلاعات بیشتر و فایل‌ها، روی لینک زیر کلیک کنید:</div>
                <a href="https://t.me/payamsoty" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: "none" }}>
                  باز کردن لینک تلگرام
                </a>
                <div className="muted small" style={{ marginTop: 10 }}>
                  لینک بالا شما را به آدرس <code>https://t.me/payamsoty</code> هدایت می‌کند.
                </div>
              </div>

              <h3 style={{ marginTop: 12 }}>لاگ‌های ارسال‌شده (آخرین‌ها)</h3>
              <div style={{ maxHeight: 240, overflowY: "auto", marginTop: 8 }}>
                {logs.length === 0 ? (
                  <div className="muted small">هنوز لاگ‌ای ثبت نشده است.</div>
                ) : (
                  logs.map((L, i) => (
                    <div key={i} style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{L.phone} · <span style={{ color: L.success ? "#6ee7b7" : "#ff8b8b" }}>{L.success ? "موفق" : "ناموفق"}</span></div>
                      <div style={{ fontSize: 13, color: "#cfc7e6" }}>کد: <strong>{L.code}</strong></div>
                      <div style={{ fontSize: 12, color: "#b9aee0" }}>{new Date(L.timestamp).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </aside>
      </main>

      <footer className="ci-footer">
        <div className="muted">Prototype • MHN — 11 UI</div>
      </footer>
    </div>
  );
}
