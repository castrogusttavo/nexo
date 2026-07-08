import z from 'zod'

export const TEAM_SIZES = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
] as const

export const TalkToSalesSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome')
    .max(120, 'Nome muito longo'),
  email: z.email('E-mail inválido').max(254, 'E-mail muito longo'),
  teamSize: z.enum(TEAM_SIZES),
  message: z
    .string()
    .trim()
    .min(10, 'Conte um pouco mais (mínimo 10 caracteres')
    .max(2000, 'Mensagem muito longa'),
})

export type TalkToSalesDTO = z.infer<typeof TalkToSalesSchema>
