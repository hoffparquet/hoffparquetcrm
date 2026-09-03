# Hoff Parquet CRM — hosted version

This is the first phase of the hosted CRM: **clients, the pipeline, and quotations**,
working end-to-end with a real database, real login, and working Print/PDF and
email — because this now runs as a normal website instead of inside Claude.

Invoices, order sheets, the product catalog, margins, and settings editing are
not in this version yet — they're the next phase, once this one is confirmed
working.

Follow these steps in order. None of them require writing code — just following
along and pasting a few things in the right boxes.

---

## Step 1 — Set up the database in Neon

1. Go to your Neon dashboard and open your project (or create a new project if you haven't yet).
2. Find the **SQL Editor** in the left-hand menu.
3. Open the file `schema.sql` from this folder, copy its entire contents, and paste it into the Neon SQL Editor.
4. Click **Run**. You should see a success message and some new tables appear (`clients`, `notes`, `quotes`, `app_settings`).
5. Go to your Neon project's main dashboard page and find the **Connection string** (sometimes called "Connection details"). Copy it — it looks like `postgresql://user:password@host/dbname?sslmode=require`. You'll need this in Step 3.

## Step 2 — Put this project on GitHub

1. Go to github.com and click **New repository**. Name it something like `hoff-parquet-crm`. Keep it **Private**. Don't add a README or .gitignore — this folder already has them.
2. On the new (empty) repository page, click **uploading an existing file**.
3. Drag every file and folder from this project into the upload box (or use "choose your files" and select them all). GitHub will preserve the folder structure.
4. Scroll down and click **Commit changes**.

That's it — no command line needed.

## Step 3 — Deploy on Vercel

1. Go to vercel.com, and click **Add New → Project**.
2. Choose **Import Git Repository** and select the `hoff-parquet-crm` repo you just created (you may need to click "Install" to let Vercel access your GitHub account first — that's normal).
3. Before clicking Deploy, open **Environment Variables** and add these three, one at a time:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the connection string you copied from Neon in Step 1 |
   | `WORKSPACE_PASSWORD` | any password you want your team to use to log in |
   | `SESSION_SECRET` | any long random text — e.g. mash your keyboard for 30 characters. Nobody types this; it's just used internally. |

4. Click **Deploy**. Vercel will build the project — this takes a minute or two.
5. Once it says "Ready", click the URL it gives you (something like `hoff-parquet-crm.vercel.app`). You should see the login page.

## Step 4 — Log in and try it

1. Enter the `WORKSPACE_PASSWORD` you chose in Step 3.
2. Add a test client, move it through the pipeline, create a quotation, and try **Print / Save as PDF** and **Email to client** — both should now work normally, since this is a real website, not an embedded view.

---

## If something goes wrong

- **"Application error" on the site** — almost always means an environment variable is missing or the database connection string has a typo. Double-check Step 3, then in Vercel go to your project → Deployments → click the latest one → "Redeploy" after fixing the variable.
- **Login page won't accept the password** — check for extra spaces when you set `WORKSPACE_PASSWORD` in Vercel.
- **Changes I make later don't show up** — after I hand you updated files, repeat Step 2 (upload the changed files to GitHub, overwriting the old ones) — Vercel redeploys automatically within a minute or two of a GitHub update.

## Sharing it with your team

Once it's live, just give your team the Vercel URL and the workspace password. Everyone
uses the same login and shares the same data, the same way the current version works.

## What's next

Once you've confirmed this phase works properly, tell me and I'll build the next layer:
invoices, order sheets, the product catalog (with retail/B2B pricing), the margins view,
and the settings page for editing your letterhead — carrying over everything from the
original version.
