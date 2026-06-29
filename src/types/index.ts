// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'owner' | 'tenant' | 'technician'

export interface Profile {
  id: string
  email: string
  full_name: string
  full_name_ar: string | null
  role: UserRole
  phone: string | null
  avatar_url: string | null
  lang_pref: 'ar' | 'en'
  is_active: boolean
  created_at: string
  updated_at: string
  organization_id: string | null
}

// ─── Organization (Owner's company) ────────────────────────────────────────

export interface Organization {
  id: string
  name: string
  name_ar: string | null
  owner_id: string
  logo_url: string | null
  subscription_plan: 'basic' | 'pro' | 'enterprise'
  subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled'
  subscription_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  max_units: number
  max_tenants: number
  created_at: string
}

// ─── Property ────────────────────────────────────────────────────────────────

export type PropertyType = 'residential' | 'commercial' | 'mixed'

export interface Property {
  id: string
  organization_id: string
  name: string
  name_ar: string | null
  type: PropertyType
  address: string
  city: string
  country: string
  total_units: number
  image_url: string | null
  created_at: string
}

// ─── Unit ────────────────────────────────────────────────────────────────────

export type UnitStatus = 'vacant' | 'occupied' | 'maintenance' | 'reserved'

export interface Unit {
  id: string
  property_id: string
  organization_id: string
  unit_number: string
  floor: number | null
  area_sqm: number | null
  bedrooms: number | null
  bathrooms: number | null
  status: UnitStatus
  rent_amount: number
  currency: string
  notes: string | null
  created_at: string
  // joined
  property?: Property
}

// ─── Tenant ──────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  organization_id: string
  profile_id: string | null   // linked to auth user if they have portal access
  full_name: string
  full_name_ar: string | null
  email: string
  phone: string
  national_id: string | null
  nationality: string | null
  emergency_contact: string | null
  notes: string | null
  created_at: string
  // joined
  profile?: Profile
  active_contract?: Contract
}

// ─── Contract ────────────────────────────────────────────────────────────────

export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated'

export interface Contract {
  id: string
  organization_id: string
  unit_id: string
  tenant_id: string
  start_date: string
  end_date: string
  rent_amount: number
  currency: string
  payment_day: number           // day of month rent is due (1-28)
  deposit_amount: number
  status: ContractStatus
  pdf_url: string | null
  notes: string | null
  created_at: string
  // joined
  unit?: Unit
  tenant?: Tenant
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'canceled'
export type InvoiceType = 'rent' | 'deposit' | 'maintenance' | 'other'

export interface Invoice {
  id: string
  organization_id: string
  contract_id: string
  tenant_id: string
  unit_id: string
  type: InvoiceType
  amount: number
  currency: string
  due_date: string
  paid_date: string | null
  status: InvoiceStatus
  stripe_payment_intent_id: string | null
  pdf_url: string | null
  notes: string | null
  created_at: string
  // joined
  tenant?: Tenant
  unit?: Unit
  contract?: Contract
}

// ─── Maintenance ─────────────────────────────────────────────────────────────

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'
export type MaintenanceStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'canceled'
export type MaintenanceCategory = 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'appliance' | 'cleaning' | 'other'

export interface MaintenanceRequest {
  id: string
  organization_id: string
  unit_id: string
  tenant_id: string | null
  technician_id: string | null
  title: string
  description: string
  category: MaintenanceCategory
  priority: MaintenancePriority
  status: MaintenanceStatus
  scheduled_date: string | null
  completed_date: string | null
  cost: number | null
  notes: string | null
  images: string[]
  created_at: string
  updated_at: string
  // joined
  unit?: Unit
  tenant?: Tenant
  technician?: Profile
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'invoice_created' | 'invoice_paid' | 'invoice_overdue'
  | 'maintenance_created' | 'maintenance_assigned' | 'maintenance_completed'
  | 'contract_expiring' | 'contract_expired'
  | 'lease_renewal' | 'general'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  title_ar: string | null
  body: string
  body_ar: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

// ─── Document ────────────────────────────────────────────────────────────────

export type DocumentCategory = 'contract' | 'id' | 'invoice' | 'report' | 'other'

export interface Document {
  id: string
  organization_id: string
  uploaded_by: string
  related_id: string | null
  related_type: string | null
  name: string
  category: DocumentCategory
  file_url: string
  file_size: number
  mime_type: string
  created_at: string
}

// ─── Utility types ───────────────────────────────────────────────────────────

export type Lang = 'ar' | 'en'

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}
