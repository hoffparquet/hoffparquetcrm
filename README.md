# Hoff Parquet CRM — hosted version

**New: "Pay by Card" on invoices, via SumUp.** Every unpaid invoice
(materials or installation) now shows a real payment link. The client
clicks it, pays on a SumUp-hosted page (card details never touch this app),
and the invoice **marks itself as paid automatically** the moment SumUp
confirms the payment — no manual step needed.

**Two things to do:**

1. Run `migration-8-sumup-payments.sql` in Neon's SQL Editor.
2. Confirm these two environment variables are set in Vercel (you should
   have already added them): `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE`.
   Then re-upload the project files to GitHub as usual.

**How it works:** the payment link on each invoice always points to your
own CRM (`/pay/<invoice id>`), not directly to SumUp. When someone clicks
it, the CRM creates a brand new SumUp payment session at that exact moment
and sends them there — this is deliberate: SumUp's payment sessions expire
after 30 minutes, so one can't be created in advance and just sit on the
invoice waiting to be used.

**Please test this properly before using it on a real client.** Create a
test invoice for a very small amount (e.g. £1), open its payment link, and
actually pay it with a real card — there's no sandbox mode active on this
integration, so this is a real transaction. Confirm the invoice flips to
"Paid" on its own within a few seconds, without you touching anything. You
can refund a test transaction from your normal SumUp dashboard afterwards.

**One realistic limitation worth knowing**: the "Pay online" link is a
real clickable link when viewing an invoice on screen, or in the "Email to
client" message. In a **downloaded PDF**, it appears as readable, correct
text, but PDFs generated this way don't support clickable links — someone
reading only the PDF would need to type or copy the link rather than click
it. Emailing the invoice (rather than sending the PDF alone) is the more
reliable path for now.

---


**New: "Add from Order" — paste a Weebly order, get a new client.** A new
page (in the sidebar) where you paste the full text of a Weebly order page
(select all, copy, paste) and it reads out the customer's name, address,
phone, email, and which samples were ordered, pre-filling a form you check
over and save. No Zapier, no PayPal Developer account, no external
accounts to set up at all — this works entirely inside the CRM using code
already built into it.

**No database migration needed, and nothing existing was touched** — this
was added as new, separate files only. Just re-upload the project files to
GitHub as usual.

**How to use it, every time a sample order comes in:**
1. Open the order in Weebly's admin
2. Click into the page and select all the text (Cmd/Ctrl+A), then copy (Cmd/Ctrl+C)
3. In the CRM, go to **Add from Order** in the sidebar, paste it in, click **"Read this order"**
4. Check the pre-filled name/email/phone/address/note look right (fix anything it missed), then click **Create client**

The new client lands in your Clients/Pipeline exactly like any other, tagged
`source: Sample Order`, with the samples they ordered saved as its first note.

This won't read every order perfectly every time — Weebly's page layout
could vary a little, or a field might land somewhere unexpected — which is
why nothing gets created automatically; you always see and can correct the
form before saving.

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
| `migration-8-sumup-payments.sql` | Adds SumUp payment tracking to invoices |

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
