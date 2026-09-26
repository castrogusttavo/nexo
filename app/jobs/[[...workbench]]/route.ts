import { workbench } from '@getworkbench/next'
import { REDIS_URL } from '@/lib/env/server'
import { getWorkbenchPass, getWorkbenchUser } from '@/lib/env/server-admin'

export const { GET, POST, PUT, PATCH, DELETE } = workbench({
  redis: REDIS_URL,
  basePath: '/jobs',
  auth: {
    username: getWorkbenchUser(),
    password: getWorkbenchPass(),
  },
})
