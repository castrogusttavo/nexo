import 'server-only'
import { Resend } from 'resend'
import { RESEND_API_KEY } from '@/lib/env/server'

let instance: Resend | null = null

function getResend(): Resend {
  if (!instance) {
    instance = new Resend(RESEND_API_KEY)
  }
  return instance
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop, receiver) {
    return Reflect.get(getResend(), prop, receiver)
  },
}) as Resend

export const defaultFrom = 'nexo <suporte@nexo.coodee.dev>'
