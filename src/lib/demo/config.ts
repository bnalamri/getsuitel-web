export const DEMO_STATE_KEY = 'gs_demo'

export type DemoState = {
  step: number
  propertyId: string | null
  unitId: string | null
}

export function getDemoState(): DemoState {
  if (typeof window === 'undefined') return { step: 0, propertyId: null, unitId: null }
  try {
    const raw = localStorage.getItem(DEMO_STATE_KEY)
    return raw ? JSON.parse(raw) : { step: 0, propertyId: null, unitId: null }
  } catch {
    return { step: 0, propertyId: null, unitId: null }
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
  id: string
  path: string
  title: string
  description: string
  audio: string
  needsSubmit: boolean
  nextLabel: string | null
  submitStep: number | null // which step number this form handles
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    path: '/dashboard/owner',
    title: 'Welcome to GetSuitel!',
    description:
      "I'll guide you through setting up a property in 3 steps. Everything is pre-filled — just click Next at each stage.",
    audio:
      "Welcome to GetSuitel! I'll guide you through setting up your first property in just 3 simple steps. All the details are filled in automatically. Click Let's Start to begin.",
    needsSubmit: false,
    nextLabel: "Let's Start",
    submitStep: null,
  },
  {
    id: 'add-property',
    path: '/dashboard/owner/properties',
    title: 'Step 1 — Add a Property',
    description:
      "We've filled in Oakwood Residences — a residential property in Muscat. Click the button to create it.",
    audio:
      "This is the Properties page. We've filled in a sample property called Oakwood Residences in Muscat. Click Create Property to add it to your account.",
    needsSubmit: true,
    nextLabel: 'Create Property',
    submitStep: 1,
  },
  {
    id: 'add-unit',
    path: '/dashboard/owner/units',
    title: 'Step 2 — Add a Unit',
    description:
      "Adding Unit 101 — a 2-bedroom flat at 350 OMR/month. Click the button to save it.",
    audio:
      "Now let's add a unit to Oakwood Residences. We've filled in Unit 101, a 2-bedroom flat on the first floor with a monthly rent of 350 Omani Rials. Click Add Unit to save it.",
    needsSubmit: true,
    nextLabel: 'Add Unit',
    submitStep: 2,
  },
  {
    id: 'add-contract',
    path: '/dashboard/owner/contracts',
    title: 'Step 3 — Create a Contract',
    description:
      "Linking James Carter to Unit 101 for 1 year at 350 OMR/month. Click to activate the lease.",
    audio:
      "Almost done! We're creating a rental contract linking James Carter to Unit 101 for one year at 350 Omani Rials per month. Click Create Contract to activate it.",
    needsSubmit: true,
    nextLabel: 'Create Contract',
    submitStep: 3,
  },
  {
    id: 'done',
    path: '/dashboard/owner',
    title: 'All Done! 🎉',
    description:
      "Oakwood Residences is live with a unit and an active contract. Sign up to start with your own properties.",
    audio:
      "Congratulations! Oakwood Residences is fully set up with Unit 101 and an active contract for James Carter. Sign up now to start managing your own real properties with GetSuitel.",
    needsSubmit: false,
    nextLabel: null,
    submitStep: null,
  },
]

export const DEMO_PROPERTY_DATA = {
  name: 'Oakwood Residences',
  type: 'residential',
  address: 'Way 4521, Al Khuwair',
  address_line2: 'Near City Centre Mall',
  city: 'Muscat',
  country: 'Oman',
}

export const DEMO_UNIT_DATA = {
  unit_type: 'flat',
  unit_number: '101',
  floor: '1',
  area_sqm: '95',
  bedrooms: '2',
  bathrooms: '1',
  rent_amount: '350',
  currency: 'OMR',
  status: 'vacant',
}

export const DEMO_CONTRACT_DATA = {
  rent_amount: '350',
  currency: 'OMR',
  deposit_amount: '700',
  payment_day: '1',
  payment_method: 'bank_transfer',
  status: 'active',
}
