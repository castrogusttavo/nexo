'use client'

import * as React from 'react'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { BlockSelectionPlugin, useBlockSelected } from '@platejs/selection/react'
import { getTableColumnCount, setCellBackground } from '@platejs/table'
import {
  TablePlugin,
  TableProvider,
  useCellIndices,
  useTableBordersDropdownMenuContentState,
  useTableColSizes,
  useTableElement,
  useTableMergeState,
  useTableSelectionDom,
  useTableValue,
} from '@platejs/table/react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CombineIcon,
  EraserIcon,
  Grid2X2Icon,
  PaintBucketIcon,
  SquareSplitHorizontalIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { type TTableCellElement, type TTableElement, type TTableRowElement, KEYS } from 'platejs'
import {
  type PlateElementProps,
  PlateElement,
  useEditorPlugin,
  useEditorRef,
  useEditorSelector,
  useElement,
  useElementSelector,
  useFocusedLast,
  usePluginOption,
  useReadOnly,
  useRemoveNodeButton,
  useSelected,
  withHOC,
} from 'platejs/react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { blockSelectionVariants } from './block-selection'
import { BorderAllIcon, BorderBottomIcon, BorderLeftIcon, BorderNoneIcon, BorderRightIcon, BorderTopIcon } from './table-icons'
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarMenuGroup } from './toolbar'

const TABLE_CONTROL_COLUMN_WIDTH = 8
const TABLE_DEFAULT_COLUMN_WIDTH = 120
const TABLE_MULTI_SELECTION_TOOLBAR_DELAY_MS = 150

const TABLE_COLORS = [
  { name: 'Vermelho', value: '#fecaca' },
  { name: 'Laranja', value: '#fed7aa' },
  { name: 'Amarelo', value: '#fef08a' },
  { name: 'Verde', value: '#bbf7d0' },
  { name: 'Azul', value: '#bfdbfe' },
  { name: 'Roxo', value: '#e9d5ff' },
  { name: 'Rosa', value: '#fbcfe8' },
]

export const TableElement = withHOC(
  TableProvider,
  function TableElement({ children, ...props }: PlateElementProps<TTableElement>) {
    const readOnly = useReadOnly()
    const isSelectionAreaVisible = usePluginOption(BlockSelectionPlugin, 'isSelectionAreaVisible')
    const hasControls = !readOnly && !isSelectionAreaVisible
    const { marginLeft, props: tableProps } = useTableElement()
    const colSizes = useTableColSizes()
    const controlColumnWidth = hasControls ? TABLE_CONTROL_COLUMN_WIDTH : 0
    const tableRef = React.useRef<HTMLTableElement>(null)
    useTableSelectionDom(tableRef)

    const resolvedColSizes = React.useMemo(() => {
      if (colSizes.length > 0) {
        return colSizes.map((colSize) => colSize || TABLE_DEFAULT_COLUMN_WIDTH)
      }
      return Array.from({ length: getTableColumnCount(props.element) }, () => TABLE_DEFAULT_COLUMN_WIDTH)
    }, [colSizes, props.element])

    const tableVariableStyle = React.useMemo(() => {
      if (resolvedColSizes.length === 0) return

      return {
        ...Object.fromEntries(resolvedColSizes.map((colSize, index) => [`--table-col-${index}`, `${colSize}px`])),
      } as React.CSSProperties
    }, [resolvedColSizes])

    const tableStyle = React.useMemo(
      () =>
        ({
          width: `${resolvedColSizes.reduce((total, colSize) => total + colSize, 0) + controlColumnWidth}px`,
        }) as React.CSSProperties,
      [controlColumnWidth, resolvedColSizes]
    )

    const isSelectingTable = useBlockSelected(props.element.id as string)

    const content = (
      <PlateElement
        {...props}
        className={cn('overflow-x-auto py-5', hasControls && '-ml-2 *:data-[slot=block-selection]:left-2')}
        style={{ paddingLeft: marginLeft }}
      >
        <div className='group/table relative w-fit' style={tableVariableStyle}>
          <table
            ref={tableRef}
            className={cn(
              'mr-0 ml-px table h-px table-fixed border-collapse',
              'data-[table-selecting=true]:[&_*::selection]:!bg-transparent',
              'data-[table-selecting=true]:[&_*::selection]:!text-inherit',
              'data-[table-selecting=true]:[&_*]:!caret-transparent'
            )}
            style={tableStyle}
            {...tableProps}
          >
            {resolvedColSizes.length > 0 && (
              <colgroup>
                {hasControls && (
                  <col style={{ maxWidth: TABLE_CONTROL_COLUMN_WIDTH, minWidth: TABLE_CONTROL_COLUMN_WIDTH, width: TABLE_CONTROL_COLUMN_WIDTH }} />
                )}
                {resolvedColSizes.map((colSize, index) => (
                  <col key={index} style={{ maxWidth: colSize, minWidth: colSize, width: colSize }} />
                ))}
              </colgroup>
            )}
            <tbody className='min-w-full'>{children}</tbody>
          </table>

          {isSelectingTable && <div className={blockSelectionVariants()} contentEditable={false} />}
        </div>
      </PlateElement>
    )

    if (readOnly) return content

    return <TableFloatingToolbar>{content}</TableFloatingToolbar>
  }
)

