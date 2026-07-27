# VETS Canada Dartmouth — Food Bank Inventory App

**Proudly Supported by DriveX**

A full-stack inventory and client-visit management app for the VETS Canada
Dartmouth food bank. Volunteers manage inventory, process client visits using a
points-based system, and run stock audits. Managers get a full reporting and
administration dashboard.

## Tech Stack

- **Next.js** (App Router, Server Actions + API Routes)
- **Vercel Postgres** (`@vercel/postgres`, raw SQL — no ORM)
- **Tailwind CSS**
- **PIN-based auth** (bcrypt-hashed PINs, signed JWT session cookie via `jose`)
- Deployed on **Vercel** via GitHub

## Features

- 4-digit PIN login with a mobile-friendly PIN pad
- Two roles: **manager** (full access) and **volunteer** (visit / donation / count)
- Client visit flow with a live, sticky points tracker and budget enforcement
- Donation / stock-in logging with per-item expiry dates
- Stock count / audit tool with automatic discrepancy tracking
- Manager dashboard: clients, inventory, items & categories, volunteers, reports
- Expiry tracking with "expiring soon" and "expired" alerts
- Full reporting suite, filterable by date range

---

## Deployment Guide

### 1. Push to GitHub

1. Create a new repository on GitHub (can be private)
2. Add the remote and push:

   ```
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

### 2. Connect to Vercel

1. Go to https://vercel.com and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js — no build config changes needed
5. Click "Deploy" (it will fail on first deploy without the database — that's expected)

### 3. Add Vercel Postgres

1. In your Vercel project dashboard, go to the "Storage" tab
2. Click "Create Database" → select "Postgres"
3. Follow the prompts — name it something like "vets-canada-db"
4. Once created, click "Connect to Project"
5. Vercel automatically adds `POSTGRES_URL` and related env vars to your project
6. Trigger a redeploy: go to "Deployments" → click the three dots on the latest → "Redeploy"

### 4. Initialize the Database

1. Once the redeploy is live, visit:

   ```
   https://YOUR-PROJECT.vercel.app/api/setup
   ```

2. You should see: `{ "success": true, "message": "Database initialized and seeded" }`
3. This creates all tables and loads all inventory items. **It can only be run once.**

### 5. First Login

1. Go to your app URL
2. Enter the default manager PIN: `0000`
3. You will be prompted to change your PIN immediately
4. From the manager dashboard, create volunteer accounts and assign PINs

---

## Local Development

1. Clone the repo
2. Run: `npm install`
3. Create a `.env.local` file and add your `POSTGRES_URL` from Vercel:

   ```
   POSTGRES_URL=your_connection_string_here
   SESSION_SECRET=any_random_string_32_chars_or_more
   ```

4. Run: `npm run dev`
5. Visit http://localhost:3000
6. Initialize the database by visiting http://localhost:3000/api/setup

## Environment Variables

| Variable         | Description                                                          |
| ---------------- | ------------------------------------------------------------------- |
| `POSTGRES_URL`   | Auto-added by Vercel Postgres                                        |
| `SESSION_SECRET` | A long random string (min 32 chars) for signing session cookies     |

> **Note:** Add `SESSION_SECRET` manually in Vercel → Project Settings →
> Environment Variables. The app validates these on startup and throws a clear
> error if either is missing or invalid.

You can generate a strong secret with:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Points System

- Each **category** has a point value (e.g. "Large Can Soup = 2 pts").
- During a client visit, each item selected costs its category's point value.
- Each **client** has a point budget. Default: `60 + (family_size - 1) * 5`.
  Managers can override the budget per client.
- The visit flow shows a live points counter and warns (but does not hard-block)
  when a visit goes over budget, since a manager may have approved extras.

## Database Schema

`users`, `categories`, `items`, `inventory`, `clients`, `transactions`,
`transaction_items`, `audit_counts` — all created and seeded by `/api/setup`.

## Project Structure

```
/app
  /login                  PIN pad login
  /dashboard              volunteer home + shared layout
    /visit                client visit flow
    /donation             log incoming stock
    /count                stock count / audit
    /change-pin           forced PIN change
    /admin                manager dashboard
      /clients /inventory /items /volunteers /reports
  /api
    /setup                create tables + seed data (run once)
    /auth                 PIN login / logout
/components               PinPad, ExpiryAlert, NavLink, LogoutButton
/lib                      db, auth, points, env, queries, reports, seed-data
```
