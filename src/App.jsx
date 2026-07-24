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

  const CONTACT_EMAIL = "hello@farmvisionai.example"; // TODO: replace with the real FarmVision AI email

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
            <h3>Capture</h3>
            <p>Photograph a leaf in natural light — any crop, any season, any handheld camera.</p>
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

      <section className="stats" id="about">
        <div className="stat">
          <span className="stat-num">40+</span>
          <span className="stat-label">crop types indexed</span>
        </div>
        <div className="stat">
          <span className="stat-num">12</span>
          <span className="stat-label">growing regions field-tested</span>
        </div>
        <div className="stat">
          <span className="stat-num">&lt;10s</span>
          <span className="stat-label">average scan time</span>
        </div>
      </section>

      <section className="team" id="team">
        <h2>Team</h2>
        <div className="team-grid">
          <div className="team-card">
            <div className="team-avatar">SN</div>
            <h3>Susan Ngei</h3>
            <p className="team-role">CEO &amp; Founder</p>
          </div>
          <div className="team-card">
            <div className="team-avatar">SK</div>
            <h3>Samuel Kibaara</h3>
            <p className="team-role">Co-Founder</p>
          </div>
        </div>
      </section>

      <section className="faq" id="faq">
        <h2>FAQ</h2>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Is FarmVision AI free to use?</summary>
            <p>Yes, scanning a leaf photo is free. We may introduce optional paid plans for heavy or commercial use in the future.</p>
          </details>
          <details className="faq-item">
            <summary>How accurate is the diagnosis?</summary>
            <p>FarmVision AI gives a strong AI-based reading of your photo, not a certified lab diagnosis. For high-stakes decisions, we recommend confirming with a licensed agronomist.</p>
          </details>
          <details className="faq-item">
            <summary>Which crops does it support?</summary>
            <p>The scanner works on most common crop leaves — maize, tomatoes, beans, potatoes, and many others. Accuracy is best with a clear, well-lit photo of a single leaf.</p>
          </details>
          <details className="faq-item">
            <summary>Do I need an account to use it?</summary>
            <p>No — you can scan a leaf right away with no sign-up. Accounts and scan history are planned for a future update.</p>
          </details>
          <details className="faq-item">
            <summary>Is my photo stored or shared?</summary>
            <p>Your photo is sent securely to run the diagnosis and is not stored or shared beyond what's needed to generate your result.</p>
          </details>
          <details className="faq-item">
            <summary>How do I get in touch?</summary>
            <p>Use the contact form below, or reach out directly — we'd love to hear from you.</p>
          </details>
        </div>
      </section>

      <section className="contact" id="contact">
        <h2>Contact</h2>
        <p className="contact-lede">Have a question or want to work with us? Send a message.</p>
        <form className="contact-form" onSubmit={handleContactSubmit}>
          <label className="contact-label">
            Name
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
              className="contact-input"
              placeholder="Your name"
            />
          </label>
          <label className="contact-label">
            Email
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              className="contact-input"
              placeholder="you@example.com"
            />
          </label>
          <label className="contact-label">
            Message
            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              required
              className="contact-textarea"
              placeholder="How can we help?"
              rows={5}
            />
          </label>
          <button type="submit" className="btn-primary">
            Send message
          </button>
        </form>
      </section>

      <footer className="footer">
        <div className="wordmark small">
          <LeafMark size={20} />
          <span>FarmVision AI</span>
        </div>
        <p>A diagnostic demo. Not a substitute for a licensed agronomist.</p>
      </footer>
    </div>
  );
}

