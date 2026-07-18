import { workbench } from '@getworkbench/next'
import { REDIS_URL } from '@/lib/env/server'
import { WORKBENCH_PASS, WORKBENCH_USER } from '@/lib/env/server-admin'

export const { GET, POST, PUT, PATCH, DELETE } = workbench({
  redis: REDIS_URL,
  basePath: '/jobs',
  auth: {
    username: WORKBENCH_USER,
    password: WORKBENCH_PASS,
  },
})
