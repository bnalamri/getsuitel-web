-- Migration 013: add paid_via + payment_slip_url to invoices
alter table public.invoices
  add column if not exists paid_via          text, -- cash | cheque | bank_transfer | mobile_transfer
  add column if not exists payment_slip_url  text; -- optional transfer/cheque slip attachment
