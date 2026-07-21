import z from 'zod'

export const EmailSchema = z.email('E-mail inválido')

export const TagColorSchema = z.enum([
  'RED',
  'YELLOW',
  'BLUE',
  'GREEN',
  'PURPLE',
  'ZINC',
])
