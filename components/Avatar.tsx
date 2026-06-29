interface Props {
  username: string
  size?: number
  style?: string
  seed?: string | null
  avatarUrl?: string | null
}

export default function Avatar({ username, size = 36, style = 'bottts-neutral', seed, avatarUrl }: Props) {
  const src = avatarUrl
    ? avatarUrl
    : `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed ?? username)}&radius=50&backgroundColor=0f172a`
  return (
    <img
      src={src}
      alt={username}
      width={size}
      height={size}
      style={{
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,.12)',
        background: '#0f172a',
        flexShrink: 0,
        objectFit: 'cover',
      }}
    />
  )
}
