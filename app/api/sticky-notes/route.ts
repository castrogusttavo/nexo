import { CreateStickyNoteSchema } from '@/src/schemas/sticky-note.schema'
import { StickyNoteService } from '@/src/services/sticky-note.service'
import { withAuthenticatedRoute, withValidatedBody } from '@/utils/api-handler'

export const GET = withAuthenticatedRoute(({ userId }) =>
  StickyNoteService.list(userId),
)

export const POST = withValidatedBody(
  CreateStickyNoteSchema,
  ({ userId, data }) => StickyNoteService.create(userId, data),
  { successStatus: 201, consentResource: 'page:(private)' },
)
