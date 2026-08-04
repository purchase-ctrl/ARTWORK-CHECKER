# Artwork QC

A single-page tool to check packaging artwork against the mandatory checklist
(batch no., MRP wording, expiry format, Mfd. By statement, M.L. No., Marketed
By, customer care details, net content, EAN code, blank batch area), catch
spelling/grammar issues via Claude, print the compliance report, and measure
any area of the artwork in mm / cm / inch. Accepts PNG/JPG/WEBP and PDF.

`index.html` is the static frontend. `api/analyze.js` is a small serverless
function that holds your Anthropic API key and proxies the vision request —
the frontend never sees the key.

## Deploy

1. Push this whole folder (including `api/`, `package.json`, `vercel.json`) to a GitHub repo.
2. Import that repo in Vercel → Framework preset: **Other** → Deploy.
3. In Vercel → your project → **Settings → Environment Variables**, add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your key from https://console.anthropic.com/settings/keys
4. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the function picks up the new variable.

That's it — the compliance check will call `/api/analyze` on your own domain,
which forwards to Anthropic using the server-side key.

