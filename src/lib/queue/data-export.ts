import { logger } from '@/lib/axiom/logger'
import { DataExportJob } from './jobs'
import { getDataExportQueue } from './queues'

export async function enqueueUserExport(userId: string): Promise<string> {
  const queue = getDataExportQueue()
  const job = await queue.add(DataExportJob.ExportUserData, { userId })

  logger.info('queue.data_export.enqueued', {
    component: 'DataExport',
    userId,
    jobId: job.id,
  })

  return job.id ?? ''
}
