import { BaseBasicBlocksKit } from './plugins/basic-blocks-base-kit'
import { BaseBasicMarksKit } from './plugins/basic-marks-base-kit'
import { BaseCodeBlockKit } from './plugins/code-block-base-kit'
import { BaseListKit } from './plugins/list-base-kit'
import { BaseColumnKit } from './plugins/column-base-kit'
import { BaseToggleKit } from './plugins/toggle-base-kit'
import { BaseTocKit } from './plugins/toc-base-kit'
import { BaseFootnoteKit } from './plugins/footnote-base-kit'

// Kits estáticos (SlateElement, sem estado React de edição) usados pra
// serializar a wiki fora do editor vivo — export de HTML/PDF/imagem.
// Cobre os tipos de bloco que já têm renderização estática própria; blocos
// mais recentes (tabela, mídia, link, data, equação, menção, emoji,
// mermaid, excalidraw) ainda caem no fallback padrão da Plate até
// ganharem seus próprios *-base-kit.
export const BaseEditorKit = [
  ...BaseBasicBlocksKit,
  ...BaseBasicMarksKit,
  ...BaseCodeBlockKit,
  ...BaseListKit,
  ...BaseColumnKit,
  ...BaseToggleKit,
  ...BaseTocKit,
  ...BaseFootnoteKit,
]
