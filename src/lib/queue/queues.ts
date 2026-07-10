import { Queue } from 'bullmq'
import { getQueueConnection } from './connection'
import {
  type AccountLifecycleJob,
  type AccountLifecycleJobPayload,
  type DataExportJob,
  type DataExportJobPayload,
  type DataRetentionJob,
  type DataRetentionJobPayload,
  QueueName,
  type TrialLifecycleJob,
  type TrialLifecycleJobPayload,
} from './jobs'

const defaultJobOptions = {
  removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
  removeOnFail: { age: 60 * 60 * 24 * 7 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
} as const

let dataRetentionQueue: Queue | null = null
let accountLifecycleQueue: Queue | null = null
let dataExportQueue: Queue | null = null
let trialLifecycleQueue: Queue | null = null

export function getDataRetentionQueue(): Queue<
  DataRetentionJobPayload[DataRetentionJob],
  unknown,
  DataRetentionJob
> {
  if (!dataRetentionQueue) {
    dataRetentionQueue = new Queue(QueueName.DataRetention, {
      connection: getQueueConnection(),
      defaultJobOptions,
    })
  }
  return dataRetentionQueue as Queue<
    DataRetentionJobPayload[DataRetentionJob],
    unknown,
    DataRetentionJob
  >
}

export function getAccountLifecycleQueue(): Queue<
  AccountLifecycleJobPayload[AccountLifecycleJob],
  unknown,
  AccountLifecycleJob
> {
  if (!accountLifecycleQueue) {
    accountLifecycleQueue = new Queue(QueueName.AccountLifecycle, {
      connection: getQueueConnection(),
      defaultJobOptions,
    })
  }
  return accountLifecycleQueue as Queue<
    AccountLifecycleJobPayload[AccountLifecycleJob],
    unknown,
    AccountLifecycleJob
  >
}

export function getDataExportQueue(): Queue<
  DataExportJobPayload[DataExportJob],
  unknown,
  DataExportJob
> {
  if (!dataExportQueue) {
    dataExportQueue = new Queue(QueueName.DataExport, {
      connection: getQueueConnection(),
      defaultJobOptions,
    })
  }
  return dataExportQueue as Queue<
    DataExportJobPayload[DataExportJob],
    unknown,
    DataExportJob
  >
}

export function getTrialLifecycleQueue(): Queue<
  TrialLifecycleJobPayload[TrialLifecycleJob],
  unknown,
  TrialLifecycleJob
> {
  if (!trialLifecycleQueue) {
    trialLifecycleQueue = new Queue(QueueName.TrialLifecycle, {
      connection: getQueueConnection(),
      defaultJobOptions,
    })
  }
  return trialLifecycleQueue as Queue<
    TrialLifecycleJobPayload[TrialLifecycleJob],
    unknown,
    TrialLifecycleJob
  >
}

export async function closeQueues(): Promise<void> {
  await Promise.all([
    dataRetentionQueue?.close(),
    accountLifecycleQueue?.close(),
    dataExportQueue?.close(),
    trialLifecycleQueue?.close(),
  ])
  dataRetentionQueue = null
  accountLifecycleQueue = null
  dataExportQueue = null
  trialLifecycleQueue = null
}
