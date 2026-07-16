import z from 'zod'
import { EmailSchema } from './_shared'

export const CreateCareerApplicationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome')
    .max(120, 'Nome muito longo'),
  email: EmailSchema.max(254, 'Email muito longo'),
  phone: z.string().trim().max(20, 'Telefone muito longo').optional(),
  linkedinUrl: z.url('URL inválida').max(2048, 'URL muito longa').optional(),
  portfolioUrl: z.url('URL inválida').max(2048, 'URL muito longa').optional(),
  lastJobTitle: z.string().trim().max(120, 'Cargo muito longo').optional(),
  experienceYears: z.coerce
    .number()
    .int('Tempo de experiência deve ser um número inteiro')
    .min(0, 'Tempo de experiência inválido')
    .max(60, 'Tempo de experiência inválido')
    .optional(),
  message: z.string().trim().max(2000, 'Mensagem muito longa').optional(),
  consent: z.literal(true, {
    message: 'Você precisa concordar com o uso dos seus dados para prosseguir',
  }),
  honeypot: z.string().max(0).optional(),
})

export type CreateCareerApplicationDTO = z.infer<
  typeof CreateCareerApplicationSchema
>
