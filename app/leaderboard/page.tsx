export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import Avatar from '@/components/Avatar'

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get accepted friend IDs (both directions)
  const [{ data: sent }, { data: received }] = await Promise.all([
    supabase.from('friendships').select('addressee_id').eq('requester_id', user.id).eq('status','accepted'),
    supabase.from('friendships').select('requester_id').eq('addressee_id', user.id).eq('status','accepted'),
  ])
  const friendIds = [
    user.id,
    ...(sent ?? []).map((f: {addressee_id:string}) => f.addressee_id),
    ...(received ?? []).map((f: {requester_id:string}) => f.requester_id),
  ]

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, best_streak, total_hands, correct_hands, current_streak, avatar_style, avatar_seed, avatar_url')
    .in('id', friendIds)
    .order('best_streak', { ascending: false })

  const rows = (profiles ?? []).map(p => ({
    ...p,
    accuracy: p.total_hands > 0 ? Math.round(p.correct_hands / p.total_hands * 100) : null,
    isMe: p.id === user.id,
  }))

  const panelStyle: React.CSSProperties = { background:'var(--panel)',border:'1px solid var(--line)',borderRadius:18,overflow:'hidden' }
  const medals = ['🥇','🥈','🥉']

  return (
    <>
      <Nav />
      <div style={{ maxWidth:980,margin:'0 auto',padding:'32px clamp(16px,4vw,48px)' }}>
        <h2 style={{ fontFamily:'Fraunces,serif',fontWeight:900,fontSize:36,marginBottom:8 }}>Leaderboard</h2>
        <p style={{ color:'var(--muted)',fontSize:14,marginBottom:28 }}>You + accepted friends, ranked by best streak.</p>

        <div style={panelStyle}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontFamily:'Inter' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--line)' }}>
                {['#','Player','Best streak','Hands played','Accuracy'].map(h => (
                  <th key={h} style={{ fontFamily:'JetBrains Mono,monospace',fontSize:10,letterSpacing:'.16em',textTransform:'uppercase',color:'var(--muted)',padding:'12px 16px',textAlign:'left',fontWeight:500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} style={{ padding:32,textAlign:'center',color:'var(--muted)',fontSize:14 }}>No data yet. Start training and add some friends!</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.id} style={{ borderBottom:'1px solid var(--line)',background:row.isMe?'rgba(255,207,92,.06)':'none' }}>
                  <td style={{ padding:'14px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:16 }}>{medals[i] ?? i+1}</td>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                      <Avatar username={row.username} size={34} style={row.avatar_style ?? 'bottts-neutral'} seed={row.avatar_seed} avatarUrl={row.avatar_url} />
                      <span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:14,color:row.isMe?'var(--gold)':'var(--text)' }}>
                        @{row.username}{row.isMe && <span style={{ fontSize:10,color:'var(--muted)',marginLeft:6 }}>you</span>}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding:'14px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--teal)' }}>{row.best_streak ?? 0}</td>
                  <td style={{ padding:'14px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:14,color:'var(--muted)' }}>{(row.total_hands ?? 0).toLocaleString()}</td>
                  <td style={{ padding:'14px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:14,color:row.accuracy!==null?'var(--gold)':'var(--muted)' }}>
                    {row.accuracy !== null ? row.accuracy + '%' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
