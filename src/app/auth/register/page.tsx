'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { PLANS } from '@/lib/utils/plans'
import PhoneInput from '@/components/PhoneInput'

const t = {
  en: {
    step0Title: 'I am a…', step0Sub: 'Choose your account type to get started',
    step1: 'Choose a plan', step1Sub: '30-day free trial on any plan', step2: 'Your details', step3: 'Email sent!',
    name: 'Full name', email: 'Email', pass: 'Password', org: 'Company / property name',
    phone: 'Phone number', next: 'Continue', back: 'Back', submit: 'Create account',
    haveAccount: 'Already have an account?', signin: 'Sign in',
    sentTitle: 'Verify your email', sentBody: 'We sent a confirmation link to',
    sentNote: 'Click the link to activate your account, then sign in.',
    passWeak: 'Minimum 8 characters', lang: 'ع', loading: 'Creating account…',
    perMonth: '/mo', popular: 'Popular',
    inviteLabel: 'Organization Invite Code', inviteHint: 'Ask your property manager for the invite code.',
    staffTokenLabel: 'Staff Invitation Token', staffTokenHint: 'Paste the token from your invitation email.',
    verify: 'Verify', inviteRequired: 'Please verify your organization invite code first',
    staffTokenRequired: 'Please verify your staff invitation token first',
    invalidCode: 'Invalid code', invalidToken: 'Invalid or expired invitation',
    didntReceive: "Didn't receive it? Check your spam folder or",
    resend: 'Resend verification email', resentOk: '✓ Sent!',
    wrongEmail: 'Wrong email? Go back and fix it',
    terms: 'By signing up you agree to our', termsLink: 'Terms', privacyLink: 'Privacy Policy',
    staffTitle: 'New GetSuitel Staff Account', staffDesc: 'Property Manager or Financial Manager',
    // Owner type
    ownerTypeLabel: 'Account type',
    individual: 'Individual', individualDesc: 'A person who owns properties',
    company: 'Company / Organization', companyDesc: 'A business or real estate firm',
    nationalId: 'National ID / Passport No.', nationalIdPlaceholder: 'e.g. 12345678',
    crNumber: 'Commercial Registration (CR) No.', crPlaceholder: 'e.g. 1234567',
    authorizedRep: 'Authorized Representative', authorizedRepPlaceholder: 'Full name of authorized signatory',
    companyName: 'Company name', companyNamePlaceholder: 'Al-Ameri Real Estate LLC',
  },
  ar: {
    step0Title: '…أنا', step0Sub: 'اختر نوع حسابك للبدء',
    step1: 'اختر الخطة', step1Sub: 'تجربة مجانية لمدة 30 يوماً على أي خطة', step2: 'بياناتك', step3: 'تم الإرسال!',
    name: 'الاسم الكامل', email: 'البريد الإلكتروني', pass: 'كلمة المرور',
    org: 'اسم الشركة / العقار', phone: 'رقم الهاتف', next: 'التالي', back: 'رجوع',
    submit: 'إنشاء حساب', haveAccount: 'لديك حساب بالفعل؟', signin: 'تسجيل الدخول',
    sentTitle: 'تحقق من بريدك', sentBody: 'أرسلنا رابط تأكيد إلى',
    sentNote: 'انقر على الرابط لتفعيل حسابك ثم سجّل الدخول.',
    passWeak: '٨ أحرف على الأقل', lang: 'EN', loading: 'جاري الإنشاء…',
    perMonth: '/شهر', popular: 'الأكثر شعبية',
    inviteLabel: 'رمز دعوة المنظمة', inviteHint: 'اطلب رمز الدعوة من مدير العقار.',
    staffTokenLabel: 'رمز دعوة الموظف', staffTokenHint: 'الصق الرمز من بريد الدعوة.',
    verify: 'تحقق', inviteRequired: 'يرجى التحقق من رمز الدعوة أولاً',
    staffTokenRequired: 'يرجى التحقق من رمز دعوة الموظف أولاً',
    invalidCode: 'رمز غير صالح', invalidToken: 'الدعوة غير صالحة أو منتهية الصلاحية',
    didntReceive: 'لم يصل الإيميل؟ تحقق من مجلد الرسائل غير المرغوب فيها أو',
    resend: 'إعادة إرسال رابط التحقق', resentOk: '✓ تم الإرسال!',
    wrongEmail: 'بريد خاطئ؟ عدّل بياناتك',
    terms: 'بالتسجيل توافق على', termsLink: 'الشروط', privacyLink: 'سياسة الخصوصية',
    staffTitle: 'موظف جديد في GETSUITEL', staffDesc: 'مدير عقارات أو مدير مالي',
    // Owner type
    ownerTypeLabel: 'نوع الحساب',
    individual: 'فرد', individualDesc: 'شخص يملك عقارات بصفة شخصية',
    company: 'شركة / مؤسسة', companyDesc: 'شركة أو مؤسسة عقارية',
    nationalId: 'رقم الهوية / جواز السفر', nationalIdPlaceholder: 'مثال: ١٢٣٤٥٦٧٨',
    crNumber: 'رقم السجل التجاري', crPlaceholder: 'مثال: ١٢٣٤٥٦٧',
    authorizedRep: 'المفوّض بالتوقيع', authorizedRepPlaceholder: 'الاسم الكامل للمفوّض',
    companyName: 'اسم الشركة', companyNamePlaceholder: 'شركة العامري للعقارات',
  },
}

