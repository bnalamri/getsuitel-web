# GetSuitel — Setup Guide

## Step 1 — Install dependencies

Open a terminal in the `getsuitel-web` folder and run:

```bash
npm install
```

---

## Step 2 — Create Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name it `getsuitel`, choose a strong database password, pick a region close to Oman (e.g. Singapore or Frankfurt)
3. Wait ~2 minutes for provisioning
4. Go to **Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Run the database schema

In Supabase Dashboard → **SQL Editor**, run these files IN ORDER:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

### Configure Supabase Auth

Go to **Authentication → Settings**:
- Site URL: `https://getsuitel.com`
- Redirect URLs: add `https://getsuitel.com/auth/verify-email` and `https://getsuitel.com/auth/reset-password`
- Enable **Email confirmations**

Go to **Authentication → Email Templates** and customize the verification and reset emails with your branding.

---

## Step 3 — Create Stripe account

1. Go to [stripe.com](https://stripe.com) and create an account
2. In **Developers → API keys**, copy the publishable and secret keys
3. Create 3 products (Basic $29, Pro $79, Enterprise $199):
   - **Catalog → Products → Add product** for each
   - Set billing as **Recurring → Monthly**
   - Copy each **Price ID** (starts with `price_`)
4. Set up **Webhooks**: Developers → Webhooks → Add endpoint
   - URL: `https://getsuitel.com/api/webhooks/stripe`
   - Events to listen: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

---

## Step 4 — Create Resend account

1. Go to [resend.com](https://resend.com) and create an account
2. Add your domain `getsuitel.com` and verify DNS records
3. Create an API key → copy to `RESEND_API_KEY`

---

## Step 5 — Set environment variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
# Then edit .env.local with your real keys
```

---

## Step 6 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Step 7 — Deploy to Vercel

1. Push the `getsuitel-web` folder to a **GitHub repository**
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
3. In **Environment Variables**, add all keys from your `.env.local`
4. Click **Deploy**
5. Go to **Settings → Domains** → add `getsuitel.com`
6. Update DNS: add Vercel's nameservers or CNAME record as instructed

---

## Default Demo Accounts (create manually in Supabase Auth → Users)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@getsuitel.com | Change_me_123! |
| Owner | owner@getsuitel.com | Change_me_123! |
| Tenant | tenant@getsuitel.com | Change_me_123! |
| Technician | tech@getsuitel.com | Change_me_123! |

After creating each user, go to SQL Editor and run:
```sql
UPDATE profiles SET role = 'superadmin' WHERE email = 'admin@getsuitel.com';
UPDATE profiles SET role = 'technician' WHERE email = 'tech@getsuitel.com';
```

---

## Project Structure

```
getsuitel-web/
├── src/
│   ├── app/
│   │   ├── auth/          ← Login, Register, Forgot/Reset Password
│   │   ├── dashboard/
│   │   │   ├── admin/     ← Super admin screens
│   │   │   ├── owner/     ← Owner screens
│   │   │   ├── tenant/    ← Tenant screens
│   │   │   └── technician/← Technician screens
│   │   └── (public)/      ← Landing, Terms, Privacy
│   ├── components/
│   │   ├── layout/        ← DashboardShell, Sidebar, Topbar
│   │   ├── ui/            ← Reusable UI components
│   │   └── dashboard/     ← Feature components
│   ├── lib/
│   │   ├── supabase/      ← Client + server Supabase helpers
│   │   └── utils/         ← Plans, helpers
│   ├── types/             ← TypeScript types
│   └── middleware.ts       ← Auth + role-based routing
├── supabase/
│   └── migrations/        ← SQL schema files
├── .env.example
├── vercel.json
└── SETUP.md
```
