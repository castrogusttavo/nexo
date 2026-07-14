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
  portfolioUrl: z.url('URL inválida').max(2048, 'URL muito longa').optional(),
  message: z.string().trim().max(2000, 'Mensagem muito longa').optional(),
  consent: z.literal(true, {
    message: 'Você precisa concordar com o uso dos seus dados para prosseguir',
  }),
  // Hidden field left empty by real users, filled by bots. Validated in the
  // service (silent-success, no persistence), not rejected here - rejecting
  // in Zod would leak the honeypot's existence via the validation error.
  honeypot: z.string().max(0).optional(),
})

export type CreateCareerApplicationDTO = z.infer<
  typeof CreateCareerApplicationSchema
>
