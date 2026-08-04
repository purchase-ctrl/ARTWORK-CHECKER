module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY. Add it in Vercel → Project → Settings → Environment Variables, then redeploy." });
    return;
  }

  try {
    const { imageBase64, mediaType, prompt } = req.body || {};
    if (!imageBase64 || !mediaType || !prompt) {
      res.status(400).json({ error: "Missing imageBase64, mediaType, or prompt in request body." });
      return;
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1800,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
              { type: "text", text: prompt }
            ]
          }
        ]
      })
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      res.status(anthropicRes.status).json({ error: data.error ? data.error.message : "Anthropic API request failed." });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unexpected server error." });
  }
};
