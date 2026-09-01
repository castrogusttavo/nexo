'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import type { TFootnoteElement } from '@platejs/footnote'
import { FootnoteReferencePlugin } from '@platejs/footnote/react'
import { PathApi } from 'platejs'
import type { PlateEditor, PlateElementProps } from 'platejs/react'
import { PlateElement, useEditorSelector, useElementSelector, useFocused, useSelected } from 'platejs/react'
import { Button } from '@/components/ui/button'
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'
import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxInput,
  InlineComboboxItem,
} from './inline-combobox'

const NUMERIC_FOOTNOTE_QUERY = /^\d+$/

const getFootnotePreviewLabel = (text?: string) => {
  const normalized = text?.replace(/\s+/g, ' ').trim()

  if (!normalized) return 'Nota vazia'

  return normalized.length > 48 ? `${normalized.slice(0, 45).trimEnd()}...` : normalized
}

const getReferenceContextLabel = (editor: PlateEditor, path: number[], index: number) => {
  const parentEntry = editor.api.parent(path)
  const fallback = `Referência ${index + 1}`

  if (!parentEntry) return fallback

  const text = editor.api.string(parentEntry[1])
  const normalized = text.replace(/\s+/g, ' ').trim()

  if (!normalized) return fallback

  return normalized.length > 56 ? `${normalized.slice(0, 53).trimEnd()}...` : normalized
}

export function FootnoteReferenceElement(props: PlateElementProps<TFootnoteElement>) {
  const { editor, element } = props
  const identifier = element.identifier ?? ''
  const footnoteApi = editor.getApi(FootnoteReferencePlugin).footnote
  const footnoteTransforms = editor.getTransforms(FootnoteReferencePlugin).footnote
  const [hoverOpen, setHoverOpen] = React.useState(false)
  const selected = useSelected()
  const focused = useFocused()
  const path = useElementSelector(([, elementPath]) => elementPath, [])
  const fallbackResolved = identifier ? footnoteApi.isResolved({ identifier }) : false
  const fallbackPreviewText = identifier ? footnoteApi.definitionText({ identifier }) : undefined

  const livePreview = useEditorSelector(() => {
    if (!hoverOpen || !identifier) return null

    return {
      isResolved: footnoteApi.isResolved({ identifier }),
      previewText: footnoteApi.definitionText({ identifier }),
    }
  }, [hoverOpen, identifier])

  const isResolved = livePreview?.isResolved ?? fallbackResolved
  const previewText = livePreview?.previewText ?? fallbackPreviewText

  const isSelectionInsideAtom = useEditorSelector(
    (currentEditor) => {
      const selection = currentEditor.selection

      if (!path || !selection) return false

      return (
        PathApi.equals(selection.anchor.path, path.concat([0])) &&
        PathApi.equals(selection.focus.path, path.concat([0])) &&
        selection.anchor.offset === selection.focus.offset
      )
    },
    [path]
  )

  return (
    <PlateElement
      {...props}
      as='sup'
      className='mx-0.5 align-super'
      attributes={{ ...props.attributes, contentEditable: false, draggable: true }}
    >
      {props.children}
      <HoverCard open={hoverOpen} onOpenChange={setHoverOpen} openDelay={150}>
        <HoverCardTrigger>
          <button
            type='button'
            className={cn(
              'cursor-pointer rounded-xs font-medium text-primary text-xs focus:ring-2 focus:ring-ring focus:ring-offset-1',
              (selected && focused) || isSelectionInsideAtom ? 'ring-2 ring-ring ring-offset-1' : null
            )}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            onMouseDown={(event) => {
              if (event.metaKey || event.ctrlKey) {
                event.preventDefault()
                event.stopPropagation()

                if (isResolved) {
                  footnoteTransforms.focusDefinition({ identifier })
                  return
                }

                footnoteTransforms.createDefinition({ identifier })
              }
            }}
          >
            [{identifier}]
          </button>
        </HoverCardTrigger>
        {previewText ? (
          <HoverCardContent className='w-80'>
            <div className='space-y-1'>
              <div className='text-muted-foreground text-sm leading-relaxed'>{previewText}</div>
            </div>
          </HoverCardContent>
        ) : identifier ? (
          <HoverCardContent className='w-80'>
            <div className='space-y-2'>
              {isResolved ? (
                <div className='text-sm leading-relaxed'>Nenhum preview disponível.</div>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-6 rounded-xs px-2 text-[11px]'
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    footnoteTransforms.createDefinition({ identifier })
                    setHoverOpen(false)
                  }}
                >
                  Criar definição para [^{identifier}]
                </Button>
              )}
            </div>
          </HoverCardContent>
        ) : null}
      </HoverCard>
    </PlateElement>
  )
}

