# Appointment Reminder System

A Next.js app that books appointments, sends WhatsApp confirmations via Twilio, and automatically sends daily reminders (or immediate reminders for near-term bookings).

**Stack:** Next.js 14 · Supabase (Postgres) · Twilio WhatsApp · Vercel Cron

---

## Features

- Booking form with customer name, phone number, and appointment time
- Instant WhatsApp confirmation message on booking
- Live dashboard showing all appointments with status badges
- Auto-refreshes every 15 seconds
- **Bonus:** Vercel Cron fires once daily and sends WhatsApp reminders for appointments within the next 24 hours (deduplicated with `reminder_sent` flag). Additionally, booking an appointment scheduled for within 1 hour will immediately trigger a reminder.

---

## Setup — step by step

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-setup.sql`
3. Go to **Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Twilio WhatsApp sandbox

1. Create a free account at [twilio.com](https://twilio.com)
2. From the Console dashboard, copy:
   - Account SID → `TWILIO_ACCOUNT_SID`
   - Auth Token → `TWILIO_AUTH_TOKEN`
3. Go to **Messaging → Try it out → Send a WhatsApp message**
4. Follow the sandbox instructions (send a join code from your WhatsApp to the sandbox number)
5. The sandbox number is `+1 415 523 8886` → set `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`

> **Note:** In the Twilio sandbox, every recipient must opt-in by sending the join code. For production, you'd apply for a WhatsApp Business number.

### 3. Local development

```bash
# Clone and install
npm install

# Copy env template and fill in your values
cp .env.example .env.local
# Edit .env.local with your Supabase and Twilio credentials

# Run locally
npm run dev
# Open http://localhost:3000
```

To test the cron endpoint locally:
```bash
curl -H "Authorization: Bearer your-cron-secret" http://localhost:3000/api/cron
```

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add all environment variables (Vercel will prompt, or use the dashboard)
# Settings → Environment Variables:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   TWILIO_ACCOUNT_SID
#   TWILIO_AUTH_TOKEN
#   TWILIO_WHATSAPP_FROM
#   CRON_SECRET
```

Or connect your GitHub repo to Vercel for automatic deploys on push.

**The `vercel.json` cron config is picked up automatically** — Vercel will call `/api/cron` daily once deployed. The endpoint is protected by the `CRON_SECRET` header (Vercel injects this automatically for cron invocations).

---

## Project structure

```
app/
  page.tsx                   Booking form + live dashboard
  layout.tsx                 Root layout with fonts
  globals.css                Design tokens and base styles
  api/
    appointments/route.ts    POST: save + confirm | GET: list all
    cron/route.ts            Reminder job (called by Vercel Cron)
lib/
  supabase.ts                Supabase client + types
  twilio.ts                  sendConfirmation() and sendReminder()
supabase-setup.sql           Run once in Supabase SQL Editor
vercel.json                  Declares the cron schedule (0 2 * * *)
.env.example                 Template — copy to .env.local
```

---

## How the reminder deduplication works

The `appointments` table has a `reminder_sent boolean default false` column.

The cron job (`/api/cron`):
1. Queries for appointments where `reminder_sent = false` AND `appointment_time` is between now and now+24hr
2. Sends a WhatsApp reminder for each match
3. Sets `reminder_sent = true` immediately after a successful send

Additionally, if a customer books an appointment scheduled for less than 1 hour away, a reminder is sent immediately during the booking transaction to ensure they receive a notification even if the daily cron has already run.
