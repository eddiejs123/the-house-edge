import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_style, avatar_seed, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <ProfileClient
      userId={user.id}
      username={profile?.username ?? ''}
      currentStyle={profile?.avatar_style ?? 'bottts-neutral'}
      currentSeed={profile?.avatar_seed ?? null}
      currentAvatarUrl={profile?.avatar_url ?? null}
    />
  )
}
