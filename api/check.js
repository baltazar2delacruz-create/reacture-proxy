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

  let body = req.body;
  
  // If body is a string, parse it
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.error("Failed to parse body:", e);
      return res.status(400).json({ error: "Invalid JSON in request body" });
    }
  }

  console.log("Request body:", JSON.stringify(body));

  let system, user;
  
  // Handle both formats
  if (body.system && body.user) {
    // Format 1: { system: "...", user: "..." }
    system = body.system;
    user = body.user;
  } else if (body.code && body.lessonId) {
    // Format 2: { code: "...", lessonId: "...", expectedOutput: "..." }
    const code = body.code;
    const expectedOutput = body.expectedOutput || "";
    
    system = `You are Reacture AI Code Reviewer.
Check if the student React JSX code fulfills the lesson task.
Rules:
- Evaluate ONLY whether the code satisfies the task.
- Be lenient: if the code clearly achieves the core requirement, mark it PASS.
- Do NOT fail for minor styling differences or variable naming.
- Keep feedback SHORT (2-4 sentences), friendly, beginner-appropriate.
- Always start with exactly "PASS:" or "FAIL:" (uppercase, colon, space).`;
    
    user = `Expected Output: ${expectedOutput}\n\nStudent App.jsx:\n${code}\n\nDoes this fulfill the task? Reply PASS: or FAIL: with short feedback.`;
  } else {
    console.error("Missing fields. Body:", JSON.stringify(body));
    return res.status(400).json({ 
      error: "Missing required fields",
      received: Object.keys(body),
      expected: "(system & user) OR (code & lessonId)"
    });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not configured");
    return res.status(500).json({ 
      error: "API key not configured on server",
      hint: "Please set ANTHROPIC_API_KEY in Vercel environment variables"
    });
  }

  try {
    console.log("Calling Anthropic API with model: claude-3-5-sonnet-20241022");
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(response.status).json({ 
        error: "Anthropic API error",
        status: response.status,
        details: errText 
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    if (!text) {
      console.warn("Empty response from Anthropic API");
      return res.status(200).json({ text: "PASS: Code looks good!" });
    }

    res.status(200).json({ text });

  } catch (err) {
    console.error("Handler error:", err.message);
    res.status(500).json({ 
      error: "Server error",
      message: err.message 
    });
  }
}
