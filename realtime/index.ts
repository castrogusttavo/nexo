import { readFileSync } from 'node:fs'
import { logger } from '@/lib/axiom/logger'
import {
  REALTIME_PORT,
  REDIS_TLS_CA_PATH,
  REDIS_TLS_ENABLED,
  REDIS_URL
} from '@/lib/env/_server'
import { Server } from '@hocuspocus/server'
import { Redis } from '@hocuspocus/extension-redis'
import { WikiPageRepository } from '@/src/repositories/wiki-page.repository'
import { auth } from '@/src/lib/auth'
import { assertMember } from '@/src/services/_authz'
import * as Y from 'yjs'

const redisUrl = new URL(REDIS_URL)

const server = new Server({
  port: REALTIME_PORT,

  extensions: [
    new Redis({
      host: redisUrl.hostname,
      port: Number(redisUrl.port) || 6379,
      options: {
        password: redisUrl.password || undefined,
        ...(REDIS_TLS_ENABLED && {
          tls: REDIS_TLS_CA_PATH
            ? { ca: readFileSync(REDIS_TLS_CA_PATH) }
            : {}
        })
      }
    })
  ],

  async onAuthenticate({ documentName, requestHeaders }) {
    const cookie = requestHeaders.cookie
    if (!cookie) throw new Error('Missing session cookie')

    const session = await auth.api.getSession({
      headers: new Headers({ cookie })
    })
    if (!session) throw new Error('Not authenticated')

    const page = await WikiPageRepository.findById(documentName)
    if (!page.ok) throw new Error('Wiki page not found')

    const membership = await assertMember(
      session.user.id,
      page.value.workspaceId
    )
    if (!membership.ok) throw new Error('Forbidden')

    return { userId: session.user.id }
  },

  async onLoadDocument({ documentName, document }) {
    const page = await WikiPageRepository.findById(documentName)
    if (page.ok && page.value.yjsState) {
      Y.applyUpdate(document, page.value.yjsState)
    }
    return document
  },

  async onStoreDocument({ documentName, document, context }) {
    const update = Y.encodeStateAsUpdate(document)
    await WikiPageRepository.updateYjsState(documentName, {
      yjsState: update,
      updatedById: (context as { userId: string }).userId
    })
  }
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
