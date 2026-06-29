'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile { username: string; avatar_style: string; avatar_seed: string | null; avatar_url: string | null }

export default function Nav() {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('username, avatar_style, avatar_seed, avatar_url').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const linkStyle = (href: string): React.CSSProperties => ({
    fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '.12em',
    textTransform: 'uppercase', color: path === href ? 'var(--gold)' : 'var(--muted)',
    textDecoration: 'none', padding: '6px 12px', borderRadius: 8,
    background: path === href ? 'rgba(255,207,92,.1)' : 'none',
  })

  const avatarSrc = profile
    ? profile.avatar_url ?? `https://api.dicebear.com/9.x/${profile.avatar_style ?? 'bottts-neutral'}/svg?seed=${encodeURIComponent(profile.avatar_seed ?? profile.username)}&radius=50&backgroundColor=0f172a`
    : null

  return (
    <nav style={{
      maxWidth: 980, margin: '0 auto', padding: '12px clamp(16px,4vw,48px) 0',
      display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end',
    }}>
      <Link href="/" style={linkStyle('/')}>Train</Link>
      <Link href="/friends" style={linkStyle('/friends')}>Friends</Link>
      <Link href="/leaderboard" style={linkStyle('/leaderboard')}>Leaderboard</Link>

      <Link href="/profile" style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', padding: '4px 8px', borderRadius: 10, background: path==='/profile'?'rgba(255,207,92,.1)':'none' }}>
        {avatarSrc ? (
          <img src={avatarSrc} alt="profile" width={28} height={28} style={{ borderRadius: '50%', border: path==='/profile'?'2px solid var(--gold)':'2px solid rgba(255,255,255,.15)', background: '#0f172a' }} />
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.08)', border: '2px solid rgba(255,255,255,.15)' }} />
        )}
        {profile && <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', color: path==='/profile'?'var(--gold)':'var(--muted)' }}>@{profile.username}</span>}
      </Link>

      <button onClick={signOut} style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '.12em',
        textTransform: 'uppercase', color: 'var(--muted)', background: 'none',
        border: 'none', cursor: 'pointer', padding: '6px 12px', marginLeft: 4,
      }}>
        Sign out
      </button>
    </nav>
  )
}
