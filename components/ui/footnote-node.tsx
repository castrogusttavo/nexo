'use client'

import * as React from 'react'
import type { TFootnoteElement } from '@platejs/footnote'
import { FootnoteReferencePlugin } from '@platejs/footnote/react'
import type { PlateElementProps } from 'platejs/react'
import { PlateElement, useFocused, useSelected } from 'platejs/react'
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

export function FootnoteReferenceElement(props: PlateElementProps<TFootnoteElement>) {
  const { editor, element } = props
  const identifier = element.identifier ?? ''
  const footnoteApi = editor.getApi(FootnoteReferencePlugin).footnote
  const footnoteTransforms = editor.getTransforms(FootnoteReferencePlugin).footnote
  const selected = useSelected()
  const focused = useFocused()
  const isResolved = identifier ? footnoteApi.isResolved({ identifier }) : false

  return (
    <PlateElement
      {...props}
      as='sup'
      className='mx-0.5 align-super'
      attributes={{ ...props.attributes, contentEditable: false, draggable: true }}
    >
      {props.children}
      <button
        type='button'
        className={cn(
          'cursor-pointer rounded-xs font-medium text-primary text-xs focus:ring-2 focus:ring-ring focus:ring-offset-1',
          selected && focused && 'ring-2 ring-ring ring-offset-1'
        )}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onMouseDown={(event) => {
          event.preventDefault()
          event.stopPropagation()

          if (isResolved) {
            footnoteTransforms.focusDefinition({ identifier })
            return
          }

          footnoteTransforms.createDefinition({ identifier })
        }}
      >
        [{identifier}]
      </button>
    </PlateElement>
  )
}

export function FootnoteDefinitionElement(props: PlateElementProps<TFootnoteElement>) {
  const { editor, element } = props
  const identifier = element.identifier ?? ''
  const footnoteTransforms = editor.getTransforms(FootnoteReferencePlugin).footnote

  return (
    <PlateElement {...props} className='mt-1.5 flex items-start gap-1.5'>
      <div contentEditable={false}>
        <button
          type='button'
          aria-label={`Voltar para a referência ${identifier}`}
          className='min-w-3 cursor-pointer rounded-xs text-muted-foreground text-xs tabular-nums underline-offset-2 hover:text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-1'
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
            footnoteTransforms.focusReference({ identifier })
          }}
        >
          {identifier}
        </button>
      </div>
      <div className='min-w-0 flex-1'>{props.children}</div>
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
                  <span className='truncate'>: {footnoteApi.definitionText?.({ identifier }) || 'Vazia'}</span>
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
