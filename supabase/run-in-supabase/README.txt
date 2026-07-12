GetSuitel — SQL Scripts to Run in Supabase Dashboard
=====================================================

All files in this folder must be run manually in:
Supabase Dashboard → SQL Editor → New Query → Paste → Run

Run them IN ORDER (by number prefix).

Files:
------
001_initial_schema.sql         — Full database schema (tables, types, triggers)
002_rls_policies.sql           — Row Level Security policies
003_fix_handle_new_user.sql    — User registration trigger (re-run whenever updated)
004_payments.sql               — Cheques and payment receipts tables
005_data_retention.sql         — Account cancellation and purge logic
006_cleanup_pilot_data.sql     — One-time pilot data cleanup
007_max_properties.sql         — Add max_properties column to organizations
008_address_line2.sql          — Add address_line2 to properties
009_unit_type.sql              — Add unit_type to units
010_staff_invitations.sql      — Staff invitations table and new roles
011_owner_type.sql             — Individual vs Company owner fields
012_cr_document.sql            — CR document URL for company owners

NOTE: If you update the handle_new_user trigger (003), always re-run it
in Supabase even if the file is already committed to GitHub.
