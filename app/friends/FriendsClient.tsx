'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Avatar from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'

interface FriendProfile { username: string; avatar_style?: string; avatar_seed?: string | null; avatar_url?: string | null }
interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
  profiles?: FriendProfile
}

interface Props {
  userId: string
  sent: Friendship[]
  received: Friendship[]
}

export default function FriendsClient({ userId, sent, received }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [searchResult, setSearchResult] = useState<{ id: string; username: string } | null | 'not-found'>()
  const [searching, setSearching] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true); setSearchResult(undefined); setMsg('')
    const { data } = await supabase.from('profiles').select('id, username').eq('username', search.trim()).single()
    setSearching(false)
    setSearchResult(data ? { id: data.id, username: data.username } : 'not-found')
  }

  async function sendRequest(addresseeId: string) {
    const { error } = await supabase.from('friendships').insert({ requester_id: userId, addressee_id: addresseeId, status: 'pending' })
    if (error) setMsg(error.message)
    else { setMsg('Friend request sent!'); setSearch(''); setSearchResult(undefined); router.refresh() }
  }

  async function respond(id: string, accept: boolean) {
    if (accept) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id)
    } else {
      await supabase.from('friendships').delete().eq('id', id)
    }
    router.refresh()
  }

  const panelStyle: React.CSSProperties = { background:'var(--panel)',border:'1px solid var(--line)',borderRadius:18,padding:24,marginBottom:16 }
  const labelStyle: React.CSSProperties = { fontFamily:'JetBrains Mono,monospace',fontSize:11,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--gold)',marginBottom:12,display:'block' }
  const btnStyle = (color: string): React.CSSProperties => ({
    fontFamily:'JetBrains Mono,monospace',fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',
    background:color,border:'none',borderRadius:8,padding:'7px 14px',cursor:'pointer',fontWeight:700,
  })

  const pendingReceived = received.filter(f => f.status === 'pending')
  const acceptedFriends = [
    ...sent.filter(f => f.status === 'accepted').map(f => f.profiles as FriendProfile),
    ...received.filter(f => f.status === 'accepted').map(f => f.profiles as FriendProfile),
  ].filter(Boolean)
  const pendingSent = sent.filter(f => f.status === 'pending')

  return (
    <>
      <Nav />
      <div style={{ maxWidth:980,margin:'0 auto',padding:'32px clamp(16px,4vw,48px)' }}>
        <h2 style={{ fontFamily:'Fraunces,serif',fontWeight:900,fontSize:36,marginBottom:28 }}>Friends</h2>

        {/* Search */}
        <div style={panelStyle}>
          <span style={labelStyle}>Find a player</span>
          <form onSubmit={handleSearch} style={{ display:'flex',gap:10 }}>
            <input
              value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Username…"
              style={{ flex:1,padding:'11px 14px',background:'var(--panel2)',border:'1px solid var(--line2)',borderRadius:10,color:'var(--text)',fontFamily:'Inter',fontSize:15,outline:'none' }}
            />
            <button type="submit" disabled={searching} style={{ ...btnStyle('var(--gold)'), color:'#1a1208',padding:'11px 20px' }}>
              {searching ? '…' : 'Search'}
            </button>
          </form>
          {msg && <div style={{ marginTop:10,fontSize:13,color:'var(--good)' }}>{msg}</div>}
          {searchResult === 'not-found' && <div style={{ marginTop:10,fontSize:13,color:'var(--muted)' }}>No player with that username found.</div>}
          {searchResult && searchResult !== 'not-found' && (
            <div style={{ marginTop:12,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--panel2)',borderRadius:10 }}>
              <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                <Avatar username={searchResult.username} size={30} />
                <span style={{ fontFamily:'JetBrains Mono,monospace' }}>@{searchResult.username}</span>
              </div>
              {searchResult.id === userId ? (
                <span style={{ fontSize:12,color:'var(--muted)' }}>That's you</span>
              ) : acceptedFriends.some(p => p.username === searchResult.username) ? (
                <span style={{ fontSize:12,color:'var(--good)' }}>Already friends</span>
              ) : sent.some(f=>f.addressee_id===searchResult.id && f.status==='pending') ? (
                <span style={{ fontSize:12,color:'var(--muted)' }}>Request pending</span>
              ) : (
                <button onClick={()=>sendRequest(searchResult.id)} style={{ ...btnStyle('var(--felt)'), color:'#fff' }}>Add friend</button>
              )}
            </div>
          )}
        </div>

        {/* Incoming requests */}
        {pendingReceived.length > 0 && (
          <div style={panelStyle}>
            <span style={labelStyle}>Incoming requests</span>
            {pendingReceived.map(f => (
              <div key={f.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--line)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  <Avatar username={f.profiles?.username ?? ''} size={30} style={f.profiles?.avatar_style} seed={f.profiles?.avatar_seed} avatarUrl={f.profiles?.avatar_url} />
                  <span style={{ fontFamily:'JetBrains Mono,monospace' }}>@{f.profiles?.username}</span>
                </div>
                <div style={{ display:'flex',gap:8 }}>
                  <button onClick={()=>respond(f.id,true)} style={{ ...btnStyle('var(--good)'), color:'#06281c' }}>Accept</button>
                  <button onClick={()=>respond(f.id,false)} style={{ ...btnStyle('rgba(255,77,109,.2)'), color:'var(--bad)',border:'1px solid rgba(255,77,109,.4)' }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        <div style={panelStyle}>
          <span style={labelStyle}>Your friends</span>
          {acceptedFriends.length === 0 || acceptedFriends.every(p => !p) ? (
            <p style={{ color:'var(--muted)',fontSize:14 }}>No friends yet. Search for a player above to add them.</p>
          ) : (
            acceptedFriends.map(p => (
              <div key={p.username} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--line)' }}>
                <Avatar username={p.username} size={30} style={p.avatar_style} seed={p.avatar_seed} avatarUrl={p.avatar_url} />
                <span style={{ fontFamily:'JetBrains Mono,monospace' }}>@{p.username}</span>
              </div>
            ))
          )}
        </div>

        {/* Pending sent */}
        {pendingSent.length > 0 && (
          <div style={panelStyle}>
            <span style={labelStyle}>Pending sent</span>
            {pendingSent.map(f => (
              <div key={f.id} style={{ padding:'10px 0',borderBottom:'1px solid var(--line)',fontFamily:'JetBrains Mono,monospace',color:'var(--muted)' }}>
                @{f.profiles?.username} <span style={{ fontSize:11 }}>— waiting</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
