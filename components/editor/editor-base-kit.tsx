import { BaseBasicBlocksKit } from './plugins/basic-blocks-base-kit'
import { BaseBasicMarksKit } from './plugins/basic-marks-base-kit'
import { BaseCodeBlockKit } from './plugins/code-block-base-kit'
import { BaseListKit } from './plugins/list-base-kit'
import { BaseColumnKit } from './plugins/column-base-kit'
import { BaseToggleKit } from './plugins/toggle-base-kit'
import { BaseTocKit } from './plugins/toc-base-kit'
import { BaseFootnoteKit } from './plugins/footnote-base-kit'

// Static kits (SlateElement, no React editing state) used to serialize
// the wiki outside the live editor — HTML/PDF/image export.
// Covers the block types that already have their own static rendering;
// newer blocks (table, media, link, date, equation, mention, emoji,
// mermaid, excalidraw) still fall back to Plate's default until they
// get their own *-base-kit.
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
