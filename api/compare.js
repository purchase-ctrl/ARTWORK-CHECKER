function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

async function callGeminiWithRetry(url, body, maxAttempts) {
  let lastRes, lastData;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await geminiRes.json();

    const isOverloaded = geminiRes.status === 503 ||
      (data.error && /overloaded|high demand|try again/i.test(data.error.message || ""));

    if (geminiRes.ok || !isOverloaded || attempt === maxAttempts) {
      return { geminiRes, data };
    }

    lastRes = geminiRes; lastData = data;
    await sleep(attempt * 1500);
  }
  return { geminiRes: lastRes, data: lastData };
}

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

    const model = "gemini-3.6-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const { geminiRes, data } = await callGeminiWithRetry(url, {
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
    }, 3);

    if (!geminiRes.ok) {
      const message = data.error ? data.error.message : "Gemini API request failed.";
      const friendly = /overloaded|high demand/i.test(message)
        ? "Gemini's free tier is under heavy demand right now, even after a few automatic retries. Please wait a minute and try again."
        : message;
      res.status(geminiRes.status).json({ error: friendly });
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
