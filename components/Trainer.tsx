'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  COLS, HARD, SOFT, PAIR, CODE_ACTION,
  deal, reason, evFor, fmtEV,
  type Scenario, type ActionName,
} from '@/lib/strategy'
import { playDeal, playCorrect, playWrong } from '@/lib/sounds'

const SUITS: [string, string][] = [['♠','black'],['♥','red'],['♦','red'],['♣','black']]
function randSuit() { return SUITS[Math.floor(Math.random() * 4)] }
function rankLabel(val: number | string) {
  if (val === 'A') return 'A'
  if (val === 10) return ['10','J','Q','K'][Math.floor(Math.random() * 4)]
  return String(val)
}

interface CardProps { val: number | string; faceDown?: boolean; delay?: number }
function Card({ val, faceDown, delay = 0 }: CardProps) {
  const [suit, color] = randSuit()
  const lab = rankLabel(val)
  const style: React.CSSProperties = {
    width: 78, height: 112, borderRadius: 10, position: 'relative', flexShrink: 0,
    boxShadow: '0 10px 22px -8px rgba(0,0,0,.6)',
    animation: `deal .42s cubic-bezier(.2,.9,.3,1.2) ${delay}s backwards`,
  }
  if (faceDown) return (
    <div style={{ ...style, background: 'linear-gradient(135deg,#0f8a5a,#064a34)', border: '2px solid rgba(255,207,92,.55)' }}>
      <div style={{ position:'absolute',inset:8,borderRadius:5,border:'1px dashed rgba(255,207,92,.45)',
        backgroundImage:'repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(255,207,92,.14) 6px,rgba(255,207,92,.14) 7px)' }} />
    </div>
  )
  return (
    <div style={{ ...style, background: '#f6f3ea' }}>
      <div style={{ position:'absolute',fontFamily:'Fraunces,serif',fontWeight:600,fontSize:22,top:8,left:9,color:color==='red'?'#ff5a6e':'#1a1a1a' }}>{lab}</div>
      <div style={{ position:'absolute',fontSize:20,top:26,left:8,color:color==='red'?'#ff5a6e':'#1a1a1a' }}>{suit}</div>
      <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,color:color==='red'?'#ff5a6e':'#1a1a1a' }}>{suit}</div>
    </div>
  )
}

