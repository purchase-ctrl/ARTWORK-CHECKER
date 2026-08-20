module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const webAppUrl = process.env.GOOGLE_SHEET_WEBAPP_URL;
  const secret = process.env.SHEET_SHARED_SECRET;

  if (!webAppUrl || !secret) {
    res.status(500).json({
      error:
        "Server is missing GOOGLE_SHEET_WEBAPP_URL or SHEET_SHARED_SECRET. Set them in Vercel → Project → Settings → Environment Variables, then redeploy."
    });
    return;
  }

  try {
    const url = webAppUrl + "?secret=" + encodeURIComponent(secret) + "&action=ingredients";
    const sheetRes = await fetch(url, { redirect: "follow" });
    const data = await sheetRes.json();

    if (data.error) {
      res.status(404).json({ error: data.error });
      return;
    }

    res.status(200).json({ ingredients: data.ingredients || [] });
  } catch (err) {
    res.status(500).json({ error: err.message || "Ingredient list lookup failed." });
  }
};
