import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { paginationRange } from '@/lib/pagination'

export function changelogPageHref(page: number) {
  return page === 1 ? '/changelog' : `/changelog/page/${page}`
}

// Every page is its own prerendered route, so the controls are plain links.
export function ChangelogPagination({
  page,
  totalPages,
}: {
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  return (
    <Pagination className='pb-20'>
      <PaginationContent>
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious href={changelogPageHref(page - 1)} />
          </PaginationItem>
        )}
        {paginationRange(page, totalPages).map((item) =>
          typeof item === 'number' ? (
            <PaginationItem key={item}>
              <PaginationLink
                href={changelogPageHref(item)}
                isActive={item === page}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationEllipsis />
            </PaginationItem>
          ),
        )}
        {page < totalPages && (
          <PaginationItem>
            <PaginationNext href={changelogPageHref(page + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  )
}
