'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Volume2, VolumeX, ChevronRight } from 'lucide-react'
import { TOUR_STEPS, getDemoState, setDemoState, clearDemoState } from '@/lib/demo/config'
import { createClient } from '@/lib/supabase/client'

function speakText(text: string, muted: boolean, lang: 'en' | 'ar') {
  if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = lang === 'ar' ? 0.85 : 0.88
  utterance.pitch = 1.0

  function doSpeak() {
    const voices = window.speechSynthesis.getVoices()
    let voice = undefined
    if (lang === 'ar') {
      voice =
        voices.find(v => v.lang === 'ar-SA') ||
        voices.find(v => v.lang === 'ar-EG') ||
        voices.find(v => v.lang.startsWith('ar'))
      utterance.lang = voice?.lang ?? 'ar-SA'
    } else {
      voice =
        voices.find(v => v.name === 'Samantha') ||
        voices.find(v => v.name === 'Google US English') ||
        voices.find(v => v.lang === 'en-US' && v.localService) ||
        voices.find(v => v.lang.startsWith('en-'))
      utterance.lang = 'en-US'
    }
    if (voice) utterance.voice = voice
    window.speechSynthesis.speak(utterance)
  }

  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) doSpeak()
  else window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
}

export default function DemoTourPanel() {
  const [step, setStep] = useState(0)
  const [muted, setMuted] = useState(false)
  const [lang, setLang] = useState<'en' | 'ar'>('en')
  const router = useRouter()
  const mutedRef = useRef(false)
  const langRef = useRef<'en' | 'ar'>('en')

  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { langRef.current = lang }, [lang])

  // Init: load step + language (from localStorage set at demo entry, or profile fallback)
  useEffect(() => {
    const initStep = getDemoState().step ?? 0
    setStep(initStep)

    // Read language stored when user clicked "Try Demo" on landing page
    let storedLang: 'en' | 'ar' = 'en'
    try {
      const v = localStorage.getItem('gs_demo_lang')
      if (v === 'ar') storedLang = 'ar'
    } catch {}

    setLang(storedLang)
    langRef.current = storedLang

    setTimeout(() => {
      const step0 = TOUR_STEPS[initStep]
      const text = storedLang === 'ar' ? step0?.audioAr : step0?.audio
      speakText(text ?? '', mutedRef.current, storedLang)
    }, 900)
  }, [])

  function handleNext() {
    const newStep = step + 1
    if (newStep >= TOUR_STEPS.length) return
    setDemoState({ step: newStep })
    setStep(newStep)
    router.push(TOUR_STEPS[newStep].path)
    const text = langRef.current === 'ar' ? TOUR_STEPS[newStep].audioAr : TOUR_STEPS[newStep].audio
    setTimeout(() => speakText(text, mutedRef.current, langRef.current), 600)
  }

  async function handleExit() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    clearDemoState()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }

  const current = TOUR_STEPS[step]
  if (!current) return null

  const isLast = step === TOUR_STEPS.length - 1
  const progress = Math.round((step / (TOUR_STEPS.length - 1)) * 100)
  const isAr = lang === 'ar'

  const title = isAr ? current.titleAr : current.title
  const description = isAr ? current.descriptionAr : current.description
  const currentAudio = isAr ? current.audioAr : current.audio

  return (
    <div
      className={`fixed bottom-6 ${isAr ? 'left-6' : 'right-6'} z-[100] w-[300px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="bg-navy-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gold-400 animate-pulse flex-shrink-0" />
          <span className="text-gold-400 font-bold text-sm">Live Demo</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => speakText(currentAudio, mutedRef.current, langRef.current)}
            title="Replay audio"
            className="text-white/40 hover:text-white/80 transition-colors text-sm leading-none px-0.5"
          >↻</button>
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
            className="text-white/50 hover:text-white transition-colors"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button onClick={handleExit} title="Exit demo" className="text-white/50 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-gold-400 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
          {step === 0
            ? (isAr ? 'مقدمة' : 'Introduction')
            : isLast
            ? (isAr ? 'اكتمل!' : 'Complete!')
            : isAr
            ? `خطوة ${step} من ${TOUR_STEPS.length - 2}`
            : `Step ${step} of ${TOUR_STEPS.length - 2}`}
        </p>
        <h3 className="font-bold text-slate-900 text-sm mb-2">{title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4">{description}</p>

        {/* Dot progress */}
        <div className="flex items-center gap-1.5 mb-4">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 h-1.5 ${
                i < step ? 'bg-emerald-500 w-5' : i === step ? 'bg-navy-700 w-5' : 'bg-slate-200 w-3'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        {isLast ? (
          <div className="space-y-2">
            <p className="text-center text-xs text-slate-400 mb-1">
              {isAr ? 'هل أنت مستعد للبدء؟' : 'Ready to get started?'}
            </p>
            <button
              onClick={handleExit}
              className="w-full flex items-center justify-center gap-2 bg-navy-700 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {isAr ? 'العودة للرئيسية' : 'Back to Home'}
              <ChevronRight size={14} className={isAr ? 'rotate-180' : ''} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 bg-navy-700 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {step === 0 ? (isAr ? 'لنبدأ' : "Let's Start") : (isAr ? 'التالي' : 'Next')}
              <ChevronRight size={14} className={isAr ? 'rotate-180' : ''} />
            </button>
            {step > 0 && (
              <button
                onClick={handleExit}
                className="w-full text-center text-slate-400 hover:text-slate-600 text-xs py-1 transition-colors"
              >
                {isAr ? 'خروج من الجولة' : 'Exit Demo'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
