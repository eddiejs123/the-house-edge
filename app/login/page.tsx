'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      if (mode === 'signup') {
        if (!username.trim()) { setError('Username is required'); setLoading(false); return }
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
        if (signUpErr) throw signUpErr
        const userId = data.user?.id
        if (userId) {
          await supabase.from('profiles').insert({ id: userId, username: username.trim() })
        }
        // Sign in immediately after signup so we don't depend on Supabase returning a session
        const { error: autoSignInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (autoSignInErr) {
          // Confirmation still required — show message but with correct instructions
          setConfirm(true)
        } else {
          router.push('/')
          router.refresh()
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) throw signInErr
        router.push('/')
        router.refresh()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: 'var(--panel2)',
    border: '1px solid var(--line2)', borderRadius: 10, color: 'var(--text)',
    fontFamily: 'Inter, sans-serif', fontSize: 15, outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '.16em',
    textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 6,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:11,letterSpacing:'.32em',textTransform:'uppercase',color:'var(--gold)',marginBottom:10 }}>Basic Strategy · Trainer</div>
          <h1 style={{ fontFamily:'Fraunces,serif',fontWeight:900,fontSize:42,lineHeight:.95,color:'var(--text)' }}>
            The <em style={{ fontStyle:'italic',color:'var(--gold)' }}>House</em> Edge
          </h1>
        </div>

        {confirm ? (
          <div style={{ background:'rgba(34,201,138,.1)',border:'1px solid rgba(34,201,138,.3)',borderRadius:14,padding:24,textAlign:'center' }}>
            <div style={{ fontFamily:'Fraunces,serif',fontSize:22,color:'var(--good)',marginBottom:8 }}>Check your email</div>
            <p style={{ color:'var(--muted)',fontSize:14 }}>We sent a confirmation link to <b style={{ color:'var(--text)' }}>{email}</b>. Click it to activate your account, then come back and sign in.</p>
          </div>
        ) : (
          <div style={{ background:'var(--panel)',border:'1px solid var(--line)',borderRadius:18,padding:28 }}>
            <div style={{ display:'flex',gap:4,background:'var(--panel2)',border:'1px solid var(--line)',borderRadius:10,padding:4,marginBottom:24 }}>
              {(['login','signup'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                  flex:1,fontFamily:'JetBrains Mono,monospace',fontSize:12,letterSpacing:'.1em',textTransform:'uppercase',
                  background: mode===m?'var(--felt)':'none', color: mode===m?'#fff':'var(--muted)',
                  border:'none',borderRadius:8,padding:'8px 0',cursor:'pointer',
                }}>
                  {m === 'login' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={submit} style={{ display:'flex',flexDirection:'column',gap:16 }}>
              {mode === 'signup' && (
                <div>
                  <label style={labelStyle}>Username</label>
                  <input style={inputStyle} value={username} onChange={e=>setUsername(e.target.value)} placeholder="your_handle" autoComplete="username" />
                </div>
              )}
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input style={inputStyle} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode==='login'?'current-password':'new-password'} />
              </div>
              {error && <div style={{ color:'var(--bad)',fontSize:13,padding:'8px 12px',background:'rgba(255,77,109,.1)',borderRadius:8 }}>{error}</div>}
              <button type="submit" disabled={loading} style={{
                width:'100%',fontFamily:'JetBrains Mono,monospace',letterSpacing:'.16em',textTransform:'uppercase',
                fontSize:12,background:'var(--gold)',color:'#1a1208',border:'none',borderRadius:12,
                padding:14,cursor:loading?'default':'pointer',fontWeight:700,opacity:loading?.7:1,
              }}>
                {loading ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
