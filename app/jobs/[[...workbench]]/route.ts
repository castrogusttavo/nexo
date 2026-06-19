import { workbench } from '@getworkbench/next'

export const { GET, POST, PUT, PATCH, DELETE } = workbench({
  redis: process.env.REDIS_URL ?? 'redis://localhost:6379',
  basePath: '/jobs',
  auth: {
    username: process.env.WORKBENCH_USER ?? '',
    password: process.env.WORKBENCH_PASS ?? '',
  },
})
