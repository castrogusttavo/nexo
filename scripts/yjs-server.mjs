import { WebSocketServer } from 'ws'
import * as Y from 'yjs'
import { readSyncMessage, writeSyncStep1, writeUpdate } from 'y-protocols/sync'
import { encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { Awareness } from 'y-protocols/awareness'

const MSG_SYNC = 0
const MSG_AWARENESS = 1

/** @type {Map<string, { doc: Y.Doc, awareness: Awareness, conns: Set<import('ws').WebSocket> }>} */
const rooms = new Map()

function getRoom(name) {
  if (rooms.has(name)) return rooms.get(name)

  const doc = new Y.Doc()
  const awareness = new Awareness(doc)
  const room = { doc, awareness, conns: new Set() }
  rooms.set(name, room)

  awareness.setLocalState(null)
  return room
}

function broadcastToRoom(room, message, exclude) {
  for (const conn of room.conns) {
    if (conn !== exclude && conn.readyState === conn.OPEN) {
      conn.send(message)
    }
  }
}

const port = Number(process.env.PORT) || 4444
const wss = new WebSocketServer({ port })

wss.on('connection', (ws, req) => {
  const roomName = req.url?.slice(1)?.split('?')[0] || 'default'
  const room = getRoom(roomName)
  room.conns.add(ws)

  // Send sync step 1
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, MSG_SYNC)
  writeSyncStep1(encoder, room.doc)
  ws.send(encoding.toUint8Array(encoder))

  // Send current awareness
  const awarenessStates = room.awareness.getStates()
  if (awarenessStates.size > 0) {
    const clients = Array.from(awarenessStates.keys())
    const enc = encoding.createEncoder()
    encoding.writeVarUint(enc, MSG_AWARENESS)
    encoding.writeVarUint8Array(enc, encodeAwarenessUpdate(room.awareness, clients))
    ws.send(encoding.toUint8Array(enc))
  }

  ws.on('message', (data) => {
    const message = new Uint8Array(data)
    const decoder = decoding.createDecoder(message)
    const messageType = decoding.readVarUint(decoder)

    switch (messageType) {
      case MSG_SYNC: {
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MSG_SYNC)
        readSyncMessage(decoder, encoder, room.doc, ws)
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder))
        }
        break
      }
      case MSG_AWARENESS: {
        const update = decoding.readVarUint8Array(decoder)
        applyAwarenessUpdate(room.awareness, update, ws)
        broadcastToRoom(room, message, ws)
        break
      }
    }
  })

  // Broadcast doc updates to other clients
  const updateHandler = (update, origin) => {
    if (origin === ws) return
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MSG_SYNC)
    writeUpdate(encoder, update)
    broadcastToRoom(room, encoding.toUint8Array(encoder), null)
  }
  room.doc.on('update', updateHandler)

  ws.on('close', () => {
    room.conns.delete(ws)
    room.doc.off('update', updateHandler)

    // Remove awareness state for this client
    const states = room.awareness.getStates()
    const clientIds = []
    for (const [clientId] of states) {
      clientIds.push(clientId)
    }
    removeAwarenessStates(room.awareness, clientIds.filter(id => {
      // Only remove states that no remaining connection owns
      return !Array.from(room.conns).some(c => c === ws)
    }), ws)

    if (room.conns.size === 0) {
      room.doc.destroy()
      room.awareness.destroy()
      rooms.delete(roomName)
    }
  })
})

console.log(`Yjs WebSocket server running on ws://localhost:${port}`)
