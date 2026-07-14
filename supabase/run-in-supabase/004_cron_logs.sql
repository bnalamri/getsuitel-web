-- Cron execution log table
create table if not exists cron_logs (
  id          uuid         primary key default gen_random_uuid(),
  job_name    text         not null,
  status      text         not null check (status in ('success', 'partial', 'error')),
  summary     jsonb        default '{}',
  error_msg   text,
  duration_ms integer,
  ran_at      timestamptz  not null default now()
);

create index if not exists cron_logs_job_ran_at on cron_logs (job_name, ran_at desc);
create index if not exists cron_logs_ran_at on cron_logs (ran_at desc);

-- Allow service role full access
alter table cron_logs enable row level security;
create policy "Service role only" on cron_logs using (false);
