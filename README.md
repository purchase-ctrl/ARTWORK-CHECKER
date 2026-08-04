# Artwork QC

A single-page tool to check packaging artwork against the mandatory checklist
(batch no., MRP wording, expiry format, Mfd. By statement, M.L. No., Marketed
By, customer care details, net content, EAN code, blank batch area), catch
spelling/grammar issues via Claude, print the compliance report, and measure
any area of the artwork in mm / cm / inch. Accepts PNG/JPG/WEBP and PDF.

`index.html` is the static frontend. `api/analyze.js` proxies the vision/compliance
check to Anthropic. `api/sheet-lookup.js` securely reads one row from a private
Google Sheet (matched by formulation code) so ingredients and shelf life can be
cross-checked against the artwork.

## Deploy

1. Push this whole folder (including `api/`, `package.json`, `vercel.json`) to a GitHub repo.
2. Import that repo in Vercel → Framework preset: **Other** → Deploy.
3. In Vercel → your project → **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` — from https://console.anthropic.com/settings/keys
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — see setup below
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — see setup below
   - `GOOGLE_SHEET_ID` — the long ID in your sheet's URL, e.g. for
     `https://docs.google.com/spreadsheets/d/1AbC.../edit` the ID is `1AbC...`
   - `GOOGLE_SHEET_RANGE` — optional, the tab name to read (defaults to `Sheet1`)
   - `GOOGLE_SHEET_CODE_COLUMN` — optional, exact header text of your formulation
     code column, only needed if the automatic guess doesn't find it
4. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the functions pick up the new variables.

### One-time Google Sheets setup (private sheet, no OAuth login needed)

1. Go to https://console.cloud.google.com → create a project (or use an existing one).
2. **APIs & Services → Library** → search "Google Sheets API" → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → Service account** → give it any name → Create and continue → Done (no roles needed).
4. Open the new service account → **Keys** tab → **Add Key → Create new key → JSON** → downloads a `.json` file.
5. Open that JSON file:
   - `client_email` → this is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → this is your `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (paste it exactly as-is, including the `\n` characters and `-----BEGIN PRIVATE KEY-----` lines, into the Vercel env var value box)
6. Open your actual Google Sheet → **Share** → paste in the `client_email` address from step 5 → give it **Viewer** access → Send. (This is what lets the service account read it — the sheet stays private to everyone else.)
7. Make sure your sheet has a header row with a column for the formulation code (something with "formulation" or "code" in the name — e.g. "Formulation Code") plus whatever columns hold your ingredients/INCI list and shelf life. Column names don't need to match anything exact — the tool sends the whole matched row to Claude and lets it figure out which fields are the ingredients and shelf life.

That's it — the compliance check will call `/api/analyze` and, when a formulation
code is entered, `/api/sheet-lookup` first, both on your own domain.

