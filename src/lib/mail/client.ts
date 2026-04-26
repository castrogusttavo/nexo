import 'server-only'
import { Resend } from 'resend'
import { RESEND_API_KEY } from '@/lib/env/server'

export const resend = new Resend(RESEND_API_KEY)

export const defaultFrom = 'nexo <suporte@nexo.coodee.dev>'
