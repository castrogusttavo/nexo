import { screen } from '@testing-library/react'
import type { Value } from 'platejs'
import { describe, expect, it, vi } from 'vitest'
import {
  apiSuccess,
  mockFetch,
  renderWithProviders,
} from '@/src/__tests__/helpers/component'
import { WikiEditorProvider } from '@/src/hooks/use-wiki-editor-context'
import type { WikiCommentDTO } from '@/types/wiki-comment'

// The thread only touches the editor inside callbacks (unset a mark, bump
// awareness); on render it just needs a ref that answers.
vi.mock('platejs/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('platejs/react')>()),
  useEditorRef: () => ({
    getTransforms: () => ({ comment: { unsetMark: vi.fn() } }),
    setOption: vi.fn(),
    getOption: () => undefined,
  }),
}))

import { DiscussionThread } from '../discussion-thread'

const VIEWER = 'user-1'
const CONTENT: Value = [{ type: 'p', children: [{ text: 'Revisar isto' }] }]

function buildComment(
  overrides: Partial<WikiCommentDTO> = {},
): WikiCommentDTO {
  return {
    id: 'comment-1',
    wikiPageId: 'page-1',
    markId: 'mark-1',
    parentId: null,
    content: CONTENT,
    author: { id: 'user-2', name: 'Ana Souza', username: 'ana', image: null },
    resolved: false,
    resolvedAt: null,
    resolvedById: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function renderThread(comments: WikiCommentDTO[]) {
  mockFetch().mockResolvedValue(apiSuccess(comments))
  return renderWithProviders(
    <WikiEditorProvider
      workspaceId='ws-1'
      wikiPageId='page-1'
      userId={VIEWER}
      userName='Viewer'
    >
      <DiscussionThread markId='mark-1' />
    </WikiEditorProvider>,
  )
}

describe('<DiscussionThread />', () => {
  it('names the author of a comment', async () => {
    renderThread([buildComment()])

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument()
  })

  // Deleting a user nulls `author` and keeps the comment — the discussion is
  // the workspace's, only the person is erased.
  describe('when the author was deleted', () => {
    it('keeps the comment and names it "Usuário removido"', async () => {
      renderThread([buildComment({ author: null })])

      expect(await screen.findByText('Usuário removido')).toBeInTheDocument()
      expect(screen.getByText('Revisar isto')).toBeInTheDocument()
    })

    it('falls back to a placeholder initial instead of throwing', async () => {
      renderThread([buildComment({ author: null })])

      expect(await screen.findByText('?')).toBeInTheDocument()
    })

    it('does not treat an anonymized comment as the viewer own', async () => {
      renderThread([
        buildComment({ id: 'mine', author: null, parentId: 'root' }),
      ])

      await screen.findByText('Revisar isto')
      expect(
        screen.queryByRole('button', { name: /excluir/i }),
      ).not.toBeInTheDocument()
    })
  })
})
