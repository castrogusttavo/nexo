import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsIsoDate,
  parseAsStringEnum,
} from 'nuqs'

export const sortFieldParser = parseAsStringEnum([
  'name',
  'createdAt',
] as const).withDefault('createdAt')
export const sortOrderParser = parseAsStringEnum([
  'asc',
  'desc',
] as const).withDefault('desc')
export const accessParser = parseAsArrayOf(
  parseAsStringEnum(['public', 'private'] as const),
).withDefault([])
export const createdAtParser = parseAsStringEnum([
  'today',
  'yesterday',
  '7days',
  '30days',
] as const)
export const mineParser = parseAsBoolean.withDefault(false)
export const dateFromParser = parseAsIsoDate
export const dateToParser = parseAsIsoDate
