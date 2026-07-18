import z from 'zod'

export const MemberSortByValues = [
  'name',
  'username',
  'email',
  'role',
  'joinedAt',
] as const

export const MemberSortOrderValues = ['asc', 'desc'] as const

export const MemberRoleFilterValues = [
  'OWNER',
  'ADMIN',
  'MEMBER',
  'VIEWER',
] as const

export const ListMembersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  roles: z
    .string()
    .transform((value) => value.split(',').filter(Boolean))
    .pipe(z.array(z.enum(MemberRoleFilterValues)))
    .optional(),
  sortBy: z.enum(MemberSortByValues).default('joinedAt'),
  sortOrder: z.enum(MemberSortOrderValues).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListMembersQuery = z.infer<typeof ListMembersQuerySchema>
