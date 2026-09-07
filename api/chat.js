// This runs on the server (Vercel), same pattern as scan.js
const requestLog = new Map();
const MAX_REQUESTS = 15;
const WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > MAX_REQUESTS;
}

const SYSTEM_PROMPT = `You are the FarmVision AI assistant. You help smallholder farmers with
practical crop, pest, and disease questions in plain, simple language. Keep answers short
(3-5 sentences), practical, and specific to what a farmer can actually do. If asked about a
prior scan result, use the context provided. If you don't know something, say so honestly
rather than guessing. Avoid recommending specific chemical products by brand name.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests. Please wait a bit and try again." });
    return;
  }

  const { message, history } = req.body || {};

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: "Server not configured" });
    return;
  }

  try {
    const model = "gemini-3.6-flash";

    const contents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Understood. I'm ready to help farmers with practical advice." }] },
      ...(Array.isArray(history) ? history : []).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "Gemini request failed");
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a reply.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
    }
