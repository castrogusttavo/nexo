import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ChangeCareerJobStatusDTO,
  CreateCareerJobDTO,
  UpdateCareerJobDTO,
} from '@/src/schemas/career-job.schema'
import type { CareerJobDTO } from '@/types/career-job'
import { apiFetchJson } from './_fetch'

const CAREER_JOBS_KEY = ['admin', 'career-jobs'] as const
const BASE_API_ROUTE = '/api/admin/careers'

function careerJobKey(id: string) {
  return [...CAREER_JOBS_KEY, id] as const
}

export function useCreateCareerJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCareerJobDTO) =>
      apiFetchJson<CareerJobDTO>(
        BASE_API_ROUTE,
        'POST',
        data,
        'Erro ao criar vaga',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAREER_JOBS_KEY })
    },
  })
}

export function useUpdateCareerJob(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateCareerJobDTO) =>
      apiFetchJson<CareerJobDTO>(
        `${BASE_API_ROUTE}/${id}`,
        'PATCH',
        data,
        'Erro ao atualizar vaga',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAREER_JOBS_KEY })
      queryClient.invalidateQueries({ queryKey: careerJobKey(id) })
    },
  })
}

export function useChangeCareerJobStatus(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ChangeCareerJobStatusDTO) =>
      apiFetchJson<CareerJobDTO>(
        `${BASE_API_ROUTE}/${id}/status`,
        'PATCH',
        data,
        'Erro ao mudar status da vaga',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CAREER_JOBS_KEY })
      queryClient.invalidateQueries({ queryKey: careerJobKey(id) })
    },
  })
}