export function FootnoteDefinitionElement(props: PlateElementProps<TFootnoteElement>) {
  const { editor, element } = props
  const identifier = element.identifier ?? ''
  const footnoteApi = editor.getApi(FootnoteReferencePlugin).footnote
  const footnoteTransforms = editor.getTransforms(FootnoteReferencePlugin).footnote
  const path = useElementSelector(([, elementPath]) => elementPath, [])
  const [referencePickerOpen, setReferencePickerOpen] = React.useState(false)
  const anchorRef = React.useRef<HTMLButtonElement>(null)

  const definitionState = useEditorSelector(() => {
    const isDuplicateDefinition = !!path && !!footnoteApi.isDuplicateDefinition?.({ path })
    const referenceItems =
      !isDuplicateDefinition && identifier
        ? footnoteApi.references({ identifier }).map((entry: [unknown, number[]], index: number) => ({
            index,
            label: getReferenceContextLabel(editor, entry[1], index),
          }))
        : []

    return {
      duplicateReplacementIdentifier: isDuplicateDefinition ? footnoteApi.nextId?.() : undefined,
      isDuplicateDefinition,
      referenceItems,
    }
  }, [identifier, path])

  const isDuplicateDefinition = !!definitionState?.isDuplicateDefinition
  const duplicateReplacementIdentifier = definitionState?.duplicateReplacementIdentifier
  const referenceItems = definitionState?.referenceItems ?? []
  const hasMultipleReferences = referenceItems.length > 1

  return (
    <PlateElement {...props} className='mt-1.5 flex items-start gap-1.5'>
      <div contentEditable={false}>
        {isDuplicateDefinition ? (
          <div className='min-w-3 text-amber-700 text-xs tabular-nums'>{identifier}</div>
        ) : (
          <PopoverPrimitive.Root open={referencePickerOpen} onOpenChange={setReferencePickerOpen} modal={false}>
            <button
              ref={anchorRef}
              type='button'
              aria-expanded={hasMultipleReferences ? referencePickerOpen : undefined}
              aria-haspopup={hasMultipleReferences ? 'dialog' : undefined}
              aria-label={`Voltar para a referência ${identifier}`}
              className='min-w-3 cursor-pointer rounded-xs text-muted-foreground text-xs tabular-nums underline-offset-2 hover:text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-1'
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
              }}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()

                if (hasMultipleReferences) {
                  setReferencePickerOpen((open) => !open)
                  return
                }

                footnoteTransforms.focusReference({ identifier })
              }}
            >
              {identifier}
            </button>

            {hasMultipleReferences && (
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Positioner anchor={anchorRef} align='start' side='bottom' sideOffset={8} className='isolate z-50 outline-none'>
                  <PopoverPrimitive.Popup
                    initialFocus={false}
                    contentEditable={false}
                    className='z-50 w-72 origin-(--transform-origin) rounded-md bg-popover p-0 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95'
                  >
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {referenceItems.map((item: { index: number; label: string }) => (
                            <CommandItem
                              key={`${identifier}-${item.index}`}
                              className='cursor-pointer gap-2'
                              onMouseDown={(event) => event.preventDefault()}
                              onSelect={() => {
                                setReferencePickerOpen(false)
                                footnoteTransforms.focusReference({ identifier, index: item.index })
                              }}
                            >
                              <span className='font-mono text-muted-foreground text-xs'>{item.index + 1}</span>
                              <span className='truncate'>{item.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverPrimitive.Popup>
                </PopoverPrimitive.Positioner>
              </PopoverPrimitive.Portal>
            )}
          </PopoverPrimitive.Root>
        )}
      </div>
      <div className='min-w-0 flex-1'>
        {isDuplicateDefinition && (
          <div contentEditable={false} className='mb-2 flex flex-wrap items-center gap-2'>
            {duplicateReplacementIdentifier && path ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-6 rounded-xs border-amber-500/40 px-2 text-[11px] text-amber-700 hover:bg-amber-500/10 hover:text-amber-800'
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  footnoteTransforms.normalizeDuplicateDefinition({
                    identifier: duplicateReplacementIdentifier,
                    path,
                  })
                }}
              >
                Renumerar para [^{duplicateReplacementIdentifier}]
              </Button>
            ) : null}
          </div>
        )}
        {props.children}
      </div>
    </PlateElement>
  )
}

