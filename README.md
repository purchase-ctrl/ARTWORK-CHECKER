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

## Ingredient spelling check (optional)

The compliance check can also flag misspelled ingredients against a master
list you control — no live API needed.

1. In the same Google Sheet, add a new tab named exactly **Approved Ingredients**.
2. Put one ingredient/INCI name per row in column A. A header in row 1 (e.g. "INCI Name") is fine and gets skipped automatically.
3. To seed this list with the official EU standard: go to the European
   Commission's CosIng database (search "EU CosIng database" — it's the
   official, free source INCI names come from), use its "download a specific
   list" / export option to get the ingredient names, and paste that column
   into your "Approved Ingredients" tab. You can also just add your own
   ingredients by hand — the tab is entirely yours to maintain.
4. Redeploy the Apps Script (Deploy → Manage deployments → ✏️ → New version →
   Deploy) so it picks up the new `action=ingredients` support — this file
   already includes it, you just need the sheet tab to exist.

No other setup needed — the same `GOOGLE_SHEET_WEBAPP_URL` and
`SHEET_SHARED_SECRET` env vars already in Vercel cover this too. Every
compliance check will now also compare the printed ingredient list against
this tab, flagging anything that doesn't match closely (with the closest
correct spelling suggested) — in addition to the per-formulation ingredient
check that runs when a formulation code is entered.

## Marketed By address verification (optional)

The compliance check can also verify the printed "Marketed By" address is a
real address, using Google's Geocoding API — a separate setup from the
Sheets connection above.

1. Go to https://console.cloud.google.com (same or different project as before — doesn't matter).
2. **APIs & Services → Library** → search "Geocoding API" → **Enable**.
3. Billing must be enabled on the project for this API (Google requires a
   billing account even though there's a free monthly credit covering
   roughly 40,000 lookups — far more than a label-checking tool will use).
   **Billing → Link a billing account**, add a card if you don't have one linked yet.
4. **APIs & Services → Credentials → Create Credentials → API key**.
5. Click into the new key → **Restrict key** → under "API restrictions" choose
   **Restrict key** and select only **Geocoding API** (keeps the key safe
   even though it lives server-side).
6. In Vercel → Settings → Environment Variables, add:
   - `GOOGLE_MAPS_API_KEY` = the key you just created
7. Redeploy.

Every compliance check now transcribes the Marketed By address and checks it
against Google Maps, adding a row to the checklist table:
- **PASS** — the exact address was found (rooftop-level match).
- **UNCLEAR** — Google only matched the general area (e.g. the city), not
  the specific address — worth a manual look.
- **FAIL** — Google couldn't find the address at all.

## Compare Artworks (tab 03)

Upload a previous and a new version of the same artwork and it will:
- Compare exact physical size (only possible when both files are PDFs, since
  only PDFs carry real physical dimensions — a plain image comparison shows
  a note explaining this instead of a false measurement).
- Compare all printed content (checklist fields, ingredients, any other
  text) and list every difference found, labeled added / removed / modified.

No extra setup needed — it reuses `ANTHROPIC_API_KEY` via a new
`api/compare.js` endpoint. Multi-page PDFs use page 1 for comparison.
