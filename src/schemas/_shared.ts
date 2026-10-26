import z from 'zod'

export const EmailSchema = z.email('E-mail inválido')

// An instant with an explicit offset, as the API sends and stores dates.
export const IsoDate = z.iso.datetime({ offset: true })

export const TagColorSchema = z.enum([
  'RED',
  'YELLOW',
  'BLUE',
  'GREEN',
  'PURPLE',
  'ZINC',
])
