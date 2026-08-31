'use client'

import * as React from 'react'
import type { TComboboxInputElement, TMentionElement } from 'platejs'
import type { PlateElementProps } from 'platejs/react'
import { getMentionOnSelectItem } from '@platejs/mention'
import { IS_APPLE, KEYS } from 'platejs'
import { PlateElement, useFocused, useReadOnly, useSelected } from 'platejs/react'
import { useDebounce } from '@/components/hooks/use-debounce'
import { useMembers } from '@/src/hooks/use-member'
import { useWikiEditorContext } from '@/src/hooks/use-wiki-editor-context'
import { useMounted } from '@/components/hooks/use-mounted'
import { cn } from '@/lib/utils'
import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxInput,
  InlineComboboxItem,
} from './inline-combobox'

export function MentionElement(props: PlateElementProps<TMentionElement> & { prefix?: string }) {
  const { element } = props
  const selected = useSelected()
  const focused = useFocused()
  const mounted = useMounted()
  const readOnly = useReadOnly()

  return (
    <PlateElement
      {...props}
      className={cn(
        'inline-block rounded-md bg-muted px-1.5 py-0.5 align-baseline font-medium text-sm',
        !readOnly && 'cursor-pointer',
        selected && focused && 'ring-2 ring-ring',
        element.children[0][KEYS.bold] === true && 'font-bold',
        element.children[0][KEYS.italic] === true && 'italic',
        element.children[0][KEYS.underline] === true && 'underline'
      )}
      attributes={{
        ...props.attributes,
        contentEditable: false,
        'data-slate-value': element.value,
        draggable: true,
      }}
    >
      {mounted && IS_APPLE ? (
        <>
          {props.children}
          {props.prefix}
          {element.value}
        </>
      ) : (
        <>
          {props.prefix}
          {element.value}
          {props.children}
        </>
      )}
    </PlateElement>
  )
}

const onSelectItem = getMentionOnSelectItem()

export function MentionInputElement(props: PlateElementProps<TComboboxInputElement>) {
  const { editor, element } = props
  const { workspaceId } = useWikiEditorContext()
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebounce(search, 200)

  const { data } = useMembers(workspaceId, {
    search: debouncedSearch,
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    pageSize: 8,
  })

  const members = data?.members ?? []

  return (
    <PlateElement {...props} as='span'>
      <InlineCombobox value={search} element={element} filter={false} setValue={setSearch} showTrigger={false} trigger='@'>
        <span className='inline-block rounded-md bg-muted px-1.5 py-0.5 align-baseline text-sm ring-ring focus-within:ring-2'>
          <InlineComboboxInput />
        </span>

        <InlineComboboxContent className='my-1.5'>
          <InlineComboboxEmpty>Nenhum membro encontrado</InlineComboboxEmpty>

          <InlineComboboxGroup>
            {members.map((member) => (
              <InlineComboboxItem
                key={member.userId}
                value={member.name}
                onClick={() => onSelectItem(editor, { text: member.name, key: member.userId }, search)}
              >
                {member.name}
              </InlineComboboxItem>
            ))}
          </InlineComboboxGroup>
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  )
}
