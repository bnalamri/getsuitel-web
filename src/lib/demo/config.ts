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
  titleAr: string
  description: string
  descriptionAr: string
  audio: string
  audioAr: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    path: '/dashboard/owner',
    title: 'Welcome to GetSuitel!',
    titleAr: 'مرحباً بك في GetSuitel!',
    description:
      'Your demo account is pre-loaded with a realistic property portfolio. Hit Next to explore each section.',
    descriptionAr:
      'حسابك التجريبي مُحمَّل مسبقاً بمحفظة عقارات واقعية. اضغط التالي لاستكشاف كل قسم.',
    audio:
      'Welcome to GetSuitel — the smart property management platform. Your demo account is fully set up with a real property, tenants, contracts, and invoices. Click Next to begin the tour.',
    audioAr:
      'مرحباً بك في GetSuitel — منصة إدارة العقارات الذكية. حسابك التجريبي جاهز بالكامل مع عقار حقيقي ومستأجرين وعقود وفواتير. انقر على التالي لبدء الجولة.',
  },
  {
    path: '/dashboard/owner/properties',
    title: 'Properties',
    titleAr: 'العقارات',
    description:
      'Oakwood Residences is a 4-unit residential complex. You can manage multiple buildings, villas, or compounds from one account.',
    descriptionAr:
      'أوكوود ريزيدنسز مجمع سكني يضم 4 وحدات. يمكنك إدارة مبانٍ ومجمعات متعددة من حساب واحد.',
    audio:
      'This is the Properties page. Oakwood Residences is a 4-unit residential complex. You can add as many buildings, villas, or compounds as you manage, each with their own units.',
    audioAr:
      'هذه صفحة العقارات. أوكوود ريزيدنسز مجمع سكني يضم أربع وحدات. يمكنك إضافة أي عدد من المباني أو الفلل أو المجمعات التي تديرها، ولكل منها وحداتها الخاصة.',
  },
  {
    path: '/dashboard/owner/units',
    title: 'Units',
    titleAr: 'الوحدات',
    description:
      'Units 101 and 102 are occupied with active leases. Units 201 and 202 are vacant and ready to rent.',
    descriptionAr:
      'الوحدتان 101 و102 مؤجَّرتان بعقود نشطة. الوحدتان 201 و202 شاغرتان وجاهزتان للتأجير.',
    audio:
      'Here are the units inside Oakwood Residences. Units 101 and 102 are currently occupied — each linked to a tenant and an active contract. Units 201 and 202 are vacant and available to lease.',
    audioAr:
      'هذه الوحدات داخل أوكوود ريزيدنسز. الوحدتان 101 و102 مؤجَّرتان حالياً، وكل منهما مرتبطة بمستأجر وعقد نشط. الوحدتان 201 و202 شاغرتان ومتاحتان للتأجير.',
  },
  {
    path: '/dashboard/owner/tenants',
    title: 'Tenants & Contracts',
    titleAr: 'المستأجرون والعقود',
    description:
      'James Carter and Sarah Mitchell each have an active contract — rent amount, deposit, payment schedule, and lease dates all tracked in one place.',
    descriptionAr:
      'لدى جيمس كارتر وسارة ميتشيل عقدان نشطان — مبلغ الإيجار والوديعة وجدول الدفع وتواريخ العقد كلها في مكان واحد.',
    audio:
      'The Tenants page shows your current residents. James Carter is in Unit 101 and Sarah Mitchell is in Unit 102. Each tenant has a contract with the rent amount, deposit, and lease dates clearly recorded.',
    audioAr:
      'تعرض صفحة المستأجرين السكان الحاليين. جيمس كارتر في الوحدة 101 وسارة ميتشيل في الوحدة 102. لكل مستأجر عقد يتضمن مبلغ الإيجار والوديعة وتواريخ العقد بشكل واضح.',
  },
  {
    path: '/dashboard/owner/invoices',
    title: 'Invoices',
    titleAr: 'الفواتير',
    description:
      'GetSuitel auto-generates monthly invoices from active contracts. Tenants can pay directly from their own portal — no chasing needed.',
    descriptionAr:
      'تُنشئ GetSuitel فواتير شهرية تلقائياً من العقود النشطة. يمكن للمستأجرين الدفع مباشرة من بوابتهم الخاصة — دون الحاجة إلى ملاحقتهم.',
    audio:
      'GetSuitel automatically creates a monthly invoice for each active contract. You can see paid invoices and the current pending ones. Tenants receive their invoice by email and can pay directly from their tenant portal.',
    audioAr:
      'تُنشئ GetSuitel تلقائياً فاتورة شهرية لكل عقد نشط. يمكنك رؤية الفواتير المدفوعة والمعلَّقة الحالية. يستلم المستأجرون فواتيرهم عبر البريد الإلكتروني ويمكنهم الدفع مباشرة من بوابة المستأجر.',
  },
  {
    path: '/dashboard/owner/maintenance',
    title: 'Maintenance',
    titleAr: 'الصيانة',
    description:
      'Tenants submit requests from their portal. You assign a service team, track status, and record costs — all in one view.',
    descriptionAr:
      'يُرسل المستأجرون طلباتهم من بوابتهم. تُسنِد الطلب لفريق الخدمة وتتابع الحالة وتسجّل التكاليف — كل ذلك في عرض واحد.',
    audio:
      'The Maintenance page shows all requests submitted by your tenants. You can assign them to a service team, update the status as work progresses, and record the final cost when done.',
    audioAr:
      'تعرض صفحة الصيانة جميع الطلبات المُقدَّمة من مستأجريك. يمكنك إسنادها لفريق الخدمة وتحديث الحالة مع تقدم العمل وتسجيل التكلفة النهائية عند الانتهاء.',
  },
  {
    path: '/dashboard/owner',
    title: "You're all set! 🎉",
    titleAr: 'اكتملت الجولة! 🎉',
    description:
      "You've seen the full platform. Ready to start managing your own properties?",
    descriptionAr:
      'لقد استعرضت المنصة كاملة. هل أنت مستعد لبدء إدارة عقاراتك الخاصة؟',
    audio:
      "That's the full GetSuitel experience. Sign up free today and start managing your own properties in minutes. No credit card required — your first 30 days are completely free.",
    audioAr:
      'هذه هي تجربة GetSuitel الكاملة. سجّل مجاناً اليوم وابدأ إدارة عقاراتك في دقائق. لا بطاقة ائتمان مطلوبة — أول 30 يوماً مجاناً بالكامل.',
  },
]