function TableFloatingToolbar({ children }: { children: React.ReactNode }) {
  const selectedCellCount = useEditorSelector(
    (editor) => editor.getApi(TablePlugin).table.getSelectedCellIds()?.length ?? 0,
    []
  )
  const selected = useSelected()
  const isFocusedLast = useFocusedLast()
  const [isExpandedSelectionToolbarReady, setIsExpandedSelectionToolbarReady] = React.useState(false)
  const isSingleCellToolbarOpen = isFocusedLast && selected && selectedCellCount === 0
  const isExpandedSelectionPending = isFocusedLast && selectedCellCount > 1

  React.useEffect(() => {
    if (!isExpandedSelectionPending) {
      setIsExpandedSelectionToolbarReady(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsExpandedSelectionToolbarReady(true)
    }, TABLE_MULTI_SELECTION_TOOLBAR_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [isExpandedSelectionPending])

  const shouldRenderExpandedSelectionToolbar = isExpandedSelectionToolbarReady && isExpandedSelectionPending
  const isToolbarOpen = isSingleCellToolbarOpen || shouldRenderExpandedSelectionToolbar
  const anchorRef = React.useRef<HTMLDivElement>(null)

  return (
    <PopoverPrimitive.Root open={isToolbarOpen} modal={false}>
      <div ref={anchorRef}>{children}</div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner anchor={anchorRef} align='center' side='top' sideOffset={8} className='isolate z-50 outline-none'>
          <PopoverPrimitive.Popup initialFocus={false} contentEditable={false}>
            {isSingleCellToolbarOpen && <SingleCellTableFloatingToolbarContent />}
            {shouldRenderExpandedSelectionToolbar && <ExpandedSelectionTableFloatingToolbarContent />}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

function ExpandedSelectionTableFloatingToolbarContent() {
  const { tf } = useEditorPlugin(TablePlugin)
  const { canMerge, canSplit } = useTableMergeState()

  if (!canMerge && !canSplit) return null

  return <TableFloatingToolbarContent canMerge={canMerge} canSplit={canSplit} onMerge={() => tf.table.merge()} onSplit={() => tf.table.split()} />
}

function SingleCellTableFloatingToolbarContent() {
  const { tf } = useEditorPlugin(TablePlugin)
  const element = useElement<TTableElement>()
  const { props: buttonProps } = useRemoveNodeButton({ element })
  const { canSplit } = useTableMergeState()

  return (
    <TableFloatingToolbarContent
      buttonProps={buttonProps}
      canSplit={canSplit}
      singleCellMode
      onDeleteColumn={() => tf.remove.tableColumn()}
      onDeleteRow={() => tf.remove.tableRow()}
      onInsertColumnAfter={() => tf.insert.tableColumn()}
      onInsertColumnBefore={() => tf.insert.tableColumn({ before: true })}
      onInsertRowAfter={() => tf.insert.tableRow()}
      onInsertRowBefore={() => tf.insert.tableRow({ before: true })}
      onSplit={() => tf.table.split()}
    />
  )
}

function TableFloatingToolbarContent({
  buttonProps,
  canMerge = false,
  canSplit = false,
  singleCellMode = false,
  onDeleteColumn,
  onDeleteRow,
  onInsertColumnAfter,
  onInsertColumnBefore,
  onInsertRowAfter,
  onInsertRowBefore,
  onMerge,
  onSplit,
}: {
  buttonProps?: React.ComponentProps<typeof ToolbarButton>
  canMerge?: boolean
  canSplit?: boolean
  singleCellMode?: boolean
  onDeleteColumn?: () => void
  onDeleteRow?: () => void
  onInsertColumnAfter?: () => void
  onInsertColumnBefore?: () => void
  onInsertRowAfter?: () => void
  onInsertRowBefore?: () => void
  onMerge?: () => void
  onSplit?: () => void
}) {
  return (
    <Toolbar
      className='scrollbar-hide flex w-auto max-w-[80vw] flex-row overflow-x-auto rounded-md border bg-popover p-1 shadow-md print:hidden'
      contentEditable={false}
    >
      <ToolbarGroup>
        <ColorDropdownMenu tooltip='Cor de fundo'>
          <PaintBucketIcon />
        </ColorDropdownMenu>
        {canMerge && onMerge && (
          <ToolbarButton onClick={onMerge} onMouseDown={(e) => e.preventDefault()} tooltip='Mesclar células'>
            <CombineIcon />
          </ToolbarButton>
        )}
        {canSplit && onSplit && (
          <ToolbarButton onClick={onSplit} onMouseDown={(e) => e.preventDefault()} tooltip='Dividir célula'>
            <SquareSplitHorizontalIcon />
          </ToolbarButton>
        )}

        <TableBordersDropdownMenu />

        {singleCellMode && (
          <ToolbarGroup>
            <ToolbarButton tooltip='Excluir tabela' {...buttonProps}>
              <Trash2Icon />
            </ToolbarButton>
          </ToolbarGroup>
        )}
      </ToolbarGroup>

      {singleCellMode && (
        <ToolbarGroup>
          <ToolbarButton onClick={onInsertRowBefore} onMouseDown={(e) => e.preventDefault()} tooltip='Inserir linha antes'>
            <ArrowUpIcon />
          </ToolbarButton>
          <ToolbarButton onClick={onInsertRowAfter} onMouseDown={(e) => e.preventDefault()} tooltip='Inserir linha depois'>
            <ArrowDown />
          </ToolbarButton>
          <ToolbarButton onClick={onDeleteRow} onMouseDown={(e) => e.preventDefault()} tooltip='Excluir linha'>
            <XIcon />
          </ToolbarButton>
        </ToolbarGroup>
      )}

      {singleCellMode && (
        <ToolbarGroup>
          <ToolbarButton onClick={onInsertColumnBefore} onMouseDown={(e) => e.preventDefault()} tooltip='Inserir coluna antes'>
            <ArrowLeft />
          </ToolbarButton>
          <ToolbarButton onClick={onInsertColumnAfter} onMouseDown={(e) => e.preventDefault()} tooltip='Inserir coluna depois'>
            <ArrowRight />
          </ToolbarButton>
          <ToolbarButton onClick={onDeleteColumn} onMouseDown={(e) => e.preventDefault()} tooltip='Excluir coluna'>
            <XIcon />
          </ToolbarButton>
        </ToolbarGroup>
      )}
    </Toolbar>
  )
}

function ArrowUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill='none' viewBox='0 0 24 24' strokeWidth={2} stroke='currentColor' {...props}>
      <path strokeLinecap='round' strokeLinejoin='round' d='M12 19V5m0 0-7 7m7-7 7 7' />
    </svg>
  )
}

function TableBordersDropdownMenu() {
  const editor = useEditorRef()
  const {
    getOnSelectTableBorder,
    hasBottomBorder,
    hasLeftBorder,
    hasNoBorders,
    hasOuterBorders,
    hasRightBorder,
    hasTopBorder,
  } = useTableBordersDropdownMenuContentState()

  return (
    <DropdownMenu
      modal={false}
      onOpenChange={(open) => {
        if (!open) editor.tf.focus()
      }}
    >
      <DropdownMenuTrigger
        render={
          <ToolbarButton tooltip='Bordas da célula'>
            <Grid2X2Icon />
          </ToolbarButton>
        }
      />
      <DropdownMenuContent className='min-w-[220px]' align='start' side='right' sideOffset={0}>
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem checked={hasTopBorder} onCheckedChange={getOnSelectTableBorder('top')}>
            <BorderTopIcon />
            <div>Borda superior</div>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={hasRightBorder} onCheckedChange={getOnSelectTableBorder('right')}>
            <BorderRightIcon />
            <div>Borda direita</div>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={hasBottomBorder} onCheckedChange={getOnSelectTableBorder('bottom')}>
            <BorderBottomIcon />
            <div>Borda inferior</div>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={hasLeftBorder} onCheckedChange={getOnSelectTableBorder('left')}>
            <BorderLeftIcon />
            <div>Borda esquerda</div>
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem checked={hasNoBorders} onCheckedChange={getOnSelectTableBorder('none')}>
            <BorderNoneIcon />
            <div>Sem borda</div>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={hasOuterBorders} onCheckedChange={getOnSelectTableBorder('outer')}>
            <BorderAllIcon />
            <div>Bordas externas</div>
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ColorDropdownMenu({ children, tooltip }: { children: React.ReactNode; tooltip: string }) {
  const [open, setOpen] = React.useState(false)
  const editor = useEditorRef()

  const onUpdateColor = React.useCallback(
    (color: string) => {
      setOpen(false)
      setCellBackground(editor, { color, selectedCells: editor.getApi(TablePlugin).table.getSelectedCells() ?? [] })
    },
    [editor]
  )

  const onClearColor = React.useCallback(() => {
    setOpen(false)
    setCellBackground(editor, { color: null, selectedCells: editor.getApi(TablePlugin).table.getSelectedCells() ?? [] })
  }, [editor])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        render={
          <ToolbarButton tooltip={tooltip}>{children}</ToolbarButton>
        }
      />

      <DropdownMenuContent align='start'>
        <ToolbarMenuGroup label='Cores'>
          <div className='grid grid-cols-7 gap-1 px-2 py-1'>
            {TABLE_COLORS.map((color) => (
              <button
                key={color.value}
                type='button'
                aria-label={color.name}
                onClick={() => onUpdateColor(color.value)}
                className='size-6 rounded-full border border-border'
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </ToolbarMenuGroup>
        <DropdownMenuGroup>
          <DropdownMenuItem className='p-2' onClick={onClearColor}>
            <EraserIcon />
            <span>Limpar</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TableRowElement({ children, ...props }: PlateElementProps<TTableRowElement>) {
  const rowIndex = useElementSelector(([, path]) => path.at(-1) as number, [], { key: KEYS.tr })
  const rowSize = useElementSelector(([node]) => (node as TTableRowElement).size, [], { key: KEYS.tr })
  const rowSizeOverrides = useTableValue('rowSizeOverrides')
  const rowMinHeight = rowSizeOverrides.get?.(rowIndex) ?? rowSize

  return (
    <PlateElement
      {...props}
      as='tr'
      className='group/row'
      style={
        {
          ...props.style,
          '--tableRowMinHeight': rowMinHeight ? `${rowMinHeight}px` : undefined,
        } as React.CSSProperties
      }
    >
      {children}
    </PlateElement>
  )
}

function useTableCellPresentation(element: TTableCellElement) {
  const { api } = useEditorPlugin(TablePlugin)
  const { col } = useCellIndices()

  const colSpan = api.table.getColSpan(element)
  const rowSpan = api.table.getRowSpan(element)
  const width = React.useMemo(() => {
    const terms = Array.from({ length: colSpan }, (_, offset) => `var(--table-col-${col + offset}, 120px)`)
    return terms.length === 1 ? terms[0]! : `calc(${terms.join(' + ')})`
  }, [col, colSpan])

  return { colSpan, rowSpan, width }
}

export function TableCellElement({ isHeader, ...props }: PlateElementProps<TTableCellElement> & { isHeader?: boolean }) {
  const readOnly = useReadOnly()
  const element = props.element

  const tableId = useElementSelector(([node]) => node.id as string, [], { key: KEYS.table })
  const rowId = useElementSelector(([node]) => node.id as string, [], { key: KEYS.tr })
  const isSelectingTable = useBlockSelected(tableId)
  const isSelectingRow = useBlockSelected(rowId) || isSelectingTable

  const { colSpan, rowSpan, width } = useTableCellPresentation(element)

  return (
    <PlateElement
      {...props}
      as={isHeader ? 'th' : 'td'}
      className={cn(
        'relative h-full overflow-visible border border-border bg-background p-0',
        element.background ? 'bg-(--cellBackground)' : 'bg-background',
        isHeader && 'text-left *:m-0',
        'data-[table-cell-selected=true]:before:z-10',
        'data-[table-cell-selected=true]:before:bg-brand/5',
        "before:absolute before:inset-0 before:box-border before:size-full before:select-none before:content-['']"
      )}
      style={{ '--cellBackground': element.background, maxWidth: width, minWidth: width } as React.CSSProperties}
      attributes={{
        ...props.attributes,
        colSpan,
        'data-table-cell-id': element.id,
        rowSpan,
      }}
    >
      <div
        className='relative z-20 box-border h-full px-3 py-2'
        style={rowSpan === 1 ? { minHeight: 'var(--tableRowMinHeight, 0px)' } : undefined}
      >
        {props.children}
      </div>

      {isSelectingRow && !readOnly && <div className={blockSelectionVariants()} contentEditable={false} />}
    </PlateElement>
  )
}

export function TableCellHeaderElement(props: React.ComponentProps<typeof TableCellElement>) {
  return <TableCellElement {...props} isHeader />
}
