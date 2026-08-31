import { cva } from "class-variance-authority";
import { NodeApi, SlateEditor, TElement } from "platejs";
import { BaseTocPlugin, Heading, isHeading } from '@platejs/toc'
import { SlateElement, SlateElementProps } from "platejs/static";
import { Button } from "./button";

const headingItemVariants = cva(
  'block h-auto w-full cursor-pointer truncate rounded-none px-0.5 py-1.5 text-left font-medium text-muted-foreground underline decoration-[0.5px] underline-offset-4 hover:bg-accent hover:text-muted-foreground',
  {
    variants: {
      depth: {
        1: 'pl-0.5',
        2: 'pl-[26px]',
        3: 'pl-[50px]',
      },
    },
  }
)

const headingDepth: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 }

const getHeadingList = (editor?: SlateEditor) => {
  if (!editor) return []

  const options = editor.getOptions(BaseTocPlugin)
  if (options.queryHeading) return options.queryHeading(editor)

  const headingList: Heading[] = []
  const values = editor.api.nodes<TElement>({ at: [], match: (n) => isHeading(n) })
  if (!values) return []

  Array.from(values).forEach(([node, path]) => {
    const { type } = node
    const title = NodeApi.string(node)
    const depth = headingDepth[type]
    const id = node.id as string

    if (title) headingList.push({ id, depth, path, title, type })
  })

  return headingList
}

export function TocElementStatic(props: SlateElementProps) {
  const { editor } = props
  const headingList = getHeadingList(editor)

  return (
    <SlateElement {...props} className='mb-1 p-0'>
      <div>
        {headingList.length > 0 ? (
          headingList.map((item: Heading) => (
            <Button key={item.title} variant='ghost' className={headingItemVariants({ depth: item.depth as 1 | 2 | 3 })}>
              {item.title}
            </Button>
          ))
        ) : (
          <div className='text-muted-foreground text-sm'>Crie um título para exibir o sumário.</div>
        )}
      </div>
      {props.children}
    </SlateElement>
  )
}
