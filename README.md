# Hoff Parquet CRM — hosted version

This version adds the **Settings page** — editing your letterhead, logo, VAT
details, and bank details for invoices, all from the app itself instead of
only being set by the database defaults.

**No database migration needed for this update** — just re-upload the files
to GitHub (Step 2 in the instructions further down) and Vercel redeploys
automatically. The settings row already exists from the first setup; this
just adds a screen to edit it.

Order sheets and the product catalog + margins are still not in this version
yet — next up, whenever you're ready.

---

## If you already deployed the first phase

You only need to do one thing: run the migration.

1. Open your Neon project's **SQL Editor**.
2. Copy the contents of `migration-2-invoices.sql` from this folder and paste it in.
3. Click **Run**. This adds the `invoices` table and a couple of new settings fields, without touching anything you already have.
4. Upload the changed and new files to your GitHub repo (Step 2 below) and Vercel will redeploy automatically.

## If you're setting this up fresh

Follow all the steps below in order — `schema.sql` already includes everything, including invoices, so you don't need the migration file separately.

---

## Step 1 — Set up the database in Neon

1. Go to your Neon dashboard and open your project.
2. Find the **SQL Editor** in the left-hand menu.
3. Open `schema.sql` from this folder, copy its entire contents, and paste it into the Neon SQL Editor.
4. Click **Run**. You should see tables appear (`clients`, `notes`, `quotes`, `invoices`, `app_settings`).
5. From your Neon project's dashboard, copy the **Connection string** (looks like `postgresql://user:password@host/dbname?sslmode=require`) — you'll need it in Step 3.

## Step 2 — Put this project on GitHub

1. Go to github.com and click **New repository**. Name it something like `hoff-parquet-crm`. Keep it **Private**.
2. On the empty repository page, click **uploading an existing file**.
3. Drag every file and folder from this project into the upload box. GitHub preserves the folder structure.
4. Click **Commit changes**.

If you're updating an existing repo rather than starting fresh, just drag in the changed/new files the same way — GitHub will ask if you want to replace the existing ones; say yes.

## Step 3 — Deploy on Vercel

1. Go to vercel.com, click **Add New → Project**, and import your `hoff-parquet-crm` repo.
2. Add the three environment variables before deploying:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the connection string from Neon |
   | `WORKSPACE_PASSWORD` | any password for your team to log in with |
   | `SESSION_SECRET` | any long random text |

3. Click **Deploy**.

If you're already deployed and just running the migration, you can skip straight to Step 2's upload — Vercel redeploys automatically from GitHub, no need to touch environment variables again.

## Step 4 — Try it

Log in, open a client, create a quote, mark it sent, then use **"Draft products invoice from this"** to see the quote-to-invoice flow. Try marking an invoice paid and check it shows up correctly.

---

## If something goes wrong

- **"Application error" on the site** — check environment variables first (Step 3), then check the migration ran successfully in Neon.
- **Invoices section shows an error / won't load** — almost always means the migration wasn't run yet. Go back to Neon and run `migration-2-invoices.sql`.
- **Login page won't accept the password** — check for extra spaces in `WORKSPACE_PASSWORD` in Vercel.

## Sharing it with your team

Same as before — give your team the Vercel URL and the workspace password.

## What's next

Order sheets, and the product catalog (with retail/B2B pricing) plus the margins
view — tell me when you're ready and I'll build the next one.

