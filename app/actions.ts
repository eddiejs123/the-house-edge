'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveAvatar(style: string, seed: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not authenticated' }
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_style: style, avatar_seed: seed })
    .eq('id', user.id)
  if (error) return { error: error.message }
  return { ok: true }
}

export async function saveStats(stats: {
  streak: number
  bestStreak: number
  totalHands: number
  correctHands: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({
      current_streak: stats.streak,
      best_streak: stats.bestStreak,
      total_hands: stats.totalHands,
      correct_hands: stats.correctHands,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { ok: true }
}
