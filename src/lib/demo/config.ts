export const DEMO_STATE_KEY = 'gs_demo'

export type DemoState = { step: number }

export function getDemoState(): DemoState {
  if (typeof window === 'undefined') return { step: 0 }
  try {
    const raw = localStorage.getItem(DEMO_STATE_KEY)
    return raw ? JSON.parse(raw) : { step: 0 }
  } catch {
    return { step: 0 }
  }
}

export function setDemoState(update: Partial<DemoState>) {
  if (typeof window === 'undefined') return
  const current = getDemoState()
  localStorage.setItem(DEMO_STATE_KEY, JSON.stringify({ ...current, ...update }))
}

export function clearDemoState() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(DEMO_STATE_KEY)
}

export interface TourStep {
  path: string
  title: string
  description: string
  audio: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    path: '/dashboard/owner',
    title: 'Welcome to GetSuitel!',
    description:
      'Your demo account is pre-loaded with a realistic property portfolio. Hit Next to explore each section.',
    audio:
      'Welcome to GetSuitel — the smart property management platform. Your demo account is fully set up with a real property, tenants, contracts, and invoices. Click Next to begin the tour.',
  },
  {
    path: '/dashboard/owner/properties',
    title: 'Properties',
    description:
      'Oakwood Residences is a 4-unit residential complex in Muscat. You can manage multiple buildings, villas, or compounds from one account.',
    audio:
      'This is the Properties page. Oakwood Residences is a 4-unit residential complex. You can add as many buildings, villas, or compounds as you manage, each with their own units.',
  },
  {
    path: '/dashboard/owner/units',
    title: 'Units',
    description:
      'Units 101 and 102 are occupied with active leases. Units 201 and 202 are vacant and ready to rent.',
    audio:
      'Here are the units inside Oakwood Residences. Units 101 and 102 are currently occupied — each linked to a tenant and an active contract. Units 201 and 202 are vacant and available to lease.',
  },
  {
    path: '/dashboard/owner/tenants',
    title: 'Tenants & Contracts',
    description:
      'James Carter and Sarah Mitchell each have an active contract — rent amount, deposit, payment schedule, and lease dates all tracked in one place.',
    audio:
      'The Tenants page shows your current residents. James Carter is in Unit 101 and Sarah Mitchell is in Unit 102. Each tenant has a contract with the rent amount, deposit, and lease dates clearly recorded.',
  },
  {
    path: '/dashboard/owner/invoices',
    title: 'Invoices',
    description:
      'GetSuitel auto-generates monthly invoices from active contracts. Tenants can pay directly from their own portal — no chasing needed.',
    audio:
      'GetSuitel automatically creates a monthly invoice for each active contract. You can see paid invoices and the current pending ones. Tenants receive their invoice by email and can pay directly from their tenant portal.',
  },
  {
    path: '/dashboard/owner/maintenance',
    title: 'Maintenance',
    description:
      'Tenants submit requests from their portal. You assign a service team, track status, and record costs — all in one view.',
    audio:
      'The Maintenance page shows all requests submitted by your tenants. You can assign them to a service team, update the status as work progresses, and record the final cost when done.',
  },
  {
    path: '/dashboard/owner',
    title: "You're all set! 🎉",
    description:
      'You\'ve seen the full platform. Ready to start managing your own properties?',
    audio:
      "That's the full GetSuitel experience. Sign up free today and start managing your own properties in minutes. No credit card required — your first 30 days are completely free.",
  },
]
