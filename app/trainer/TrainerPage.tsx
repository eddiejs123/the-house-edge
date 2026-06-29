'use client'

import { useCallback, useEffect, useRef } from 'react'
import Trainer from '@/components/Trainer'
import Nav from '@/components/Nav'
import { saveStats } from '@/app/actions'

interface Stats {
  streak: number
  bestStreak: number
  totalHands: number
  correctHands: number
}

interface Props { userId: string; initialStats: Stats }

export default function TrainerPage({ userId: _userId, initialStats }: Props) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestStats = useRef<Stats>(initialStats)
  const dirty = useRef(false)

  const flush = useCallback(async () => {
    if (!dirty.current) return
    dirty.current = false
    const result = await saveStats(latestStats.current)
    if (result?.error) console.error('Stats save failed:', result.error)
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      flush()
    }
  }, [flush])

  const handleAnswer = useCallback((_correct: boolean, streak: number, total: number, correct: number) => {
    latestStats.current = {
      streak,
      bestStreak: Math.max(latestStats.current.bestStreak, streak),
      totalHands: total,
      correctHands: correct,
    }
    dirty.current = true
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flush, 1500)
  }, [flush])

  return (
    <>
      <Nav />
      <Trainer onAnswer={handleAnswer} initialStats={initialStats} />
    </>
  )
}
