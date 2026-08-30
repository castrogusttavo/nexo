import { logger } from '@/lib/axiom/logger'
import { REALTIME_PORT } from '@/lib/env/_server'
import { Server } from '@hocuspocus/server'

const server = new Server({
  port: REALTIME_PORT
})

server.listen()

logger.info('realtime.server.started', {
  component: 'Realtime',
  port: REALTIME_PORT
})

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info('realtime.server.shutdown_start', {
    component: 'Realtime',
    signal
  })

  try {
    await server.destroy()
    await logger.flush()
  } catch (err) {
    const e = err as Error
    logger.error('realtime.server.shutdown_error', {
      component: 'Realtime',
      message: e.message,
      stack: e.stack
    })
  }

  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
