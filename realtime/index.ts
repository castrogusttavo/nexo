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
import { ProjectDocumentRepository } from '@/src/repositories/project-document.repository'
import { WikiPageRepository } from '@/src/repositories/wiki-page.repository'
import { auth } from '@/src/lib/auth'
import { assertMember } from '@/src/services/_authz'
import { ProjectDocumentService } from '@/src/services/project-document.service'
import * as Y from 'yjs'

const redisUrl = new URL(REDIS_URL)

const PROJECT_DOC_PREFIX = 'project:'

// Wiki documents are the bare page id; project documents are prefixed.
function parseDocumentName(
  documentName: string
): { kind: 'project' | 'wiki'; id: string } {
  return documentName.startsWith(PROJECT_DOC_PREFIX)
    ? { kind: 'project', id: documentName.slice(PROJECT_DOC_PREFIX.length) }
    : { kind: 'wiki', id: documentName }
}

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

  async onAuthenticate({ documentName, requestHeaders, connectionConfig }) {
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

    const target = parseDocumentName(documentName)

    if (target.kind === 'project') {
      const access = await ProjectDocumentService.authorizeRealtime(
        session.user.id,
        target.id
      )
      if (!access.ok) {
        logger.warn('realtime.authenticate.failed', {
          component: 'Realtime',
          documentName,
          userId: session.user.id,
          reason: access.error.code
        })
        throw new Error('Forbidden')
      }
      // Readers watch the document live but cannot change it.
      connectionConfig.readOnly = !access.value.canWrite

      logger.info('realtime.authenticate.success', {
        component: 'Realtime',
        documentName,
        userId: session.user.id,
        readOnly: !access.value.canWrite
      })
      return { userId: session.user.id }
    }

    const page = await WikiPageRepository.findById(target.id)
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
    const target = parseDocumentName(documentName)

    if (target.kind === 'project') {
      const project = await ProjectDocumentRepository.findAccessById(target.id)
      if (!project.ok) {
        logger.error('realtime.load_document.failed', {
          component: 'Realtime',
          documentName,
          reason: project.error.code
        })
        // Refuse the connection: handing back an empty doc would let the next
        // store overwrite the real state with nothing.
        throw new Error('Project document unavailable')
      }
      if (project.value.documentYjsState) {
        Y.applyUpdate(document, project.value.documentYjsState)
      }
      return document
    }

    const page = await WikiPageRepository.findById(target.id)
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
    const target = parseDocumentName(documentName)

    if (target.kind === 'project') {
      const stored = await ProjectDocumentRepository.updateYjsState(
        target.id,
        update
      )
      if (!stored.ok) {
        logger.error('realtime.store_document.failed', {
          component: 'Realtime',
          documentName,
          reason: stored.error.code
        })
      }
      return
    }

    const result = await WikiPageRepository.updateYjsState(target.id, {
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
