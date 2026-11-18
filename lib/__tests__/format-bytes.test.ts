import { describe, expect, it } from 'vitest'
import { formatBytes } from '../format-bytes'

describe('formatBytes', () => {
  it('keeps small sizes in bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
  })

  it('switches unit at 1024 with one decimal and a pt-BR comma', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1,5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
    expect(formatBytes(25 * 1024 * 1024)).toBe('25 MB')
  })

  it('tops out at GB', () => {
    expect(formatBytes(3 * 1024 ** 3)).toBe('3 GB')
    expect(formatBytes(2048 * 1024 ** 3)).toBe('2.048 GB')
  })

  it('never goes negative', () => {
    expect(formatBytes(-5)).toBe('0 B')
  })
})
