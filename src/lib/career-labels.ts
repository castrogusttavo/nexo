import type { CareerEmploymentType, CareerLocationType } from '@prisma/client'

export const CAREER_LOCATION_TYPE_LABELS: Record<CareerLocationType, string> = {
  REMOTE: 'Remoto',
  HYBRID: 'Híbrido',
  ON_SITE: 'Presencial',
}

export const CAREER_EMPLOYMENT_TYPE_LABELS: Record<
  CareerEmploymentType,
  string
> = {
  FULL_TIME: 'Tempo integral',
  PART_TIME: 'Meio período',
  INTERNSHIP: 'Estágio',
  CONTRACT: 'PJ / Contrato',
  TEMPORARY: 'Temporário',
}
