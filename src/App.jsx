import React, { useState, useRef, useCallback } from "react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;600;700&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

const STATUS_COLORS = {
  healthy: { bg: "#4A6B3A", label: "Healthy" },
  attention: { bg: "#B8863B", label: "Needs attention" },
  critical: { bg: "#8C3B2A", label: "Critical" },
};

function LeafMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" role="img" aria-label="FarmVision AI leaf logo">
      <path d="M6 26C6 14 14 6 26 6C26 18 18 26 6 26Z" stroke="#2B3A22" strokeWidth="2" fill="#4A6B3A" />
      <path d="M7 25L23 9" stroke="#EFE9D8" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  const [imageData, setImageData] = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      setErrorMsg("That file doesn't look like an image. Try a JPG or PNG of a leaf.");
      setStatus("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(",")[1];
      setImageData({ dataUrl, mediaType: file.type, base64 });
      setResult(null);
      setStatus("idle");
      setErrorMsg("");
    };
    reader.onerror = () => {
      setErrorMsg("Couldn't read that file. Please try again.");
      setStatus("error");
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      handleFile(file);
    },
    [handleFile]
  );

  const runScan = useCallback(async () => {
    if (!imageData) return;
    setStatus("scanning");
    setErrorMsg("");

    try {
      const [response] = await Promise.all([
        fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaType: imageData.mediaType,
            base64: imageData.base64,
          }),
        }),
        new Promise((res) => setTimeout(res, 1400)),
      ]);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Request failed (${response.status})`);
      }

      setResult(data);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.message === "Failed to fetch"
          ? "Couldn't reach the server. Check your connection and try again."
          : err.message || "The scan didn't complete. Please try again in a moment."
      );
      setStatus("error");
    }
  }, [imageData]);

  const reset = () => {
    setImageData(null);
    setResult(null);
    setStatus("idle");
    setErrorMsg("");
  };

  const CONTACT_EMAIL = "farmvisional@gmail.com";

  const handleContactSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Message from ${contactName || "website visitor"}`);
    const body = encodeURIComponent(
      `Name: ${contactName}\nEmail: ${contactEmail}\n\n${contactMessage}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div>
      <style>{FONTS}{css}</style>

      <header className="nav">
        <div className="nav-inner">
          <div className="wordmark">
            <LeafMark />
            <span>FarmVision AI</span>
          </div>
          <nav className="nav-links">
            <a href="#scan">Try it</a>
            <a href="#how">How it works</a>
            <a href="#about">About</a>
            <a href="#team">Team</a>
            <a href="#contact">Contact</a>
            <a href="#faq">FAQ</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Field diagnostics, from a photo</p>
          <h1>
            Point your camera at a leaf.
            <br />
            Know what's wrong in seconds.
          </h1>
          <p className="lede">
            FarmVision AI reads plant tissue the way a field agronomist would — trained to spot
            disease and pest damage in leaf texture, color, and lesion pattern before it spreads
            through the row.
          </p>
        </div>

        <div className="scanner" id="scan">
          <div className="scanner-card">
            <div className="scanner-head">
              <span className="dot" />
              <span className="scanner-title">FIELD SCANNER</span>
              <span className="scanner-id">UNIT-04</span>
            </div>

            <div
              className={`dropzone ${dragActive ? "drag" : ""} ${imageData ? "has-image" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              onClick={() => status !== "scanning" && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              {!imageData && (
                <div className="dz-empty">
                  <div className="dz-icon">
                    <LeafMark size={36} />
                  </div>
                  <p className="dz-title">Drop a leaf photo here</p>
                  <p className="dz-sub">or tap to choose a file — JPG or PNG</p>
                </div>
              )}

              {imageData && (
                <div className="dz-image-wrap">
                  <img src={imageData.dataUrl} alt="Uploaded leaf" className="dz-image" />
                  {status === "scanning" && (
                    <>
                      <div className="scan-grid" />
                      <div className="scan-beam" />
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="scanner-controls">
              {imageData && status !== "scanning" && (
                <button className="btn-ghost" onClick={reset}>
                  Choose different photo
                </button>
              )}
              {imageData && status !== "done" && (
                <button className="btn-primary" onClick={runScan} disabled={status === "scanning"}>
                  {status === "scanning" ? "Scanning…" : "Run scan"}
                </button>
              )}
              {status === "done" && (
                <button className="btn-primary" onClick={runScan}>
                  Scan again
                </button>
              )}
            </div>

            {status === "error" && <p className="err-text">{errorMsg}</p>}

            {status === "done" && result && (
              <div className="report">
                <div className="report-tear" />
                <div className="report-row report-head">
                  <span className="mono-label">DIAGNOSTIC REPORT</span>
                  <span
                    className="status-pill"
                    style={{ background: (STATUS_COLORS[result.status] || STATUS_COLORS.attention).bg }}
                  >
                    {(STATUS_COLORS[result.status] || STATUS_COLORS.attention).label}
                  </span>
                </div>

                <div className="report-row">
                  <span className="mono-label">CROP</span>
                  <span className="mono-val">{result.crop}</span>
                </div>
                <div className="report-row">
                  <span className="mono-label">CONDITION</span>
                  <span className="mono-val">{result.condition}</span>
                </div>
                <div className="report-row">
                  <span className="mono-label">CONFIDENCE</span>
                  <div className="conf-bar">
                    <div
                      className="conf-fill"
                      style={{ width: `${Math.max(0, Math.min(100, result.confidence || 0))}%` }}
                    />
                  </div>
                  <span className="mono-val small">{result.confidence}%</span>
                </div>

                {Array.isArray(result.observations) && (
                  <ul className="obs-list">
                    {result.observations.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                )}

                <div className="rec-box">
                  <span className="mono-label">RECOMMENDATION</span>
                  <p>{result.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <span className="step-num">01</span>
            <h3>Capture</h3>
