-- ============================================================
-- GetSuitel — Bilingual Agreement Templates (admin/owner-authored Arabic,
-- no machine translation of legal content)
-- Run in: Supabase Dashboard → SQL Editor
--
-- Context: the HQ Franchise Agreement and the Tenancy Agreement generators
-- previously auto-translated obligations/clauses into Arabic on export.
-- These are legal documents, so that's the wrong approach — instead, HQ
-- admins and owners now type BOTH language versions themselves (reviewed by
-- their own counsel if they choose), saved once and reused on every export.
-- Structural chrome (headings, field labels) stays fixed bilingual copy
-- written by the platform — no DB field needed for that, it carries no
-- legal weight of its own.
-- ============================================================

-- ── HQ Branch Franchise Agreement — Arabic counterparts ─────────────────
-- Defaults mirror the EN defaults already used in AgreementClient.tsx /
-- the export route, given as an editable starting point, not a live
-- translation of whatever the admin later types in the EN field.
alter table public.branch_agreements
  add column if not exists hq_obligations_ar     text
    default 'يلتزم المقر الرئيسي بتزويد الفرع بإمكانية الوصول إلى منصة جيت سويتل، والدعم الفني المستمر، والمواد التدريبية، وتحديثات المنصة، والإرشادات التشغيلية.',
  add column if not exists branch_obligations_ar text
    default 'يلتزم الفرع بالعمل وفقاً لإرشادات المقر الرئيسي، والحفاظ على دقة البيانات، وسداد جميع الرسوم في مواعيدها، وحماية بيانات المستخدمين وفقاً للقوانين المعمول بها، والإبلاغ الفوري عن أي مشكلات تشغيلية.',
  add column if not exists jurisdiction_ar        text default 'سلطنة عُمان',
  add column if not exists governing_law_ar       text default 'قوانين سلطنة عُمان',
  add column if not exists dispute_resolution_ar  text default 'المحكمة التجارية بمسقط',
  add column if not exists custom_clauses_ar      text;

comment on column public.branch_agreements.hq_obligations_ar is
  'Admin-authored Arabic mirror of hq_obligations. Not machine-translated — editable independently.';
comment on column public.branch_agreements.branch_obligations_ar is
  'Admin-authored Arabic mirror of branch_obligations. Not machine-translated — editable independently.';
comment on column public.branch_agreements.custom_clauses_ar is
  'Admin-authored Arabic mirror of custom_clauses. Optional — left blank shows an "awaiting translation" note instead of English text mislabeled as Arabic.';

-- ── Tenancy Agreement — reusable per-organization template ──────────────
-- One row per organization. Owner/property_manager edits this once in
-- Settings; every tenancy contract export for that org pulls the current
-- values, so updating the wording here updates all future exports without
-- re-entering it per contract.
create table if not exists public.tenancy_agreement_templates (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null unique references public.organizations(id) on delete cascade,

  tenant_obligations_en   text not null default 'The Tenant shall pay rent on the due date each month, use the unit for residential purposes only, maintain the unit in good condition, avoid unauthorised alterations or subletting, and comply with all building rules and applicable laws.',
  tenant_obligations_ar   text not null default 'يلتزم المستأجر بسداد الإيجار في تاريخ استحقاقه من كل شهر، واستخدام الوحدة لأغراض سكنية فقط، والحفاظ عليها بحالة جيدة، وعدم إجراء أي تعديلات أو تأجير من الباطن دون إذن، والامتثال لجميع لوائح المبنى والقوانين المعمول بها.',

  landlord_obligations_en text not null default 'The Landlord shall deliver the unit in a habitable condition, carry out structural and major maintenance not caused by tenant negligence, and respect the Tenant''s right to quiet enjoyment of the property throughout the term.',
  landlord_obligations_ar text not null default 'يلتزم المالك بتسليم الوحدة بحالة صالحة للسكن، والقيام بأعمال الصيانة الإنشائية والرئيسية التي لا تعود إلى إهمال المستأجر، واحترام حق المستأجر في الانتفاع الهادئ بالعقار طوال مدة العقد.',

  governing_law_en        text not null default 'This Agreement shall be governed by and construed in accordance with the Laws of the Sultanate of Oman. Any disputes arising out of or in connection with this Agreement shall be submitted to the competent courts of the Sultanate of Oman.',
  governing_law_ar        text not null default 'يخضع هذا العقد ويُفسَّر وفقاً لقوانين سلطنة عُمان. وتُحال أي نزاعات تنشأ عن هذا العقد أو تتعلق به إلى المحاكم المختصة في سلطنة عُمان.',

  notice_period_days      int  not null default 30,

  additional_clauses_en   text,
  additional_clauses_ar   text,

  created_by              uuid references public.profiles(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.tenancy_agreement_templates enable row level security;

drop policy if exists "owner_tenancy_template_access" on public.tenancy_agreement_templates;
create policy "owner_tenancy_template_access" on public.tenancy_agreement_templates
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('owner', 'property_manager')
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('owner', 'property_manager')
    )
  );

comment on table public.tenancy_agreement_templates is
  'One reusable EN/AR legal template per organization for tenancy agreement exports. Owner/property_manager-authored, never machine-translated.';

-- ── Per-contract Special Conditions — Arabic counterpart ─────────────────
alter table public.contracts
  add column if not exists notes_ar text;

comment on column public.contracts.notes_ar is
  'Admin-authored Arabic mirror of contracts.notes (Special Conditions on the tenancy agreement export). Optional — left blank shows an "awaiting translation" note.';