export default function RegisterPage() {
  const [lang, setLang] = useState<'en'|'ar'>('en')
  useEffect(() => {
    const saved = localStorage.getItem('lang') as 'en'|'ar'
    if (saved === 'ar') setLang('ar')
    // Auto-handle staff invitation link
    const params = new URLSearchParams(window.location.search)
    const token = params.get('staff_token')
    if (token) {
      setStaffToken(token)
      setRole('staff')
    }
    // Skip pilot gate for visitors coming from the landing page explorer
    if (params.get('from') === 'explore') {
      setStep(0)
    }
  }, [])
  function toggleLang() {
    const next = lang === 'en' ? 'ar' : 'en'
    setLang(next)
    localStorage.setItem('lang', next)
  }
  const [step, setStep] = useState(-1) // -1=pilot gate, 0=role select, 1=plan(owner only), 2=details, 3=sent
  const [pilotCode, setPilotCode] = useState('')
  const [pilotError, setPilotError] = useState('')
  const [pilotLoading, setPilotLoading] = useState(false)
  const [role, setRole] = useState<'owner'|'tenant'|'technician'|'staff'>('owner')
  const [ownerType, setOwnerType] = useState<'individual'|'company'>('individual')
  const [plan, setPlan] = useState('basic')
  const [inviteCode, setInviteCode] = useState('')
  const [inviteOrg, setInviteOrg] = useState<{id:string;name:string}|null>(null)
  const [inviteErr, setInviteErr] = useState('')
  // Staff invitation state
  const [staffToken, setStaffToken] = useState('')
  const [staffInfo, setStaffInfo] = useState<{role:string;orgName:string;orgId:string;email:string}|null>(null)
  const [staffTokenErr, setStaffTokenErr] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', org: '', phone: '',
    nationalId: '', crNumber: '', authorizedRep: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sentEmail, setSentEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const T = t[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'

  function set(k: string, v: string) { setForm(f => ({...f, [k]: v})) }

  async function handlePilotCode(e: React.FormEvent) {
    e.preventDefault()
    setPilotLoading(true); setPilotError('')
    const res = await fetch('/api/pilot/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: pilotCode }),
    })
    const { valid } = await res.json()
    setPilotLoading(false)
    if (valid) {
      setStep(0)
    } else {
      window.location.href = '/early-access'
    }
  }

  async function verifyInviteCode() {
    if (!inviteCode.trim()) return
    setLoading(true); setInviteErr('')
    const res = await fetch('/api/org/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inviteCode.trim() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setInviteErr(data.error || T.invalidCode); return }
    setInviteOrg(data.org)
  }

  async function verifyStaffToken(token?: string) {
    const t = (token ?? staffToken).trim()
    if (!t) return
    setLoading(true); setStaffTokenErr('')
    const res = await fetch(`/api/staff/validate?token=${encodeURIComponent(t)}`)
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setStaffTokenErr(data.error || T.invalidToken); return }
    setStaffInfo({ role: data.role, orgName: data.orgName, orgId: data.orgId, email: data.email })
    // Pre-fill email from invitation
    if (data.email) setForm(f => ({ ...f, email: data.email }))
  }

  async function handleResend() {
    setResendLoading(true); setResendSent(false)
    const res = await fetch('/api/auth/resend-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sentEmail, name: form.name, lang }),
    })
    setResendLoading(false)
    if (res.ok) {
      setResendSent(true)
      setTimeout(() => setResendSent(false), 5000)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) { setError(T.passWeak); return }
    if ((role === 'tenant' || role === 'technician') && !inviteOrg) {
      setError(T.inviteRequired); return
    }
    if (role === 'staff' && !staffInfo) {
      setError(T.staffTokenRequired); return
    }
    setLoading(true); setError('')

    // For staff, use the role from the invitation token
    const effectiveRole = role === 'staff' ? (staffInfo?.role ?? 'property_manager') : role

    // For individual owners, org_name = their full name
    const orgName = role === 'owner'
      ? (ownerType === 'company' ? form.org : form.name)
      : null

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          role: effectiveRole,
          lang,
          organization_id: role === 'staff' ? (staffInfo?.orgId ?? null) : (inviteOrg?.id ?? null),
          plan: role === 'owner' ? plan : null,
          org_name: orgName,
          phone: form.phone,
          staff_token: role === 'staff' ? staffToken : undefined,
          owner_type: role === 'owner' ? ownerType : undefined,
          national_id: role === 'owner' && ownerType === 'individual' ? (form.nationalId || undefined) : undefined,
          cr_number: role === 'owner' && ownerType === 'company' ? (form.crNumber || undefined) : undefined,
          authorized_rep: role === 'owner' && ownerType === 'company' ? (form.authorizedRep || undefined) : undefined,
        }),
      })
      const data = await res.json()
      setLoading(false)

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.')
        return
      }

      // Notify super admin of new owner registration
      if (role === 'owner') {
        fetch('/api/auth/new-owner-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerName: form.name,
            ownerEmail: form.email,
            ownerPhone: form.phone,
            orgName,
            plan,
            ownerType,
          }),
        }).catch(() => {})
      }

      setUserId(data.userId ?? '')
      setSentEmail(form.email)
      setStep(3)
    } catch (e: unknown) {
      setLoading(false)
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.')
    }
  }

  const selectedPlan = PLANS.find(p => p.id === plan)

  return (
    <div dir={dir} className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <button onClick={toggleLang}
        className={`fixed top-4 ${lang === 'ar' ? 'right-4' : 'left-4'} text-white/70 hover:text-white text-sm font-bold px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition-colors`}>
        {T.lang}
      </button>

      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <a href="https://www.getsuitel.com" className="text-white font-black text-3xl hover:opacity-80 transition-opacity">Get<span className="text-gold-400">Suitel</span></a>
        </div>

        {/* Progress dots */}
        {step > 0 && step < 3 && step !== -1 && (
          <div className="flex items-center justify-center gap-3 mb-6">
            {(role === 'owner' ? [1,2] : [2]).map(s => (
              <div key={s} className={`h-2 rounded-full transition-all ${s === step ? 'w-8 bg-gold-400' : s < step ? 'w-4 bg-gold-400' : 'w-4 bg-white/30'}`}/>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Step -1 — Pilot gate */}
          {step === -1 && (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-navy-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-navy-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {lang === 'ar' ? 'وصول تجريبي' : 'Pilot Access'}
                </h2>
                <p className="text-slate-500 text-sm">
                  {lang === 'ar' ? 'أدخل رمز الوصول الذي أرسله لك فريقنا' : 'Enter the access code provided by our team'}
                </p>
              </div>
              <form onSubmit={handlePilotCode} className="space-y-4">
                <input
                  type="text"
                  value={pilotCode}
                  onChange={e => setPilotCode(e.target.value)}
                  required
                  className="input text-center font-mono tracking-widest text-lg uppercase"
                  placeholder={lang === 'ar' ? 'رمز الوصول' : 'ACCESS CODE'}
                  autoFocus
                />
                {pilotError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg text-center">{pilotError}</div>
                )}
                <button type="submit" disabled={pilotLoading || !pilotCode.trim()} className="btn-primary w-full py-3">
                  {pilotLoading ? <Loader2 size={16} className="animate-spin inline mr-2"/> : null}
                  {lang === 'ar' ? 'متابعة' : 'Continue'}
                </button>
              </form>
              <p className="text-center text-xs text-slate-400 mt-4">
                {lang === 'ar' ? 'لا تملك رمزاً؟' : "Don't have a code?"}{' '}
                <a href="/early-access" className="text-navy-700 hover:underline font-medium">
                  {lang === 'ar' ? 'اطلب الوصول المبكر' : 'Request early access'}
                </a>
              </p>
            </>
          )}

          {/* Step 0 — Role selection */}
          {step === 0 && (
            <>
              <h2 className="text-xl font-bold mb-5">{T.step0Sub}</h2>
              <div className="space-y-3 mb-6">
                {([
                  { role: 'owner', emoji: '🏢', title: lang==='ar'?'مالك عقار':'Property Owner', desc: lang==='ar'?'أدر عقاراتك وعقودك وفواتيرك':'Manage your properties, contracts, and invoices' },
                  { role: 'tenant', emoji: '🏠', title: lang==='ar'?'مستأجر':'Tenant', desc: lang==='ar'?'اعرض عقدك وادفع الإيجار وأبلغ عن الصيانة':'View your contract, pay rent, submit maintenance' },
                  { role: 'technician', emoji: '🔧', title: lang==='ar'?'فني صيانة':'Technician', desc: lang==='ar'?'اعرض أوامر العمل وحدّث حالة الإصلاح':'View work orders and update repair status' },
                  { role: 'staff', emoji: '💼', title: T.staffTitle, desc: T.staffDesc },
                ] as const).map(r => (
                  <button key={r.role} type="button" onClick={() => setRole(r.role as typeof role)}
                    className={`w-full text-start p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${role===r.role ? 'border-navy-700 bg-navy-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className="text-2xl">{r.emoji}</span>
                    <div>
                      <div className="font-semibold text-slate-900">{r.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(role === 'owner' ? 1 : 2)} className="btn-primary w-full py-3">
                {T.next}
              </button>
              <p className="text-center text-sm text-slate-500 mt-4">
                {T.haveAccount} <Link href="/auth/login" className="text-navy-700 font-semibold hover:underline">{T.signin}</Link>
              </p>
            </>
          )}

          {/* Step 3 — Sent */}
          {step === 3 && (
            <div className="text-center">
              <CheckCircle size={52} className="text-green-500 mx-auto mb-4"/>
              <h2 className="text-xl font-bold mb-2">{T.sentTitle}</h2>
              <p className="text-slate-500 text-sm mb-1">{T.sentBody}</p>
              <p className="text-navy-700 font-semibold text-sm mb-3">{sentEmail}</p>
              <p className="text-slate-400 text-xs mb-6">{T.sentNote}</p>
              <Link href="/auth/login" className="btn-primary block mb-4">{T.signin}</Link>
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-xs text-slate-400 mb-2">{T.didntReceive}</p>
                <button
                  onClick={handleResend}
                  disabled={resendLoading || resendSent}
                  className="text-sm text-navy-700 hover:underline font-semibold disabled:opacity-50 block mx-auto"
                >
                  {resendLoading ? <Loader2 size={14} className="animate-spin inline mr-1"/> : null}
                  {resendSent ? T.resentOk : T.resend}
                </button>
                <button
                  onClick={() => { setStep(2); setError('') }}
                  className="text-xs text-slate-400 hover:text-slate-600 block mx-auto mt-1"
                >
                  {T.wrongEmail}
                </button>
              </div>
            </div>
          )}

          {/* Step 1 — Plan */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold mb-1">{T.step1}</h2>
              <p className="text-slate-500 text-sm mb-5">{T.step1Sub}</p>
              <div className="space-y-3 mb-6">
                {PLANS.map(p => (
                  <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                    className={`w-full text-start p-4 rounded-xl border-2 transition-all ${plan===p.id ? 'border-navy-700 bg-navy-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{lang==='ar'?p.nameAr:p.nameEn}
                          {p.popular && <span className="ml-2 text-xs bg-gold-500 text-white px-2 py-0.5 rounded-full">{T.popular}</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{lang==='ar'?p.descAr:p.descEn}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-navy-700 text-lg">${p.price}<span className="text-xs font-normal text-slate-400">{T.perMonth}</span></div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="btn-primary w-full py-3">{T.next}</button>
              <p className="text-center text-sm text-slate-500 mt-4">
                {T.haveAccount} <Link href="/auth/login" className="text-navy-700 font-semibold hover:underline">{T.signin}</Link>
              </p>
            </>
          )}

          {/* Step 2 — Details */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setStep(role === 'owner' ? 1 : 0)} className="text-slate-400 hover:text-slate-600 text-sm">{lang === 'ar' ? '→' : '←'}</button>
                <h2 className="text-xl font-bold">{T.step2}</h2>
                {role === 'owner' && selectedPlan && (
                  <span className="ml-auto text-xs bg-navy-100 text-navy-700 px-2.5 py-1 rounded-full font-medium">
                    {lang==='ar'?selectedPlan.nameAr:selectedPlan.nameEn}
                  </span>
                )}
                {role !== 'owner' && (
                  <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium capitalize">{role}</span>
                )}
              </div>

              {/* Owner type toggle */}
              {role === 'owner' && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{T.ownerTypeLabel}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { type: 'individual' as const, emoji: '👤', title: T.individual, desc: T.individualDesc },
                      { type: 'company' as const, emoji: '🏢', title: T.company, desc: T.companyDesc },
                    ]).map(o => (
                      <button key={o.type} type="button" onClick={() => setOwnerType(o.type)}
                        className={`text-start p-3 rounded-xl border-2 transition-all ${ownerType === o.type ? 'border-navy-700 bg-navy-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="text-lg mb-1">{o.emoji}</div>
                        <div className="text-sm font-semibold text-slate-900">{o.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{o.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Staff invitation token */}
              {role === 'staff' && (
                <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {T.staffTokenLabel}
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 font-mono text-sm"
                      placeholder="Paste your invitation token"
                      value={staffToken}
                      onChange={e => { setStaffToken(e.target.value); setStaffInfo(null); setStaffTokenErr('') }}
                    />
                    <button type="button" onClick={() => verifyStaffToken()} disabled={loading || !staffToken}
                      className="btn-secondary px-3 text-sm whitespace-nowrap">
                      {loading ? '...' : T.verify}
                    </button>
                  </div>
                  {staffTokenErr && <div className="text-red-600 text-xs mt-1">{staffTokenErr}</div>}
                  {staffInfo && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <span>✓</span>
                      <span><strong>{staffInfo.orgName}</strong> — {staffInfo.role === 'property_manager' ? 'Property Manager' : 'Financial Manager'}</span>
                    </div>
                  )}
                  <div className="text-xs text-slate-400 mt-2">{T.staffTokenHint}</div>
                </div>
              )}

              {/* Invite code for tenant/technician */}
              {(role === 'tenant' || role === 'technician') && (
                <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    {T.inviteLabel}
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1 font-mono uppercase tracking-widest"
                      placeholder="e.g. A1B2C3D4"
                      value={inviteCode}
                      onChange={e => { setInviteCode(e.target.value); setInviteOrg(null); setInviteErr('') }}
                      maxLength={8}
                    />
                    <button type="button" onClick={verifyInviteCode} disabled={loading || !inviteCode}
                      className="btn-secondary px-3 text-sm whitespace-nowrap">
                      {loading ? '...' : T.verify}
                    </button>
                  </div>
                  {inviteErr && <div className="text-red-600 text-xs mt-1">{inviteErr}</div>}
                  {inviteOrg && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <span>✓</span> <span className="font-semibold">{inviteOrg.name}</span>
                    </div>
                  )}
                  <div className="text-xs text-slate-400 mt-2">{T.inviteHint}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">

                  {/* Individual owner fields */}
                  {role === 'owner' && ownerType === 'individual' && (
                    <>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.name}</label>
                        <input value={form.name} onChange={e=>set('name',e.target.value)} required className="input" placeholder={lang==='ar'?'أنور العامري':'Anwar Al-Ameri'}/>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          {T.nationalId} <span className="text-slate-400 font-normal">({lang==='ar'?'اختياري':'optional'})</span>
                        </label>
                        <input value={form.nationalId} onChange={e=>set('nationalId',e.target.value)} className="input" placeholder={T.nationalIdPlaceholder}/>
                      </div>
                    </>
                  )}

                  {/* Company owner fields */}
                  {role === 'owner' && ownerType === 'company' && (
                    <>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.companyName}</label>
                        <input value={form.org} onChange={e=>set('org',e.target.value)} required className="input" placeholder={T.companyNamePlaceholder}/>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          {T.crNumber} <span className="text-slate-400 font-normal">({lang==='ar'?'اختياري':'optional'})</span>
                        </label>
                        <input value={form.crNumber} onChange={e=>set('crNumber',e.target.value)} className="input" placeholder={T.crPlaceholder}/>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.authorizedRep}</label>
                        <input value={form.authorizedRep} onChange={e=>set('authorizedRep',e.target.value)} required className="input" placeholder={T.authorizedRepPlaceholder}/>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.name} ({lang==='ar'?'للتواصل':'for contact'})</label>
                        <input value={form.name} onChange={e=>set('name',e.target.value)} required className="input" placeholder={lang==='ar'?'أنور العامري':'Anwar Al-Ameri'}/>
                      </div>
                    </>
                  )}

                  {/* Non-owner name field */}
                  {role !== 'owner' && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.name}</label>
                      <input value={form.name} onChange={e=>set('name',e.target.value)} required className="input" placeholder={lang==='ar'?'أنور العامري':'Anwar Al-Ameri'}/>
                    </div>
                  )}

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.email}</label>
                    <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} required className="input" placeholder="you@example.com"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.phone}</label>
                    <PhoneInput value={form.phone} onChange={v => set('phone', v)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{T.pass}</label>
                    <div className="relative">
                      <input type={showPass?'text':'password'} value={form.password} onChange={e=>set('password',e.target.value)}
                        required className="input pr-10" placeholder="••••••••"/>
                      <button type="button" onClick={()=>setShowPass(v=>!v)}
                        className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                        {showPass?<EyeOff size={16}/>:<Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <><Loader2 size={16} className="animate-spin"/>{T.loading}</> : T.submit}
                </button>
                <p className="text-xs text-slate-400 text-center">
                  {T.terms} <Link href="/terms" className="underline">{T.termsLink}</Link> & <Link href="/privacy" className="underline">{T.privacyLink}</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
