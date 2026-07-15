import { Img } from 'react-email'

// `name` can arrive undefined/empty from the react-email preview server,
// which renders templates with no props at all — never assume a caller
// always passes a real value.
function initialsOf(name?: string | null): string {
  if (!name) return ''
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface EmailAvatarProps {
  src?: string | null
  name?: string | null
  size?: number
}

// Email-safe equivalent of the app's Avatar/AvatarFallback: falls back to a
// colored initials circle instead of a static placeholder image, so there's
// no dependency on a "generic avatar" asset that may not exist.
export function EmailAvatar({ src, name, size = 64 }: EmailAvatarProps) {
  if (src) {
    return (
      <Img
        className='rounded-full'
        width={size}
        height={size}
        src={src}
        alt={name ?? ''}
      />
    )
  }

  return (
    <table
      width={size}
      cellPadding={0}
      cellSpacing={0}
      role='presentation'
      style={{ width: size, height: size, borderRadius: 9999 }}
    >
      <tbody>
        <tr>
          <td
            align='center'
            valign='middle'
            style={{
              width: size,
              height: size,
              borderRadius: 9999,
              backgroundColor: '#2893cc',
              color: '#ffffff',
              fontSize: Math.round(size * 0.4),
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {initialsOf(name) || '?'}
          </td>
        </tr>
      </tbody>
    </table>
  )
}
