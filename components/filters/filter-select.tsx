import { Combobox } from "@/app/_components/ui/combobox"
import { Button } from "../ui/button"
import { NexoIcon } from "../icon/icon"
import { ArrowDown01Icon } from "@hugeicons-pro/core-stroke-rounded"

interface FilterSelectOption {
  label: string
  value: string
}

interface FilterSelectBaseProps {
  title: string
  options: FilterSelectOption[]
}

interface FilterSelectSingleProps extends FilterSelectBaseProps {
  multiple?: false
  value: string | undefined
  onChange: (value: string) => void
}

interface FilterSelectMultipleProps extends FilterSelectBaseProps {
  multiple: true
  value: string[]
  onChange: (value: string[]) => void
}

type FilterSelectProps = FilterSelectSingleProps | FilterSelectMultipleProps

export function FilterSelect(props: FilterSelectProps) {
  const { title, options } = props

  if (props.multiple) {
    const selected = options.filter((o) => props.value.includes(o.value))
    const triggerLabel =
      selected.length === 0 ? title : selected.length === 1 ? selected[0].label : `${title} (${selected.length})`

    return (
      <Combobox
        multiple
        options={options}
        getValue={(o) => o.value}
        getSearchText={(o) => o.label}
        value={props.value}
        onChange={props.onChange}
        emptyMessage="Nenhum resultado."
        contentClassName="w-48"
        trigger={
          <Button variant='outline' size='sm' className='h-8'>
            {triggerLabel}
            <NexoIcon icon={ArrowDown01Icon} />
          </Button>
        }
        renderItem={(option) => option.label}
      />
    )
  }

  const selected = options.find((o) => o.value === props.value)

  return (
    <Combobox
      options={options}
      getValue={(o) => o.value}
      getSearchText={(o) => o.label}
      value={props.value}
      onChange={props.onChange}
      emptyMessage="Nenhum resultado."
      contentClassName="w-48"
      trigger={
        <Button variant='outline' size='sm' className='h-8'>
          {selected?.label ?? title}
          <NexoIcon icon={ArrowDown01Icon} />
        </Button>
      }
      renderItem={(option) => option.label}
    />
  )
}
