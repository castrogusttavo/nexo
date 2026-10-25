import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// One formatter for the whole process: toLocaleDateString builds a fresh
// Intl.DateTimeFormat on every call, which the status page paid for on each of
// its 630 history bars per request (~40 ms of CPU against ~1 ms reused).
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function DateFormat(date: Date): string {
  return dateFormatter.format(date)
}
