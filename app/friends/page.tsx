import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FriendsClient from './FriendsClient'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: sent }, { data: received }] = await Promise.all([
    supabase.from('friendships').select('*, profiles!friendships_addressee_id_fkey(username, avatar_style, avatar_seed, avatar_url)').eq('requester_id', user.id),
    supabase.from('friendships').select('*, profiles!friendships_requester_id_fkey(username, avatar_style, avatar_seed, avatar_url)').eq('addressee_id', user.id),
  ])

  return <FriendsClient userId={user.id} sent={sent ?? []} received={received ?? []} />
}