export function FootnoteInputElement(props: PlateElementProps) {
  const { editor, element } = props
  const [search, setSearch] = React.useState('')
  const footnoteApi = editor.getApi(FootnoteReferencePlugin).footnote
  const insertTransforms = editor.getTransforms(FootnoteReferencePlugin).insert

  const identifiers = footnoteApi.identifiers?.() ?? []
  const nextIdentifier = footnoteApi.nextId?.() ?? '1'
  const query = search.trim()
  const numericQuery = NUMERIC_FOOTNOTE_QUERY.test(query) ? query : ''
  const proposedIdentifier = numericQuery || nextIdentifier
  const showCreateOption = !identifiers.includes(proposedIdentifier)

  const filteredIdentifiers = identifiers.filter((identifier: string) => {
    if (!query) return true

    const preview = footnoteApi.definitionText?.({ identifier }) ?? ''

    return identifier.includes(query) || preview.toLowerCase().includes(query.toLowerCase())
  })

  const insertSelectedFootnote = React.useCallback(
    (identifier: string) => {
      insertTransforms.footnote({ focusDefinition: false, identifier })
    },
    [insertTransforms]
  )

  return (
    <PlateElement {...props} as='span'>
      <InlineCombobox value={search} element={element} filter={false} setValue={setSearch} trigger='^'>
        <InlineComboboxInput className='min-w-[1ch]' />

        <InlineComboboxContent className='my-1.5 w-72'>
          {showCreateOption || filteredIdentifiers.length > 0 ? null : (
            <InlineComboboxEmpty>Nenhuma nota de rodapé</InlineComboboxEmpty>
          )}

          <InlineComboboxGroup>
            {showCreateOption && (!query || numericQuery) ? (
              <InlineComboboxItem value={`new-${proposedIdentifier}`} onClick={() => insertSelectedFootnote(proposedIdentifier)}>
                <span className='flex min-w-0 items-center gap-1.5 whitespace-nowrap'>
                  <span className='font-mono text-muted-foreground'>[^{proposedIdentifier}]</span>
                  <span className='truncate'>: Nova nota de rodapé...</span>
                </span>
              </InlineComboboxItem>
            ) : null}

            {filteredIdentifiers.map((identifier: string) => (
              <InlineComboboxItem key={identifier} value={`footnote-${identifier}`} onClick={() => insertSelectedFootnote(identifier)}>
                <span className='flex min-w-0 items-center gap-1.5 whitespace-nowrap'>
                  <span className='font-mono text-muted-foreground'>[^{identifier}]</span>
                  <span className='truncate'>: {getFootnotePreviewLabel(footnoteApi.definitionText?.({ identifier }))}</span>
                </span>
              </InlineComboboxItem>
            ))}
          </InlineComboboxGroup>
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  )
}
