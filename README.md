# Artwork QC

A single-page tool to check packaging artwork against the mandatory checklist
(batch no., MRP wording, expiry format, Mfd. By statement, M.L. No., Marketed
By, customer care details, net content, EAN code, blank batch area), catch
spelling/grammar issues via Claude, cross-check ingredients & shelf life
against a private Google Sheet by formulation code, print the compliance
report, and measure any area of the artwork in mm / cm / inch. Accepts
PNG/JPG/WEBP and PDF.

`index.html` is the static frontend. `api/analyze.js` proxies the vision
check to Anthropic. `api/sheet-lookup.js` calls a small script living inside
your own Google Sheet (see below) to fetch one row by formulation code — no
Google Cloud project or service account needed.

## Deploy

1. Push this whole folder (including `api/`, `package.json`, `vercel.json`) to a GitHub repo.
2. Import that repo in Vercel → Framework preset: **Other** → Deploy.
3. In Vercel → your project → **Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` — from https://console.anthropic.com/settings/keys
   - `GOOGLE_SHEET_WEBAPP_URL` — see setup below
   - `SHEET_SHARED_SECRET` — the same secret you set in the Apps Script below
4. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so the functions pick up the new variables.

### Google Sheet setup (no service account — just Apps Script)

1. Open your Google Sheet.
2. **Extensions → Apps Script**.
3. Delete anything in the editor, and paste in the contents of `google-apps-script.gs` from this folder.
4. At the top of the script, change `SECRET` to a password of your own choosing (any random string — this is what keeps the URL private). If your tab isn't named "Sheet1", also update `SHEET_NAME`.
5. **Deploy → New deployment** → click the gear icon → choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, authorize it when Google asks (it's your own script on your own sheet), then copy the **Web app URL** it gives you.
7. In Vercel, set:
   - `GOOGLE_SHEET_WEBAPP_URL` = that Web app URL
   - `SHEET_SHARED_SECRET` = the same `SECRET` value you set in step 4
8. Make sure your sheet has a header row with a column containing "formulation" or "code" in its name (e.g. "Formulation Code"), plus whatever columns hold ingredients/INCI list and shelf life — those don't need exact names, the tool sends the whole matched row to Claude and lets it figure out which fields are relevant.

Note on privacy: "Who has access: Anyone" means the URL itself isn't
access-restricted by Google — but nobody can get real data back from it
without knowing your `SECRET`, and the URL is never shown anywhere public.
It's a reasonable private-in-practice setup for internal tools like this one,
though not as strong as an official service account. If you want the fuller
Google Cloud service-account version instead, just ask.

That's it — the compliance check calls `/api/analyze` and, when a formulation
code is entered, `/api/sheet-lookup` first, both on your own domain.
