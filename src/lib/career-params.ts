import { parseAsString, parseAsStringEnum } from 'nuqs'
import {
  CAREER_EMPLOYMENT_TYPES,
  CAREER_LOCATION_TYPES,
} from '../schemas/career-job.schema'

export const careerDepartmentParser = parseAsString
export const careerLocationParser = parseAsString
export const careerLocationTypeParser = parseAsStringEnum([
  ...CAREER_LOCATION_TYPES,
])
export const careerEmploymentTypeParser = parseAsStringEnum([
  ...CAREER_EMPLOYMENT_TYPES,
])
