# Hoff Parquet CRM — hosted version

**New: automatic client creation from Weebly sample orders.** When someone
orders samples through your Weebly store checkout, this can now create a
client in your CRM automatically — name, address, contact details, and a
note listing which samples were ordered — with no one at Hoff Parquet
needing to type anything in. This uses a free no-code tool called
**Zapier** to connect Weebly's checkout to the CRM; nothing to install,
no coding.

**Two things to do:**
1. Add one new environment variable in Vercel: `SAMPLE_ORDER_SECRET` (any
   long random text you make up — same idea as `SESSION_SECRET`). Then
   re-upload the project files to GitHub as usual.
2. Set up the Zapier automation — see the full walkthrough in the chat
   where this was built, since the exact field names depend on your own
   Square/Weebly account and are easiest to follow live rather than from
   a static file.

**Only new orders are ever affected** — Zapier automations only react to
things that happen *after* you turn them on; there's no way for it to
"discover" and process old orders, so nothing needs to be done to exclude
historical orders — turning the Zap on tomorrow (or whenever you finish
setting it up) naturally means only orders from that point on create
anything in the CRM.

---

**New: "Download PDF" button on quotes, invoices, and order sheets.** This
generates a real PDF file directly in the browser and downloads it —
completely bypassing the browser's print dialog, so none of Chrome's own
header/footer (URL, date, page number) ever appears, and the file is named
correctly every time (e.g. "Quotation HP-Q-0002.pdf"). The old Print button
is still there as a secondary option for anyone who wants to print on
paper, but Download PDF is now the primary, recommended way to get a copy.

**No database migration needed** — just re-upload the files to GitHub.
Two new dependencies (`jspdf`, `html2canvas`) get installed automatically
by Vercel during the next deploy — nothing for you to do beyond the normal
upload.

---

**New: public enquiry form.** A standalone page at `/enquiry` that anyone
can fill in — no login required — which creates a new client record
directly in your CRM, tagged as a Website Enquiry and dropped into Initial
Contact. Link or embed it from your actual website (Weebly). **No database
migration needed for this one** — just re-upload the files to GitHub.

### How to put this on your website

Once deployed, the form lives at: `https://<your-vercel-url>/enquiry`

In Weebly, either:
- Add a **button or menu link** pointing straight at that URL (simplest), or
- Use Weebly's **Embed Code** element to embed it inline on a page:
  ```html
  <iframe src="https://<your-vercel-url>/enquiry" style="width:100%; height:900px; border:none;"></iframe>
  ```

### Spam protection on the form

There's a hidden "honeypot" field real visitors never see — bots that
auto-fill every field trip it, and their submission is quietly discarded
rather than creating a fake client. This stops simple/automated spam. If
real spam gets through despite this, the next step up is a proper CAPTCHA
(Google reCAPTCHA), which needs a free API key — let me know if that
becomes necessary.

---

## Setting this up fresh (first time only)

1. **Database** — In your Neon project's SQL Editor, run these files **in
   order**:
   1. `schema.sql` (creates every table)
   2. `migration-4-products.sql` (loads the full product catalog — 16
      products, 762 priced variations). It's a big file; give it a few
      seconds.
   
   Copy the **Connection string** from your Neon dashboard — you'll need it
   next.

2. **GitHub** — Create a new **private** repository (e.g. `hoff-parquet-crm`),
   then use "uploading an existing file" to drag in every file and folder
   from this project. Click **Commit changes**. No command line needed.

3. **Vercel** — Import the repo (**Add New → Project**), and before
   deploying add these three environment variables:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the connection string from Neon |
   | `WORKSPACE_PASSWORD` | any password for your team to log in with |
   | `SESSION_SECRET` | any long random text — nobody types this, it's internal |

   Click **Deploy**.

4. **Try it** — log in, add a client, create a quote, mark it sent, draft an
   invoice from it, mark it paid. Try Print/Save as PDF and Email — both
   should work normally since this is a real website now.

---

## If you already have this running and are catching up

Run whichever of these you haven't yet, **in order**, in Neon's SQL Editor:

| File | What it adds |
|---|---|
| `migration-2-invoices.sql` | Invoices table + settings fields |
| `migration-3-order-sheets.sql` | Order sheets table |
| `migration-4-products.sql` | The full product catalog (16 products, 762 variations) |
| `migration-5-preview.sql` | *(Optional, read-only)* Preview of the materials price increase below |
| `migration-5-materials-price-increase.sql` | Applies the materials price increase |
| `migration-6-project-category.sql` | Adds the Commercial/Residential field to clients |
| `migration-7-border-brass-labour.sql` | Adds chevron/herringbone border & brass inlay labour rates (run once only) |

Then re-upload the project files to GitHub — Vercel redeploys automatically.
Skip this step for `migration-5` files — they only touch data, not code.

### About migration 5 — materials price increase

Retail prices below £60 go up **10%**; £60 and above go up **7%**. This is
per line item, so a single product can have some variations in each tier.
B2B prices are recalculated to stay exactly 15% below the new retail price.
**Cost prices are untouched** — what you pay your supplier hasn't changed.
**Labour rates are untouched** — materials only.

Run `migration-5-preview.sql` first (read-only, shows exactly what would
change) before running the real one. If your Neon plan supports branching,
create a branch first as an extra safety net — this can't be undone by
re-running it.

---

## If something goes wrong

- **"Application error" on the site** — check the three environment variables in Vercel, then confirm the relevant migration actually ran in Neon.
- **A section shows an error / won't load** — almost always a migration that hasn't been run yet. Check the table above.
- **Login page won't accept the password** — check for extra spaces in `WORKSPACE_PASSWORD` in Vercel.

## Sharing it with your team

Give your team the Vercel URL and the workspace password — everyone shares
the same login and the same data.

## What's next

Every feature from the original Claude-artifact version now exists here. If
you want something beyond that — individual staff logins, permissions, real
email sync, anything else — just ask and we'll scope it out.
