-- Run this in Supabase SQL Editor

alter table organizations
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists subscription_reminder_sent_at timestamptz;
