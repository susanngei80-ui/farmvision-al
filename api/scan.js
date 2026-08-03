// This runs on the server (Vercel), never in the browser.
// Your GEMINI_API_KEY stays here and is never exposed to visitors.

// --- Very basic in-memory rate limiting ---
// Good enough to stop casual abuse while you're small. It resets whenever
// the serverless function "cold starts" and doesn't share state across
// regions, so it is NOT a strong guarantee. For real protection at scale,
// swap this for a shared store like Upstash Redis (a few lines of change).
const requestLog = new Map(); // ip -> [timestamps]
const MAX_REQUESTS = 8;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > MAX_REQUESTS;
}

const SYSTEM_PROMPT = `You are the diagnostic engine behind FarmVision AI, a crop leaf-scanning tool. You will be shown a photo that is meant to be a plant leaf. Respond ONLY with valid JSON — no markdown fences, no preamble, no commentary outside the JSON object.

Schema:
{
  "crop": string,            // best guess at the plant/crop, or "Unclear" if not identifiable
  "condition": string,       // short name of the condition, e.g. "Early blight" or "No disease detected"
  "status": "healthy" | "attention" | "critical",
  "confidence": number,      // 0-100
  "observations": string[],  // exactly 3 short plain-language observations about what's visible
  "recommendation": string   // one short, practical next step
}

If the image is not a plant or leaf, set crop to "Unclear", status to "attention", explain in observations that no plant material was detected, and keep confidence low.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many scans from this device. Please try again later." });
    return;
  }

  const { mediaType, base64 } = req.body || {};

  if (!mediaType || !base64) {
    res.status(400).json({ error: "Missing image data." });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: "Server is missing an API key. Set GEMINI_API_KEY in your deployment settings." });
    return;
  }

  try {
    const model = "gemini-3.6-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SYSTEM_PROMPT + "\n\nAnalyze this leaf photo and return the diagnostic JSON." },
                { inline_data: { mime_type: mediaType, data: base64 } },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      res.status(502).json({ error: "The scan service is temporarily unavailable." });
      return;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || "";
    const cleaned = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse model output:", text);
      res.status(502).json({ error: "Couldn't read the scan result. Please try again." });
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error("Scan handler error:", err);
    res.status(500).json({ error: "Something went wrong running the scan." });
  }
    }
