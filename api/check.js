// api/check.js
// Vercel serverless function — replaces proxy-server.js
// Vercel automatically loads environment variables from your dashboard

export default async function handler(req, res) {
  // Allow requests from anywhere (your Flutter WebView)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { system, user } = req.body;

  if (!system || !user) {
    return res.status(400).json({ error: "Missing system or user prompt" });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured on server" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    res.status(200).json({ text });

  } catch (err) {
    console.error("Handler error:", err);
    res.status(500).json({ error: err.message });
  }
}