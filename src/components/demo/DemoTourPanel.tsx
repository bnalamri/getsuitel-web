'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { X, Volume2, VolumeX, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { TOUR_STEPS, getDemoState, setDemoState, clearDemoState } from '@/lib/demo/config'
import { createClient } from '@/lib/supabase/client'

function speakText(text: string, muted: boolean) {
  if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.88
  utterance.pitch = 1.0
  utterance.lang = 'en-US'

  function doSpeak() {
    const voices = window.speechSynthesis.getVoices()
    const preferred =
      voices.find(v => v.name === 'Samantha') ||
      voices.find(v => v.name === 'Google US English') ||
      voices.find(v => v.lang === 'en-US' && v.localService) ||
      voices.find(v => v.lang.startsWith('en-'))
    if (preferred) utterance.voice = preferred
    window.speechSynthesis.speak(utterance)
  }

  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    doSpeak()
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
  }
}

export default function DemoTourPanel() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [muted, setMuted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const mutedRef = useRef(false)

  // Sync muted ref so callbacks see latest value
  useEffect(() => { mutedRef.current = muted }, [muted])

  // Init step from localStorage + speak welcome
  useEffect(() => {
    const state = getDemoState()
    const initStep = state.step ?? 0
    setStep(initStep)
    setTimeout(() => speakText(TOUR_STEPS[initStep]?.audio ?? '', mutedRef.current), 900)
  }, [])

  const advanceStep = useCallback((newStep: number, extraState?: Record<string, any>) => {
    setDemoState({ step: newStep, ...(extraState ?? {}) })
    setStep(newStep)
    setLoading(false)

    const nextConfig = TOUR_STEPS[newStep]
    if (!nextConfig) return

    // Build navigation URL
    let nextPath = nextConfig.path
    if (newStep === 2) {
      // Navigate to units filtered by newly created property
      const state = getDemoState()
      const pid = extraState?.propertyId ?? state.propertyId
      if (pid) nextPath = `/dashboard/owner/units?property=${pid}`
    }

    if (nextPath !== pathname) {
      router.push(nextPath)
    }

    setTimeout(() => speakText(nextConfig.audio, mutedRef.current), 700)
  }, [pathname, router])

  async function handleNext() {
    const currentConfig = TOUR_STEPS[step]
    if (!currentConfig) return

    if (!currentConfig.needsSubmit) {
      advanceStep(step + 1)
      return
    }

    setLoading(true)

    // Listen for form completion
    const doneHandler = (e: Event) => {
      window.removeEventListener('demo:done', doneHandler)
      const detail = (e as CustomEvent).detail ?? {}
      const extra: Record<string, any> = {}
      if (detail.propertyId) extra.propertyId = detail.propertyId
      if (detail.unitId) extra.unitId = detail.unitId
      advanceStep(step + 1, extra)
    }
    window.addEventListener('demo:done', doneHandler)

    // Trigger the active form to submit
    window.dispatchEvent(new CustomEvent('demo:next', { detail: { step } }))

    // Failsafe timeout
    setTimeout(() => {
      window.removeEventListener('demo:done', doneHandler)
      setLoading(false)
    }, 15000)
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

  function replayAudio() {
    speakText(TOUR_STEPS[step]?.audio ?? '', mutedRef.current)
  }

  const currentConfig = TOUR_STEPS[step]
  if (!currentConfig) return null

  const totalSteps = TOUR_STEPS.length - 2 // exclude welcome and done
  const displayStep = step === 0 ? 'Introduction' : step >= TOUR_STEPS.length - 1 ? 'Complete!' : `Step ${step} of ${totalSteps}`

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-[300px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-navy-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gold-400 animate-pulse flex-shrink-0" />
          <span className="text-gold-400 font-bold text-sm">Live Demo</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={replayAudio}
            title="Replay audio"
            className="text-white/40 hover:text-white/80 transition-colors text-xs px-1"
          >
            ↻
          </button>
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
            className="text-white/50 hover:text-white transition-colors"
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            onClick={handleExit}
            title="Exit demo"
            className="text-white/50 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-gold-400 transition-all duration-700 ease-out"
          style={{ width: `${(step / (TOUR_STEPS.length - 1)) * 100}%` }}
        />
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1">
          {displayStep}
        </p>
        <h3 className="font-bold text-slate-900 text-sm mb-2">{currentConfig.title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4">{currentConfig.description}</p>

        {/* Dot progress */}
        <div className="flex items-center gap-1.5 mb-4">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-400 h-1.5 ${
                i < step
                  ? 'bg-emerald-500 w-5'
                  : i === step
                  ? 'bg-navy-700 w-5'
                  : 'bg-slate-200 w-3'
              }`}
            />
          ))}
        </div>

        {/* Action buttons */}
        {step >= TOUR_STEPS.length - 1 ? (
          <div className="space-y-2">
            <Link
              href="/auth/register"
              onClick={clearDemoState}
              className="flex items-center justify-center gap-2 w-full bg-gold-500 hover:bg-gold-400 text-navy-900 font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              Sign Up Free <ChevronRight size={14} />
            </Link>
            <button
              onClick={handleExit}
              className="w-full text-center text-slate-400 hover:text-slate-600 text-xs py-1 transition-colors"
            >
              Exit Demo
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleNext}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-navy-700 hover:bg-navy-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  {currentConfig.nextLabel}
                  <ChevronRight size={14} />
                </>
              )}
            </button>
            {step > 0 && (
              <button
                onClick={handleExit}
                className="w-full text-center text-slate-400 hover:text-slate-600 text-xs py-1 transition-colors"
              >
                Exit Demo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
