import { ImageResponse } from 'next/og'
import { BrandMark } from './_og/brand-mark'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0b0b0c',
      }}
    >
      <BrandMark size={124} />
    </div>,
    { ...size },
  )
}
