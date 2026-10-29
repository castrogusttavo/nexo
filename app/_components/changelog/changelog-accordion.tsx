import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface ChangelogAccordionProps {
  title: string
  items: string[]
}

export function ChangelogAccordion({ title, items }: ChangelogAccordionProps) {
  return (
    <Accordion>
      <AccordionItem value='item-1' className='p-4'>
        <AccordionTrigger className='w-full text-base hover:no-underline pt-0'>
          {title}
        </AccordionTrigger>
        <AccordionContent>
          <ul className='list-disc space-y-2 pl-6 text-base'>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
