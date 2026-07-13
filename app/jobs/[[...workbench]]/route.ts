import { workbench } from '@getworkbench/next'
import { REDIS_URL, WORKBENCH_PASS, WORKBENCH_USER } from '@/lib/env/server'

export const { GET, POST, PUT, PATCH, DELETE } = workbench({
  redis: REDIS_URL,
  basePath: '/jobs',
  auth: {
    username: WORKBENCH_USER,
    password: WORKBENCH_PASS,
  },
})
