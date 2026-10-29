import { describe, expect, it } from 'vitest'
import { paginationRange } from '../pagination'

describe('paginationRange', () => {
  it('shows a single page alone', () => {
    expect(paginationRange(1, 1)).toEqual([1])
  })

  it('shows every page while there is no gap to hide', () => {
    expect(paginationRange(1, 3)).toEqual([1, 2, 3])
    expect(paginationRange(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('fills a one-page gap with the page instead of an ellipsis', () => {
    expect(paginationRange(1, 4)).toEqual([1, 2, 3, 4])
  })

  it('hides the far end behind one ellipsis', () => {
    expect(paginationRange(1, 10)).toEqual([1, 2, 'ellipsis-end', 10])
  })

  it('hides both sides around a page in the middle', () => {
    expect(paginationRange(5, 10)).toEqual([
      1,
      'ellipsis-start',
      4,
      5,
      6,
      'ellipsis-end',
      10,
    ])
  })

  it('hides the near end on the last page', () => {
    expect(paginationRange(10, 10)).toEqual([1, 'ellipsis-start', 9, 10])
  })
})