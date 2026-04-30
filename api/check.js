export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { system, user } = req.body;
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured on server" });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://reacture.app",   // your site URL
      "X-Title": "Reacture",                    // your app name
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      max_tokens: 300,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user   },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(500).json({ error: data?.error?.message || "OpenRouter error" });
  }

  // ✅ Map to shape your compiler expects: { text: "PASS: ..." }
  const text = data?.choices?.[0]?.message?.content || "";
  return res.status(200).json({ text });
}
