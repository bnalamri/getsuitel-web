'use client'
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html><body style={{padding:'2rem',fontFamily:'sans-serif'}}>
      <h2 style={{color:'red'}}>App Error</h2>
      <pre style={{background:'#fee',padding:'1rem',borderRadius:'8px',whiteSpace:'pre-wrap'}}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
      <button onClick={reset} style={{marginTop:'1rem',padding:'0.5rem 1rem'}}>Retry</button>
    </body></html>
  )
}
