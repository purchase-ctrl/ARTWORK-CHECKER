# Artwork QC

A single-page tool to check packaging artwork against the mandatory checklist
(batch no., MRP wording, expiry format, Mfd. By statement, M.L. No., Marketed
By, customer care details, net content, EAN code, blank batch area), catch
spelling/grammar issues via Claude, print the compliance report, and measure
any area of the artwork in mm / cm / inch.

No build step — it's a single static `index.html`.

## Deploy

1. Push this folder to a new GitHub repo.
2. Import that repo in Vercel → Framework preset: **Other** → Deploy.

That's it. Vercel will serve `index.html` as-is.
