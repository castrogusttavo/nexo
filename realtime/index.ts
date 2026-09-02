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
    if (!cookie) {
      logger.warn('realtime.authenticate.failed', {
        component: 'Realtime',
        documentName,
        reason: 'missing_cookie'
      })
      throw new Error('Missing session cookie')
    }

    const session = await auth.api.getSession({
      headers: new Headers({ cookie })
    })
    if (!session) {
      logger.warn('realtime.authenticate.failed', {
        component: 'Realtime',
        documentName,
        reason: 'no_session'
      })
      throw new Error('Not authenticated')
    }

    const page = await WikiPageRepository.findById(documentName)
    if (!page.ok) {
      logger.warn('realtime.authenticate.failed', {
        component: 'Realtime',
        documentName,
        userId: session.user.id,
        reason: 'page_not_found'
      })
      throw new Error('Wiki page not found')
    }

    const membership = await assertMember(
      session.user.id,
      page.value.workspaceId
    )
    if (!membership.ok) {
      logger.warn('realtime.authenticate.failed', {
        component: 'Realtime',
        documentName,
        userId: session.user.id,
        reason: 'forbidden'
      })
      throw new Error('Forbidden')
    }

    logger.info('realtime.authenticate.success', {
      component: 'Realtime',
      documentName,
      userId: session.user.id
    })

    return { userId: session.user.id }
  },

  async onConnect({ documentName }) {
    logger.info('realtime.connect', { component: 'Realtime', documentName })
  },

  async onDisconnect({ documentName }) {
    logger.info('realtime.disconnect', { component: 'Realtime', documentName })
  },

  async onLoadDocument({ documentName, document }) {
    const page = await WikiPageRepository.findById(documentName)
    if (!page.ok) {
      logger.error('realtime.load_document.failed', {
        component: 'Realtime',
        documentName,
        reason: page.error.code
      })
      return document
    }
    if (page.value.yjsState) {
      Y.applyUpdate(document, page.value.yjsState)
    }
    return document
  },

  async onStoreDocument({ documentName, document, context }) {
    const update = Y.encodeStateAsUpdate(document)
    const result = await WikiPageRepository.updateYjsState(documentName, {
      yjsState: update,
      updatedById: (context as { userId: string }).userId
    })
    if (!result.ok) {
      logger.error('realtime.store_document.failed', {
        component: 'Realtime',
        documentName,
        reason: result.error.code
      })
    }
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
