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
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) {
      setErrorMsg("That file doesn't look like an image. Try a JPG or PNG of a leaf.");
      setStatus("error");
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const MAX_DIM = 1024;
      let { width, height } = img;

      if (width > height && width > MAX_DIM) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else if (height > MAX_DIM) {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      const base64 = dataUrl.split(",")[1];

      setImageData({ dataUrl, mediaType: "image/jpeg", base64 });
      setResult(null);
      setStatus("idle");
      setErrorMsg("");
      URL.revokeObjectURL(objectUrl);
    };

    img.onerror = () => {
      setErrorMsg("Couldn't read that file. Please try again.");
      setStatus("error");
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
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
  const sendChatMessage = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const newMessages = [...chatMessages, { role: "user", text: trimmed }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const contextNote = result
        ? `Recent scan result — Crop: ${result.crop}, Condition: ${result.condition}, Status: ${result.status}.`
        : "";
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: contextNote ? `${contextNote}\n\nQuestion: ${trimmed}` : trimmed,
          history: newMessages.slice(-8),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Chat request failed");
      setChatMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I couldn't respond right now. Please try again." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chatMessages, result]);

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
            <h3>Capture</h3><p>Photograph a leaf in natural light — any crop, any season, any handheld camera.</p>
          </div>
          <div className="step">
            <span className="step-num">02</span>
            <h3>Scan</h3>
            <p>The model reads texture, color, and lesion pattern against a trained field index.</p>
          </div>
          <div className="step">
            <span className="step-num">03</span>
            <h3>Report</h3>
            <p>Get a plain-language diagnosis with a practical next step, in under ten seconds.</p>
          </div>
        </div>
      </section>

      <section className="about" id="about">
        <h2>About FarmVision AI</h2>
        <p>
          FarmVision AI was built to put field-level crop diagnostics in the hands of smallholder
          farmers. We combine AI image analysis with practical, local guidance — so a diagnosis
          isn't just a label, it's a next step you can act on today.
        </p>
      </section>

      <section className="team" id="team">
        <h2>Team</h2>
        <p>
          FarmVision AI is built and run by a small team based in Kenya, working directly with
          farmers to make sure the tool solves real problems, not imagined ones.
        </p>
      </section>

      <section className="contact" id="contact">
        <h2>Contact</h2>
        <form className="contact-form" onSubmit={handleContactSubmit}>
          <input
            type="text"
            placeholder="Your name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Your email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            required
          />
          <textarea
            placeholder="Your message"
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            rows={4}
            required
          />
          <button type="submit" className="btn-primary">Send message</button>
        </form>
      </section>

      <section className="faq" id="faq">
        <h2>FAQ</h2>
        <div className="faq-item">
          <h3>Does it work offline?</h3>
          <p>Not yet — each scan needs an internet connection. Offline support is on our roadmap.</p>
        </div>
        <div className="faq-item">
          <h3>Which crops are supported?</h3>
          <p>We're starting with common Kenyan staple and horticultural crops, with more added regularly.</p>
        </div>
        <div className="faq-item">
          <h3>Is it free to use?</h3>
          <p>Yes, scanning is free while we're building out the platform.</p>
        </div>
      </section>

      <footer className="footer">
        <section className="chatbox" id="chatbox">
        <h2>Ask FarmVision AI</h2>
        <p className="chat-sub">Ask about crop problems, or ask about your last scan result.</p>
        <div className="chat-window">
          <div className="chat-messages">
            {chatMessages.length === 0 && (
              <p className="chat-empty">Try asking: "Why are my tomato leaves curling?"</p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                {m.text}
              </div>
            ))}
            {chatLoading && <div className="chat-bubble assistant chat-typing">Typing…</div>}
          </div>
          <div className="chat-input-row">
            <input
              type="text"
              placeholder="Type your question…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
            />
            <button className="btn-primary" onClick={sendChatMessage} disabled={chatLoading}>
              Send
            </button>
          </div>
        </div>
      </section>
        <p>© {new Date().getFullYear()} FarmVision AI. Built in Kenya.</p>
      </footer>
    </div>
  );
}

const css = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Work Sans', sans-serif; color: #2B3A22; background: #F7F4EA; }
  h1, h2, h3 { font-family: 'Roboto Slab', serif; }
  .nav { display: flex; justify-content: center; padding: 16px 24px; background: #EFE9D8; border-bottom: 1px solid #d8d2bd; }
  .nav-inner { display: flex; justify-content: space-between; align-items: center; width: 100%; max-width: 1100px; }
  .wordmark { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.1rem; }
  .nav-links { display: flex; gap: 20px; }
  .nav-links a { color: #2B3A22; text-decoration: none; font-size: 0.95rem; }
  .hero { padding: 40px 24px; max-width: 1100px; margin: 0 auto; }
  .eyebrow { color: #4A6B3A; font-weight: 600; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; }
  .lede { color: #55503f; max-width: 60ch; }
  .scanner { margin-top: 24px; }
  .scanner-card { background: #fff; border: 1px solid #e0dcc9; border-radius: 16px; padding: 20px; max-width: 480px; }
  .scanner-head { display: flex; align-items: center; gap: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 0.75rem; color: #7a765f; margin-bottom: 12px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #4A6B3A; }
  .scanner-id { margin-left: auto; }
  .dropzone { border: 2px dashed #cfc9b0; border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; min-height: 180px; display: flex; align-items: center; justify-content: center; }
  .dropzone.drag { border-color: #4A6B3A; background: #f2f0e2; }
  .dz-title { font-weight: 600; margin: 8px 0 2px; }
  .dz-sub { color: #7a765f; font-size: 0.85rem; margin: 0; }
  .dz-image-wrap { position: relative; width: 100%; }
  .dz-image { width: 100%; border-radius: 8px; display: block; }
  .scanner-controls { display: flex; gap: 10px; margin-top: 14px; }
  .btn-primary { background: #4A6B3A; color: #EFE9D8; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }
  .btn-ghost { background: none; border: 1px solid #cfc9b0; padding: 10px 18px; border-radius: 8px; cursor: pointer; }
  .err-text { color: #8C3B2A; margin-top: 10px; }
  .report { margin-top: 16px; border-top: 1px solid #e0dcc9; padding-top: 16px; }
  .report-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
  .mono-label { font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem; color: #7a765f; }
  .status-pill { padding: 4px 10px; border-radius: 20px; color: #fff; font-size: 0.75rem; font-weight: 600; }
  .conf-bar { flex: 1; height: 6px; background: #eee; border-radius: 4px; margin: 0 10px; overflow: hidden; }
  .conf-fill { height: 100%; background: #4A6B3A; }
  .obs-list { margin: 10px 0; padding-left: 18px; }
  .rec-box { background: #f2f0e2; border-radius: 8px; padding: 12px; margin-top: 12px; }
  .how, .about, .team, .contact, .faq { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
  .steps { display: flex; flex-wrap: wrap; gap: 24px; margin-top: 20px; }
  .step { flex: 1; min-width: 200px; }
  .step-num { font-family: 'IBM Plex Mono', monospace; color: #4A6B3A; font-weight: 600; }
  .contact-form { display: flex; flex-direction: column; gap: 12px; max-width: 420px; }
  .contact-form input, .contact-form textarea { padding: 10px; border: 1px solid #cfc9b0; border-radius: 8px; font-family: inherit; }
  .faq-item { margin-bottom: 16px; }
  .footer { text-align: center; padding: 24px; color: #7a765f; font-size: 0.85rem; border-top: 1px solid #e0dcc9; margin-top: 40px; }
`;