const css = `
:root{
  --ink:#24301F;
  --parchment:#EFE9D8;
  --card:#E3DBC3;
  --line:#C9BE9E;
  --leaf:#4A6B3A;
  --ochre:#B8863B;
  --rust:#8C3B2A;
}
*{box-sizing:border-box;}
html,body,#root{margin:0;background:var(--parchment);font-family:'Work Sans',sans-serif;}
.nav{position:sticky;top:0;z-index:20;background:rgba(239,233,216,0.92);backdrop-filter:blur(6px);border-bottom:1px solid var(--line);}
.nav-inner{max-width:1100px;margin:0 auto;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;}
.wordmark{display:flex;align-items:center;gap:10px;font-family:'Roboto Slab',serif;font-weight:700;font-size:19px;color:var(--ink);}
.wordmark.small{font-size:15px;}
.nav-links{display:flex;gap:28px;}
.nav-links a{color:var(--ink);text-decoration:none;font-size:14px;font-weight:500;letter-spacing:0.02em;}
.nav-links a:hover{color:var(--leaf);}

.hero{max-width:1100px;margin:0 auto;padding:56px 24px 40px;display:grid;grid-template-columns:1fr;gap:40px;background:var(--parchment);color:var(--ink);}
@media(min-width:860px){.hero{grid-template-columns:1fr 1fr;align-items:start;padding-top:72px;}}

.eyebrow{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:var(--leaf);margin:0 0 14px;}
.hero h1{font-family:'Roboto Slab',serif;font-size:clamp(28px,4vw,42px);line-height:1.15;margin:0 0 18px;color:var(--ink);}
.lede{font-size:16px;line-height:1.6;color:#3D4A34;max-width:44ch;}

.scanner-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:0 10px 30px rgba(36,48,31,0.12);}
.scanner-head{display:flex;align-items:center;gap:8px;margin-bottom:14px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.1em;color:#5B6650;}
.dot{width:8px;height:8px;border-radius:50%;background:var(--leaf);}
.scanner-title{flex:1;}
.scanner-id{color:#8B8A72;}

.dropzone{position:relative;border:1.5px dashed var(--line);border-radius:10px;min-height:260px;display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;background:#F4EFE0;transition:border-color .15s ease, background .15s ease;}
.dropzone.drag{border-color:var(--leaf);background:#EAE8D3;}
.dropzone.has-image{cursor:default;}
.dz-empty{text-align:center;padding:24px;}
.dz-icon{display:flex;justify-content:center;margin-bottom:10px;opacity:0.8;}
.dz-title{font-family:'Roboto Slab',serif;font-weight:600;color:var(--ink);margin:0 0 4px;}
.dz-sub{font-size:13px;color:#75705C;margin:0;}
.dz-image-wrap{position:relative;width:100%;height:260px;}
.dz-image{width:100%;height:100%;object-fit:cover;display:block;}

.scan-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(74,107,58,0.18) 1px, transparent 1px),linear-gradient(90deg, rgba(74,107,58,0.18) 1px, transparent 1px);background-size:24px 24px;pointer-events:none;}
.scan-beam{position:absolute;left:0;right:0;height:56px;background:linear-gradient(to bottom, rgba(184,134,59,0) 0%, rgba(184,134,59,0.55) 50%, rgba(184,134,59,0) 100%);animation:sweep 1.6s linear infinite;pointer-events:none;}
@keyframes sweep{0%{top:-56px;}100%{top:260px;}}

.scanner-controls{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;}
.btn-primary{background:var(--leaf);color:#F4EFE0;border:none;border-radius:8px;padding:11px 18px;font-family:'Work Sans',sans-serif;font-weight:600;font-size:14px;cursor:pointer;transition:filter .15s ease;}
.btn-primary:hover{filter:brightness(1.08);}
.btn-primary:disabled{opacity:0.65;cursor:default;}
.btn-ghost{background:transparent;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:11px 16px;font-family:'Work Sans',sans-serif;font-size:14px;cursor:pointer;}
.btn-ghost:hover{border-color:var(--ink);}
.err-text{color:var(--rust);font-size:13px;margin-top:10px;}

.report{position:relative;margin-top:18px;background:#F7F3E6;border:1px solid var(--line);border-radius:0 0 10px 10px;padding:18px 16px 16px;font-family:'IBM Plex Mono',monospace;}
.report-tear{position:absolute;top:-9px;left:0;right:0;height:9px;background-image:radial-gradient(circle at 6px 0, transparent 5px, #F7F3E6 5px);background-size:12px 9px;}
.report-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:13px;}
.report-head{justify-content:space-between;border-bottom:1px dashed var(--line);padding-bottom:10px;margin-bottom:12px;}
.mono-label{color:#7A755F;letter-spacing:0.08em;font-size:11px;min-width:92px;}
.mono-val{color:var(--ink);font-weight:600;}
.mono-val.small{min-width:36px;text-align:right;}
.status-pill{color:#F7F3E6;padding:4px 10px;border-radius:20px;font-size:11px;letter-spacing:0.06em;}
.conf-bar{flex:1;height:6px;background:var(--line);border-radius:4px;overflow:hidden;}
.conf-fill{height:100%;background:var(--ochre);}
.obs-list{margin:6px 0 14px;padding-left:18px;font-family:'Work Sans',sans-serif;font-size:13.5px;color:#3D4A34;line-height:1.6;}
.rec-box{background:#EAE3CB;border-radius:8px;padding:12px;}
.rec-box p{font-family:'Work Sans',sans-serif;font-size:13.5px;color:var(--ink);margin:6px 0 0;line-height:1.55;}

.how{max-width:1100px;margin:0 auto;padding:60px 24px;border-top:1px solid var(--line);}
.how h2{font-family:'Roboto Slab',serif;font-size:26px;color:var(--ink);margin:0 0 28px;}
.steps{display:grid;gap:28px;grid-template-columns:1fr;}
@media(min-width:760px){.steps{grid-template-columns:repeat(3,1fr);}}
.step-num{font-family:'IBM Plex Mono',monospace;color:var(--ochre);font-size:13px;letter-spacing:0.08em;}
.step h3{font-family:'Roboto Slab',serif;font-size:19px;margin:6px 0 8px;color:var(--ink);}
.step p{font-size:14px;line-height:1.6;color:#4C5642;margin:0;max-width:32ch;}

.stats{max-width:1100px;margin:0 auto;padding:10px 24px 60px;display:grid;gap:24px;grid-template-columns:1fr;}
@media(min-width:760px){.stats{grid-template-columns:repeat(3,1fr);}}
.stat{border-left:2px solid var(--leaf);padding-left:16px;}
.stat-num{display:block;font-family:'Roboto Slab',serif;font-size:32px;color:var(--ink);}
.stat-label{font-size:13px;color:#5B6650;}

.team{max-width:1100px;margin:0 auto;padding:10px 24px 64px;border-top:1px solid var(--line);padding-top:56px;}
.team h2{font-family:'Roboto Slab',serif;font-size:26px;color:var(--ink);margin:0 0 28px;}
.team-grid{display:grid;gap:20px;grid-template-columns:1fr;}
@media(min-width:640px){.team-grid{grid-template-columns:repeat(2,1fr);max-width:520px;}}
.team-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:22px;}
.team-avatar{width:48px;height:48px;border-radius:50%;background:var(--leaf);color:#F4EFE0;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:14px;letter-spacing:0.04em;margin-bottom:14px;}
.team-card h3{font-family:'Roboto Slab',serif;font-size:17px;color:var(--ink);margin:0 0 4px;}
.team-role{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.04em;color:var(--ochre);margin:0;}

.faq{max-width:1100px;margin:0 auto;padding:10px 24px 64px;border-top:1px solid var(--line);padding-top:56px;}
.faq h2{font-family:'Roboto Slab',serif;font-size:26px;color:var(--ink);margin:0 0 24px;}
.faq-list{display:flex;flex-direction:column;gap:10px;max-width:600px;}
.faq-item{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;}
.faq-item summary{font-family:'Roboto Slab',serif;font-weight:600;font-size:15px;color:var(--ink);cursor:pointer;list-style:none;}
.faq-item summary::-webkit-details-marker{display:none;}
.faq-item summary::before{content:'+';display:inline-block;width:16px;color:var(--leaf);font-weight:700;}
.faq-item[open] summary::before{content:'–';}
.faq-item p{font-size:13.5px;color:#4C5642;line-height:1.6;margin:10px 0 2px 16px;}

.contact{max-width:1100px;margin:0 auto;padding:10px 24px 64px;border-top:1px solid var(--line);padding-top:56px;}
.contact h2{font-family:'Roboto Slab',serif;font-size:26px;color:var(--ink);margin:0 0 10px;}
.contact-lede{font-size:14px;color:#4C5642;margin:0 0 24px;max-width:44ch;}
.contact-form{display:flex;flex-direction:column;gap:16px;max-width:440px;}
.contact-label{display:flex;flex-direction:column;gap:6px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:0.06em;color:#5B6650;text-transform:uppercase;}
.contact-input,.contact-textarea{font-family:'Work Sans',sans-serif;font-size:14px;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 12px;resize:vertical;}
.contact-input:focus,.contact-textarea:focus{outline:none;border-color:var(--leaf);}
.contact-form .btn-primary{align-self:flex-start;}

.footer{border-top:1px solid var(--line);padding:24px;display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center;color:#6B664F;font-size:12.5px;}
`;
          .
