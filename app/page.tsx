import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TrainerPage from './trainer/TrainerPage'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, best_streak, total_hands, correct_hands')
    .eq('id', user.id)
    .single()

  return (
    <TrainerPage
      userId={user.id}
      initialStats={{
        streak: profile?.current_streak ?? 0,
        bestStreak: profile?.best_streak ?? 0,
        totalHands: profile?.total_hands ?? 0,
        correctHands: profile?.correct_hands ?? 0,
      }}
    />
  )
}
