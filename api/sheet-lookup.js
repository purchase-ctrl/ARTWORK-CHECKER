const { JWT } = require("google-auth-library");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const range = process.env.GOOGLE_SHEET_RANGE || "Sheet1";
  const codeColumnOverride = process.env.GOOGLE_SHEET_CODE_COLUMN; // optional exact header name

  if (!email || !rawKey || !sheetId) {
    res.status(500).json({
      error:
        "Server is missing Google Sheets credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_SHEET_ID in Vercel → Project → Settings → Environment Variables, then redeploy."
    });
    return;
  }

  try {
    const { formulationCode } = req.body || {};
    if (!formulationCode) {
      res.status(400).json({ error: "Missing formulationCode in request body." });
      return;
    }

    const key = rawKey.replace(/\\n/g, "\n");
    const client = new JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
    const sheetRes = await client.request({ url });
    const rows = sheetRes.data.values;

    if (!rows || !rows.length) {
      res.status(404).json({ error: "The spreadsheet range returned no data. Check GOOGLE_SHEET_RANGE." });
      return;
    }

    const headers = rows[0].map(h => (h || "").trim());
    const headersLower = headers.map(h => h.toLowerCase());

    let codeColIdx = -1;
    if (codeColumnOverride) {
      codeColIdx = headersLower.indexOf(codeColumnOverride.trim().toLowerCase());
    }
    if (codeColIdx === -1) {
      codeColIdx = headersLower.findIndex(h => h.includes("formulation") || h.includes("code"));
    }
    if (codeColIdx === -1) {
      res.status(500).json({
        error:
          "Could not find a formulation code column in the sheet's header row. Set GOOGLE_SHEET_CODE_COLUMN to the exact header name."
      });
      return;
    }

    const target = formulationCode.trim().toLowerCase();
    const matchRow = rows.slice(1).find(r => ((r[codeColIdx] || "").trim().toLowerCase()) === target);

    if (!matchRow) {
      res.status(404).json({ error: `No row found for formulation code "${formulationCode}".` });
      return;
    }

    const record = {};
    headers.forEach((h, i) => {
      if (h) record[h] = matchRow[i] || "";
    });

    res.status(200).json({ record });
  } catch (err) {
    res.status(500).json({ error: err.message || "Spreadsheet lookup failed." });
  }
};
