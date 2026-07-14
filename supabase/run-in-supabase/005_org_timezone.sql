-- Migration 005: Country + timezone per organisation
-- Run in Supabase SQL editor

alter table organizations
  add column if not exists country      text,
  add column if not exists org_timezone text not null default 'UTC';
