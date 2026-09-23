module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Add it in Vercel → Project → Settings → Environment Variables, then redeploy." });
    return;
  }

  try {
    const { imageA, imageB, prompt } = req.body || {};
    if (!imageA || !imageB || !prompt) {
      res.status(400).json({ error: "Missing imageA, imageB, or prompt in request body." });
      return;
    }

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: imageA.mediaType, data: imageA.base64 } },
              { inline_data: { mime_type: imageB.mediaType, data: imageB.base64 } },
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 4000,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      res.status(geminiRes.status).json({ error: data.error ? data.error.message : "Gemini API request failed." });
      return;
    }

    const candidate = data.candidates && data.candidates[0];
    if (!candidate) {
      res.status(200).json({ error: "Gemini returned no result — one of the images may have been blocked by a safety filter, or the request failed silently." });
      return;
    }

    if (candidate.finishReason === "MAX_TOKENS") {
      res.status(200).json({
        error: "The comparison found more to report than fit in one response and got cut off. Try again."
      });
      return;
    }

    const text = ((candidate.content && candidate.content.parts) || []).map(p => p.text || "").join("");

    res.status(200).json({ content: [{ type: "text", text }] });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unexpected server error." });
  }
};