function buildGrid(data: Record<string|number, string>, isPair: boolean, isSoft: boolean) {
  const rows = Object.keys(data)
  return (
    <table className="grid">
      <thead>
        <tr>
          <th></th>
          {COLS.map(c => <th key={c}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => {
          let lbl: string
          if (isPair) lbl = r === '10' ? '10-10' : r === 'A' ? 'A-A' : `${r}-${r}`
          else if (isSoft) lbl = `S${r}`
          else lbl = r
          return (
            <tr key={r}>
              <td className="head">{lbl}</td>
              {[...data[r]].map((code, i) => {
                const cls = ({H:'cH',S:'cS',D:'cD',d:'cd',P:'cP'} as Record<string,string>)[code]
                const txt = ({H:'H',S:'S',D:'D',d:'Ds',P:'P'} as Record<string,string>)[code]
                return <td key={i} className={`cell ${cls}`}>{txt}</td>
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

interface TrainerProps {
  onAnswer?: (correct: boolean, streak: number, total: number, correctCount: number) => void
  initialStats?: { streak: number; bestStreak: number; totalHands: number; correctHands: number }
}

export default function Trainer({ onAnswer, initialStats }: TrainerProps) {
  const [view, setView] = useState<'train'|'chart'>('train')
  const [filter, setFilter] = useState('all')
  const [current, setCurrent] = useState<Scenario | null>(null)
  const [answered, setAnswered] = useState(false)
  const [chosen, setChosen] = useState<ActionName | null>(null)
  const [stats, setStats] = useState({
    correct: initialStats?.correctHands ?? 0,
    total: initialStats?.totalHands ?? 0,
    streak: initialStats?.streak ?? 0,
    bestStreak: initialStats?.bestStreak ?? 0,
  })
  const filterRef = useRef(filter)
  filterRef.current = filter

  const newHand = useCallback(() => {
    setCurrent(deal(filterRef.current))
    setAnswered(false)
    setChosen(null)
    // dealer upcard + hole card + 2 player cards
    playDeal(0)
    playDeal(0.08)
    playDeal(0.16)
    playDeal(0.24)
  }, [])

  useEffect(() => { newHand() }, [newHand])

  // keyboard shortcuts
  useEffect(() => {
    const map: Record<string, ActionName> = { h:'Hit', s:'Stand', d:'Double', p:'Split' }
    const handler = (e: KeyboardEvent) => {
      if (answered) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); newHand() }
        return
      }
      const act = map[e.key.toLowerCase()]
      if (act) answer(act)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  function answer(choice: ActionName) {
    if (!current || answered) return
    const correctAction = CODE_ACTION[current.code]
    const isRight = choice === correctAction

    if (isRight) playCorrect(); else playWrong()
    setChosen(choice)
    setAnswered(true)
    setStats(prev => {
      const newStreak = isRight ? prev.streak + 1 : 0
      const newCorrect = prev.correct + (isRight ? 1 : 0)
      const newTotal = prev.total + 1
      const newBest = Math.max(prev.bestStreak, newStreak)
      const next = { correct: newCorrect, total: newTotal, streak: newStreak, bestStreak: newBest }
      onAnswer?.(isRight, newStreak, newTotal, newCorrect)
      return next
    })
  }

  const correctAction = current ? CODE_ACTION[current.code] : null
  const acc = stats.total ? Math.round(stats.correct / stats.total * 100) + '%' : '—'

  const panelStyle: React.CSSProperties = {
    background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14,
    padding: '12px 16px', minWidth: 84, textAlign: 'center',
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 'clamp(16px,4vw,48px)' }}>
      {/* Header */}
      <header style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-end', justifyContent:'space-between', gap:24, marginBottom:28 }}>
        <div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, letterSpacing:'.32em', textTransform:'uppercase', color:'var(--gold)', marginBottom:10 }}>
            Basic Strategy · Trainer
          </div>
          <h1 style={{ fontFamily:'Fraunces,serif', fontWeight:900, fontSize:'clamp(34px,6vw,56px)', lineHeight:.95, letterSpacing:'-.01em' }}>
            The <em style={{ fontStyle:'italic', color:'var(--gold)' }}>House</em> Edge
          </h1>
          <p style={{ color:'var(--muted)', fontSize:14, marginTop:10, maxWidth:'42ch' }}>
            Drill the one correct move for every hand. Not how to play blackjack — how to play it <em>right</em>.
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <div style={panelStyle}><div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:24, fontWeight:700, color:'var(--gold)' }}>{acc}</div><div style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--muted)', marginTop:2 }}>Accuracy</div></div>
          <div style={panelStyle}><div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:24, fontWeight:700 }}>{stats.streak}</div><div style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--muted)', marginTop:2 }}>Streak</div></div>
          <div style={panelStyle}><div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:24, fontWeight:700 }}>{stats.total}</div><div style={{ fontSize:10, letterSpacing:'.14em', textTransform:'uppercase', color:'var(--muted)', marginTop:2 }}>Hands</div></div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'var(--panel2)', border:'1px solid var(--line)', borderRadius:14, padding:4, width:'fit-content', marginBottom:22 }}>
        {(['train','chart'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            fontFamily:'JetBrains Mono,monospace', fontSize:12, letterSpacing:'.12em', textTransform:'uppercase',
            background: view===v ? 'var(--felt)' : 'none', color: view===v ? '#fff' : 'var(--muted)',
            border:'none', padding:'9px 18px', borderRadius:10, cursor:'pointer',
          }}>
            {v === 'train' ? 'Train' : 'Strategy Chart'}
          </button>
        ))}
      </div>

      {/* Train view */}
      {view === 'train' && (
        <>
          <div style={{
            background: 'radial-gradient(820px 440px at 50% -4%, var(--felt-lit) 0%, var(--felt) 42%, #07523a 100%)',
            border: '1px solid rgba(255,255,255,.16)', borderRadius: 28,
            padding: 'clamp(20px,4vw,40px)',
            boxShadow: '0 36px 90px -28px rgba(120,60,200,.55), 0 0 0 1px rgba(255,255,255,.05), inset 0 1px 0 rgba(255,255,255,.14)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position:'absolute',inset:14,borderRadius:22,border:'2px dashed rgba(217,180,106,.22)',pointerEvents:'none' }} />

            {/* Dealer */}
            <div style={{ fontFamily:'JetBrains Mono,monospace',fontSize:10,letterSpacing:'.28em',textTransform:'uppercase',color:'rgba(255,255,255,.55)',textAlign:'center',marginBottom:14 }}>Dealer</div>
            <div style={{ display:'flex',justifyContent:'center',gap:10,minHeight:124,alignItems:'center',marginBottom:8 }}>
              {current && <><Card val={current.dealer} delay={0} /><Card val={0} faceDown delay={.08} /></>}
            </div>

            {/* Divider */}
            <div style={{ display:'flex',alignItems:'center',gap:14,margin:'6px 0 22px',color:'rgba(255,255,255,.4)',fontSize:10,letterSpacing:'.3em',fontFamily:'JetBrains Mono,monospace' }}>
              <div style={{ flex:1,height:1,background:'rgba(255,255,255,.18)' }} />VS<div style={{ flex:1,height:1,background:'rgba(255,255,255,.18)' }} />
            </div>

            {/* Player */}
            <div style={{ display:'flex',justifyContent:'center',gap:10,minHeight:124,alignItems:'center',marginBottom:8 }}>
              {current && current.cards.map((v, i) => <Card key={i} val={v} delay={.16+i*.08} />)}
            </div>
            <div style={{ display:'block',textAlign:'center',fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'rgba(255,255,255,.8)',marginBottom:26 }}>
              {current && <>You have <b style={{ color:'var(--gold)' }}>{current.label}</b> &nbsp;·&nbsp; Dealer shows <b style={{ color:'var(--gold)' }}>{current.dealer}</b></>}
            </div>

            {/* Action buttons */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginTop:6 }}>
              {(['Hit','Stand','Double','Split'] as ActionName[]).map(act => {
                const colorMap: Record<string,string> = {
                  Hit:'rgba(255,90,110,.16)', Stand:'rgba(34,201,138,.16)',
                  Double:'rgba(255,179,71,.16)', Split:'rgba(160,107,255,.18)',
                }
                const borderMap: Record<string,string> = {
                  Hit:'rgba(255,90,110,.6)', Stand:'rgba(34,201,138,.6)',
                  Double:'rgba(255,179,71,.65)', Split:'rgba(160,107,255,.65)',
                }
                const isCorrect = answered && act === correctAction
                const isWrong = answered && act === chosen && act !== correctAction
                return (
                  <button key={act}
                    disabled={answered || (act==='Split' && current?.type!=='pair')}
                    onClick={() => answer(act)}
                    style={{
                      fontFamily:'Inter', fontWeight:600, fontSize:15, color: isCorrect?'#06281c': isWrong?'#fff':'var(--text)',
                      background: isCorrect?'var(--good)': isWrong?'var(--bad)':colorMap[act],
                      border: `1px solid ${isCorrect?'#5fd197': isWrong?'#ff8095':borderMap[act]}`,
                      borderRadius:13, padding:'15px 8px', cursor: answered?'default':'pointer',
                      transition:'.15s', backdropFilter:'blur(2px)',
                      opacity: (act==='Split' && !answered && current?.type!=='pair') ? .35 : 1,
                    }}
                  >
                    {act}
                    <span style={{ display:'block',fontFamily:'JetBrains Mono,monospace',fontSize:9,letterSpacing:'.1em',color: isCorrect||isWrong?'inherit':'var(--muted)',marginTop:4 }}>
                      {act==='Hit'?'draw a card':act==='Stand'?'keep total':act==='Double'?'2× & one card':'split pair'}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Feedback */}
            {answered && current && (() => {
              const isRight = chosen === correctAction
              const chosenEV = evFor(current, chosen!)
              const bestEV = evFor(current, correctAction!)
              const why = (() => {
                let w = reason(current)
                if (chosen === 'Hit' && current.code === 'D') w += ' (You can hit, but with two cards you should double for the extra value.)'
                if (chosen === 'Stand' && current.code === 'd') w += ' (Standing isn\'t terrible here — but doubling earns more when the rules allow it.)'
                return w
              })()
              return (
                <div style={{
                  marginTop:18, borderRadius:14, padding:'16px 18px', border:'1px solid',
                  borderColor: isRight?'rgba(95,209,151,.4)':'rgba(239,113,99,.4)',
                  background: isRight?'rgba(63,157,107,.14)':'rgba(207,76,61,.14)',
                }}>
                  <div style={{ fontFamily:'Fraunces,serif',fontWeight:600,fontSize:19,marginBottom:6,display:'flex',alignItems:'center',gap:8,color:isRight?'#7fe0ab':'#f08a7d' }}>
                    {isRight ? '✓ Correct' : `✗ Best move: ${correctAction}`}
                  </div>
                  <div style={{ fontSize:14,color:'#dfe7e1',lineHeight:1.55 }}>
                    <span dangerouslySetInnerHTML={{ __html: why.replace(/<b>/g,'<b style="color:var(--gold)">') }} />
                    {chosenEV !== null && (
                      <>
                        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:10,padding:'9px 12px',background:'rgba(0,0,0,.22)',border:'1px solid rgba(255,255,255,.10)',borderRadius:10 }}>
                          <span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:11,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--muted)' }}>Your move · {chosen}</span>
                          <span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:chosenEV>0?'var(--good)':chosenEV<-0.0005?'#ff8095':'var(--gold)' }}>{fmtEV(chosenEV)}</span>
                        </div>
                        {!isRight && bestEV !== null && (
                          <>
                            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginTop:6,padding:'9px 12px',background:'rgba(0,0,0,.22)',border:'1px solid rgba(255,255,255,.10)',borderRadius:10 }}>
                              <span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:11,letterSpacing:'.06em',textTransform:'uppercase',color:'var(--muted)' }}>Best move · {correctAction}</span>
                              <span style={{ fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:bestEV>0?'var(--good)':bestEV<-0.0005?'#ff8095':'var(--gold)' }}>{fmtEV(bestEV)}</span>
                            </div>
                            {Math.round((bestEV-chosenEV)*100)>=1 && (
                              <div style={{ fontSize:12.5,color:'#f0b9a6',marginTop:8 }}>That choice costs about {Math.round((bestEV-chosenEV)*100)}% of your bet over the long run.</div>
                            )}
                          </>
                        )}
                        <div style={{ fontSize:11,color:'var(--muted)',marginTop:8,lineHeight:1.45,fontStyle:'italic' }}>EV = average return per unit bet, assuming you play it out optimally. Negative is normal — it's the house edge, not a mistake.</div>
                      </>
                    )}
                  </div>
                  <button onClick={newHand} style={{ marginTop:14,width:'100%',fontFamily:'JetBrains Mono,monospace',letterSpacing:'.16em',textTransform:'uppercase',fontSize:12,background:'var(--gold)',color:'#1a1208',border:'none',borderRadius:12,padding:14,cursor:'pointer',fontWeight:700 }}>
                    Next hand →
                  </button>
                </div>
              )
            })()}
          </div>

          {/* Filter chips */}
          <div style={{ display:'flex',gap:8,justifyContent:'center',marginTop:22,flexWrap:'wrap' }}>
            {[['all','All hands'],['hard','Hard totals'],['soft','Soft totals'],['pair','Pairs']].map(([f,label]) => (
              <button key={f} onClick={() => { setFilter(f); filterRef.current = f; newHand() }} style={{
                fontFamily:'JetBrains Mono,monospace',fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',
                color: filter===f?'#1a1208':'var(--muted)',
                background: filter===f?'var(--gold)':'rgba(8,18,13,.4)',
                border: `1px solid ${filter===f?'var(--gold)':'var(--line)'}`,
                borderRadius:999,padding:'7px 15px',cursor:'pointer',
              }}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Chart view */}
      {view === 'chart' && (
        <div>
          {[
            { title:'Hard totals', sub:'No ace, or an ace forced to count as 1.', id:'hard', data:HARD, isPair:false, isSoft:false },
            { title:'Soft totals', sub:'A hand with an ace counting as 11 (e.g. A-6 = soft 17).', id:'soft', data:SOFT, isPair:false, isSoft:true },
            { title:'Pairs', sub:'When your first two cards match. Split decisions assume doubling after split is allowed.', id:'pair', data:PAIR, isPair:true, isSoft:false },
          ].map(({ title, sub, id, data, isPair, isSoft }) => (
            <div key={id} style={{ background:'var(--panel)',border:'1px solid var(--line)',borderRadius:18,padding:'clamp(16px,3vw,26px)',marginBottom:18 }}>
              <h3 style={{ fontFamily:'Fraunces,serif',fontWeight:600,fontSize:20,marginBottom:4 }}>{title}</h3>
              <div style={{ color:'var(--muted)',fontSize:13,marginBottom:16 }}>{sub}</div>
              {buildGrid(data as Record<string,string>, isPair, isSoft)}
              {isPair && (
                <>
                  <div style={{ display:'flex',gap:14,flexWrap:'wrap',marginTop:16,fontSize:12,color:'var(--muted)' }}>
                    {[['cH','Hit'],['cS','Stand'],['cD','Double (else hit)'],['cd','Double (else stand)'],['cP','Split']].map(([cls,lbl]) => (
                      <span key={cls} style={{ display:'inline-flex',alignItems:'center',gap:6 }}>
                        <i className={cls} style={{ width:13,height:13,borderRadius:4,display:'inline-block' }} />
                        {lbl}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize:12,color:'var(--muted)',marginTop:14,lineHeight:1.6,borderTop:'1px solid var(--line)',paddingTop:14 }}>
                    This chart is the standard rule set: 4–8 decks, dealer <b>stands</b> on soft 17, double allowed on any two cards, double after split allowed, no surrender.
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <footer style={{ textAlign:'center',color:'var(--muted)',fontSize:12,marginTop:30,lineHeight:1.7 }}>
        Strategy = mathematically optimal play · For entertainment &amp; education · 21+ where applicable
      </footer>
    </div>
  )
}
