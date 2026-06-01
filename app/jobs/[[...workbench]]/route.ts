import { workbench } from '@getworkbench/next'
import type { Queue } from 'bullmq'

const connection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' }

// TODO: replace with your real BullMQ queue instances.
const queues: Queue[] = [
  // new Queue("email", { connection }),
]

export const { GET, POST, PUT, PATCH, DELETE } = workbench({
  queues,
  basePath: '/jobs',
  auth: {
    username: process.env.WORKBENCH_USER!,
    password: process.env.WORKBENCH_PASS!,
  },
})
