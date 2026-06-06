-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

create table if not exists appointments (
  id                serial primary key,
  customer_name     text not null,
  phone_number      text not null,
  appointment_time  timestamptz not null,
  confirmation_sent boolean not null default false,
  reminder_sent     boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Index for the cron job query (appointments within 1 hour, reminder not yet sent)
create index if not exists idx_appts_reminder
  on appointments (appointment_time, reminder_sent)
  where reminder_sent = false;

-- Optional: allow the anon key to read/write (Row Level Security)
alter table appointments enable row level security;

create policy "allow all for anon" on appointments
  for all using (true) with check (true);
