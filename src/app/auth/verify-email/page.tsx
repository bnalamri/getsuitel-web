'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const searchParams = new URLSearchParams(window.location.search)
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (tokenHash && type) {
      // token_hash approach — works cross-device, no PKCE needed
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'signup' | 'email' })
        .then(({ data, error }) => {
          if (error || !data.session) {
            setStatus('error')
          } else {
            setStatus('success')
            setTimeout(() => { window.location.href = '/dashboard' }, 2000)
          }
        })
      return
    }

    // Fallback: implicit flow hash tokens
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ data, error }) => {
            if (error || !data.session) setStatus('error')
            else { setStatus('success'); setTimeout(() => { window.location.href = '/dashboard' }, 2000) }
          })
        return
      }
    }

    // Already signed in?
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus('success')
        setTimeout(() => router.push('/dashboard'), 2000)
      } else {
        setStatus('error')
      }
    })
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
        <a href="https://www.getsuitel.com" className="font-black text-2xl text-navy-800 mb-8 block hover:opacity-80 transition-opacity">
          Get<span className="text-gold-500">Suitel</span>
        </a>

        {status === 'loading' && (
          <>
            <Loader2 size={52} className="animate-spin text-navy-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying your email…</h2>
            <p className="text-slate-500 text-sm">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Email verified!</h2>
            <p className="text-slate-500 text-sm mb-6">Your account is active. Redirecting you to the dashboard…</p>
            <a href="/dashboard" className="btn-primary">Go to Dashboard</a>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={52} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Verification failed</h2>
            <p className="text-slate-500 text-sm mb-6">The link may have expired or already been used. Try signing in directly.</p>
            <Link href="/auth/login" className="btn-primary">Sign In</Link>
          </>
        )}
      </div>
    </div>
  )
}
