-- ─── PAYMENT METHODS MIGRATION ──────────────────────────────────────────────
-- Adds: cheques table, payment_receipts table
-- Extends: organizations (payment settings), invoices (payment_method)

-- 1. Payment settings on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS bank_account_name   text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_name           text,
  ADD COLUMN IF NOT EXISTS bank_iban           text,
  ADD COLUMN IF NOT EXISTS mobile_wallet_number text,
  ADD COLUMN IF NOT EXISTS mobile_wallet_label  text DEFAULT 'Mobile Wallet';

-- 2. Payment method on invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_method text
    CHECK (payment_method IN ('cheque','bank_transfer','mobile_transfer','cash'));

-- 3. Cheques table
CREATE TABLE IF NOT EXISTS public.cheques (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_id     uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  unit_id         uuid REFERENCES public.units(id) ON DELETE SET NULL,
  invoice_id      uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  cheque_number   text NOT NULL,
  bank_name       text NOT NULL,
  amount          numeric(12,2) NOT NULL,
  due_date        date NOT NULL,
  deposited_date  date,
  cleared_date    date,
  bounce_reason   text,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','deposited','cleared','bounced','cancelled','replaced')),
  notes           text,
  sequence_number int,              -- e.g. cheque 3 of 12
  total_cheques   int,              -- e.g. 12
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cheques_org      ON public.cheques(organization_id);
CREATE INDEX IF NOT EXISTS idx_cheques_tenant   ON public.cheques(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cheques_contract ON public.cheques(contract_id);
CREATE INDEX IF NOT EXISTS idx_cheques_status   ON public.cheques(status);
CREATE INDEX IF NOT EXISTS idx_cheques_due_date ON public.cheques(due_date);

CREATE TRIGGER trg_cheques_updated_at
  BEFORE UPDATE ON public.cheques
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Payment receipts table (bank transfer / mobile transfer / cash)
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invoice_id      uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  method          text NOT NULL
    CHECK (method IN ('bank_transfer','mobile_transfer','cash')),
  receipt_url     text,
  amount          numeric(12,2),
  notes           text,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','rejected')),
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  confirmed_at    timestamptz,
  confirmed_by    uuid REFERENCES public.profiles(id),
  rejection_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_org     ON public.payment_receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON public.payment_receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_tenant  ON public.payment_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status  ON public.payment_receipts(status);

CREATE TRIGGER trg_receipts_updated_at
  BEFORE UPDATE ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. RLS policies
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Cheques: org members can read; owners can write
CREATE POLICY "org members read cheques"
  ON public.cheques FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org owners manage cheques"
  ON public.cheques FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Receipts: tenants can insert/read their own; org owners can read+update
CREATE POLICY "tenant read own receipts"
  ON public.payment_receipts FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE profile_id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "tenant submit receipt"
  ON public.payment_receipts FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "org owner update receipt"
  ON public.payment_receipts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );
