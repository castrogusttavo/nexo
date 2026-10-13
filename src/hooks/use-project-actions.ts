import { copyToClipboard } from '@/lib/clipboard'
import { notify } from '@/lib/notify'
import type { ProjectDTO } from '@/types/project'
import {
  useArchiveProject,
  useFavoriteProject,
  useUnfavoriteProject,
  useUpdateProject,
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
  const updateProject = useUpdateProject(workspaceId, project.slug)
  // One guard per action: a pending favorite must not swallow an archive.
  const favoriteFlight = useSingleFlight()
  const visibilityFlight = useSingleFlight()
  const archiveFlight = useSingleFlight()

  async function toggleFavorite(): Promise<void> {
    const mutation = project.isFavorited ? unfavorite : favorite
    await favoriteFlight(() =>
      mutation.mutateAsync(project.slug).catch(notify.error),
    )
  }

  async function togglePublic(): Promise<void> {
    const isPublic = !project.isPublic
    await visibilityFlight(() =>
      updateProject.mutateAsync({ isPublic }).then(() => {
        notify.success(
          isPublic ? 'Projeto tornado público' : 'Projeto tornado privado',
        )
      }, notify.error),
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

  return { toggleFavorite, togglePublic, copyLink, archive }
}
