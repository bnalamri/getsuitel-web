'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Volume2, VolumeX, ChevronRight } from 'lucide-react'
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
    const voice =
      voices.find(v => v.name === 'Samantha') ||
      voices.find(v => v.name === 'Google US English') ||
      voices.find(v => v.lang === 'en-US' && v.localService) ||
      voices.find(v => v.lang.startsWith('en-'))
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
  const router = useRouter()
  const mutedRef = useRef(false)

  useEffect(() => { mutedRef.current = muted }, [muted])

  // Init from localStorage + speak welcome
  useEffect(() => {
    const initStep = getDemoState().step ?? 0
    setStep(initStep)
    setTimeout(() => speakText(TOUR_STEPS[initStep]?.audio ?? '', mutedRef.current), 900)
  }, [])

  function handleNext() {
    const newStep = step + 1
    if (newStep >= TOUR_STEPS.length) return
    setDemoState({ step: newStep })
    setStep(newStep)
    const nextPath = TOUR_STEPS[newStep].path
    router.push(nextPath)
    setTimeout(() => speakText(TOUR_STEPS[newStep].audio, mutedRef.current), 600)
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
            onClick={() => speakText(current.audio, mutedRef.current)}
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
          {step === 0 ? 'Introduction' : isLast ? 'Complete!' : `Step ${step} of ${TOUR_STEPS.length - 2}`}
        </p>
        <h3 className="font-bold text-slate-900 text-sm mb-2">{current.title}</h3>
        <p className="text-slate-500 text-sm leading-relaxed mb-4">{current.description}</p>

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
            <p className="text-center text-xs text-slate-400 mb-1">Ready to get started?</p>
            <button
              onClick={handleExit}
              className="w-full flex items-center justify-center gap-2 bg-navy-700 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Back to Home <ChevronRight size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 bg-navy-700 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {step === 0 ? "Let's Start" : 'Next'} <ChevronRight size={14} />
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
