import { CreateShortLinkSchema } from '@/src/schemas/short-link.schema'
import { ShortLinkService } from '@/src/services/short-link.service'
import { withAuthenticatedRoute, withValidatedBody } from '@/utils/api-handler'

export const GET = withAuthenticatedRoute(({ userId }) =>
  ShortLinkService.list(userId),
)

export const POST = withValidatedBody(
  CreateShortLinkSchema,
  ({ userId, data }) => ShortLinkService.create(userId, data),
  { successStatus: 201, consentResource: 'page:(private)' },
)
