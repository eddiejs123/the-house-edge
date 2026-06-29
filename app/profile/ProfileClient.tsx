'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { saveAvatar } from '@/app/actions'
import { createClient } from '@/lib/supabase/client'

const STYLES = [
  { id: 'bottts-neutral', label: 'Robots' },
  { id: 'pixel-art',      label: 'Pixel' },
  { id: 'adventurer',     label: 'Adventurer' },
  { id: 'lorelei',        label: 'Lorelei' },
  { id: 'micah',          label: 'Micah' },
  { id: 'croodles',       label: 'Doodles' },
  { id: 'thumbs',         label: 'Thumbs' },
  { id: 'open-peeps',     label: 'Peeps' },
]

function dicebearUrl(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundColor=0f172a`
}

function randSeed() {
  return Math.random().toString(36).slice(2, 10)
}

interface Props {
  userId: string
  username: string
  currentStyle: string
  currentSeed: string | null
  currentAvatarUrl: string | null
}

export default function ProfileClient({ userId, username, currentStyle, currentSeed, currentAvatarUrl }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [style, setStyle] = useState(currentStyle)
  const [seed, setSeed] = useState(currentSeed ?? username)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(currentAvatarUrl)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Which tab is active: 'generated' or 'photo'
  const [tab, setTab] = useState<'generated'|'photo'>(currentAvatarUrl ? 'photo' : 'generated')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return }
    setPreviewFile(file)
    setPreviewSrc(URL.createObjectURL(file))
    setError('')
  }

  async function handleSave() {
    setSaving(true); setError('')
    try {
      if (tab === 'photo' && previewFile) {
        // Upload to Supabase Storage
        const ext = previewFile.name.split('.').pop() ?? 'jpg'
        const path = `${userId}/avatar.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('Avatars')
          .upload(path, previewFile, { upsert: true, contentType: previewFile.type })
        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabase.storage.from('Avatars').getPublicUrl(path)
        // Bust cache by appending timestamp
        const urlWithBust = `${publicUrl}?t=${Date.now()}`

        await supabase.from('profiles').update({ avatar_url: urlWithBust }).eq('id', userId)
        setAvatarUrl(urlWithBust)
        setPreviewSrc(urlWithBust)
      } else if (tab === 'generated') {
        // Clear any custom photo, save generated style
        await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
        await saveAvatar(style, seed)
        setAvatarUrl(null)
        setPreviewSrc(null)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  const displaySrc = tab === 'photo'
    ? (previewSrc ?? dicebearUrl(style, seed))
    : dicebearUrl(style, seed)

  const panelStyle: React.CSSProperties = {
    background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 18, padding: 24, marginBottom: 16,
  }
  const tabBtn = (t: 'generated'|'photo'): React.CSSProperties => ({
    flex: 1, fontFamily: 'JetBrains Mono,monospace', fontSize: 12, letterSpacing: '.1em',
    textTransform: 'uppercase', background: tab===t ? 'var(--felt)' : 'none',
    color: tab===t ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 8,
    padding: '8px 0', cursor: 'pointer',
  })

  return (
    <>
      <Nav />
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px clamp(16px,4vw,48px)' }}>
        <h2 style={{ fontFamily: 'Fraunces,serif', fontWeight: 900, fontSize: 36, marginBottom: 28 }}>Your Profile</h2>

        {/* Preview */}
        <div style={{ ...panelStyle, display: 'flex', alignItems: 'center', gap: 24 }}>
          <img
            src={displaySrc}
            alt="Your avatar"
            width={96} height={96}
            style={{ borderRadius: '50%', border: '3px solid rgba(255,207,92,.4)', background: '#0f172a', flexShrink: 0, objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontFamily: 'Fraunces,serif', fontWeight: 600, fontSize: 22 }}>@{username}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
              {tab === 'generated'
                ? <>Style: <span style={{ color:'var(--gold)' }}>{STYLES.find(s=>s.id===style)?.label}</span></>
                : <span style={{ color:'var(--gold)' }}>Custom photo</span>
              }
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display:'flex', gap:4, background:'var(--panel2)', border:'1px solid var(--line)', borderRadius:10, padding:4, marginBottom:16 }}>
          <button style={tabBtn('generated')} onClick={() => setTab('generated')}>Generated character</button>
          <button style={tabBtn('photo')} onClick={() => setTab('photo')}>My photo</button>
        </div>

        {/* Generated character picker */}
        {tab === 'generated' && (
          <div style={panelStyle}>
            <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:11,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--gold)',marginBottom:16 }}>
              Choose a style
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px,1fr))', gap:12, marginBottom:16 }}>
              {STYLES.map(s => (
                <button key={s.id} onClick={() => setStyle(s.id)} style={{
                  background: style===s.id ? 'rgba(255,207,92,.12)' : 'var(--panel2)',
                  border: `2px solid ${style===s.id ? 'var(--gold)' : 'var(--line)'}`,
                  borderRadius:14, padding:'12px 8px', cursor:'pointer',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'.15s',
                }}>
                  <img src={dicebearUrl(s.id, seed)} alt={s.label} width={56} height={56} style={{ borderRadius:'50%', background:'#0f172a' }} />
                  <span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:10,letterSpacing:'.08em',color:style===s.id?'var(--gold)':'var(--muted)' }}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setSeed(randSeed())} style={{
              fontFamily:'JetBrains Mono,monospace',fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',
              background:'rgba(255,255,255,.07)',border:'1px solid var(--line2)',borderRadius:8,
              color:'var(--text)',padding:'8px 16px',cursor:'pointer',
            }}>
              ↻ Try another look
            </button>
          </div>
        )}

        {/* Photo upload */}
        {tab === 'photo' && (
          <div style={panelStyle}>
            <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:11,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--gold)',marginBottom:16 }}>
              Upload a photo
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display:'none' }}
            />
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed var(--line2)', borderRadius:14, padding:'32px 24px',
                textAlign:'center', cursor:'pointer', transition:'.15s',
                background: previewSrc ? 'rgba(255,255,255,.03)' : 'transparent',
              }}
            >
              {previewSrc ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                  <img src={previewSrc} alt="preview" width={80} height={80} style={{ borderRadius:'50%', objectFit:'cover', border:'3px solid rgba(255,207,92,.4)' }} />
                  <span style={{ color:'var(--muted)', fontSize:13 }}>Click to change photo</span>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize:36, marginBottom:8 }}>📷</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--muted)',letterSpacing:'.06em' }}>
                    Click to choose from camera roll
                  </div>
                  <div style={{ fontSize:12,color:'var(--muted)',marginTop:6,opacity:.6 }}>JPG, PNG, GIF · max 5 MB</div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div style={{ color:'var(--bad)',fontSize:13,padding:'10px 14px',background:'rgba(255,77,109,.1)',borderRadius:10,marginBottom:12 }}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving || (tab==='photo' && !previewFile && !avatarUrl)}
          style={{
            width:'100%', fontFamily:'JetBrains Mono,monospace', letterSpacing:'.16em',
            textTransform:'uppercase', fontSize:12,
            background: saved ? 'var(--good)' : 'var(--gold)',
            color: saved ? '#06281c' : '#1a1208',
            border:'none', borderRadius:12, padding:14,
            cursor: saving ? 'default' : 'pointer',
            fontWeight:700, opacity: saving ? .7 : 1, transition:'.2s',
          }}
        >
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save avatar'}
        </button>
      </div>
    </>
  )
}
