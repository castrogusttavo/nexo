import { copyToClipboard } from '@/lib/clipboard'
import { notify } from '@/lib/notify'
import type { ProjectDTO } from '@/types/project'
import {
  useArchiveProject,
  useFavoriteProject,
  useUnfavoriteProject,
} from './use-project'
import { useSingleFlight } from './use-single-flight'

export function useProjectActions(
  workspaceId: string,
  projectBase: string,
  project: ProjectDTO,
) {
  const favorite = useFavoriteProject(workspaceId)
  const unfavorite = useUnfavoriteProject(workspaceId)
  const archiveProject = useArchiveProject(workspaceId, project.slug)
  const favoriteFlight = useSingleFlight()
  const archiveFlight = useSingleFlight()

  async function toggleFavorite(): Promise<void> {
    const mutation = project.isFavorited ? unfavorite : favorite
    await favoriteFlight(() =>
      mutation.mutateAsync(project.slug).catch(notify.error),
    )
  }

  function copyLink() {
    return copyToClipboard(
      `${window.location.origin}${projectBase}`,
      'Link copiado',
    )
  }

  /** Resolves `true` only when this call archived the project. */
  async function archive(): Promise<boolean> {
    const archived = await archiveFlight(() =>
      archiveProject.mutateAsync().then(
        () => {
          notify.success('Projeto arquivado')
          return true
        },
        (error: unknown) => {
          notify.error(error)
          return false
        },
      ),
    )
    // A dropped double click archived nothing itself.
    return archived ?? false
  }

  return { toggleFavorite, copyLink, archive }
}
