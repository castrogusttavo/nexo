import { Activity02Icon, PanelLeftIcon } from "@hugeicons-pro/core-stroke-rounded";
import { DetailsPanel, DetailsPanelTab, DetailsPanelToggle } from "../details-panel";
import { useState } from "react";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/src/__tests__/helpers/component";

const PANEL_ID = 'test-details'

const TABS: DetailsPanelTab[] = [
{
    value: 'properties',
    label: 'Propriedades',
    icon: PanelLeftIcon,
    content: <p>Conteúdo das propriedades</p>,
  },
	{
		value: 'activity',
		label: 'Atividade',
		icon: Activity02Icon,
		content: <p>Conteúdo da atividade</p>
	}
]

function Harness({
	initialOpen = true,
	tabs = TABS
}: {
	initialOpen?: boolean
	tabs?: DetailsPanelTab[]
}) {
	const [open, setOpen] = useState(initialOpen)
	return (
		<>
			<DetailsPanelToggle 
				panelId={PANEL_ID}
				open={open}
				onToggle={() => setOpen((current) => !current)}
			/>
			<DetailsPanel 
				id={PANEL_ID}
				label='Detalhes de teste'
				open={open}
				tabs={tabs}
			/>
		</>
	)
}

const panel = () =>
	screen.queryByRole('complementary', { name: 'Detalhes de teste' })

describe('<DetailsPanelToggle />', () => {
  it('points at the panel it controls and says it is open', () => {
    renderWithProviders(<Harness />)

    const toggle = screen.getByRole('button', { name: 'Fechar detalhes' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-controls', PANEL_ID)
  })

  it('closes the panel and offers to open it again', async () => {
    const { user } = renderWithProviders(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Fechar detalhes' }))

    const toggle = screen.getByRole('button', { name: 'Abrir detalhes' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(panel()).not.toBeInTheDocument()
  })

  it('reopens a closed panel', async () => {
    const { user } = renderWithProviders(<Harness initialOpen={false} />)

    await user.click(screen.getByRole('button', { name: 'Abrir detalhes' }))

    expect(panel()).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Fechar detalhes' }),
    ).toHaveAttribute('aria-expanded', 'true')
  })

  it('calls onToggle once per click', async () => {
    const onToggle = vi.fn()
    const { user } = renderWithProviders(
      <DetailsPanelToggle panelId={PANEL_ID} open onToggle={onToggle} />,
    )

    await user.click(screen.getByRole('button', { name: 'Fechar detalhes' }))

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('spells out what the icon button does in its tooltip', async () => {
    const { user } = renderWithProviders(<Harness />)

    await user.hover(screen.getByRole('button', { name: 'Fechar detalhes' }))

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Fechar detalhes',
    )
  })
})

describe('<DetailsPanel />', () => {
  it('is a named region carrying the id the toggle points at', () => {
    renderWithProviders(<Harness />)

    expect(panel()).toHaveAttribute('id', PANEL_ID)
  })

  it('stays in the page but hidden while closed', () => {
    renderWithProviders(<Harness initialOpen={false} />)

    expect(panel()).not.toBeInTheDocument()
    // Hidden, not unmounted: the toggle's aria-controls still resolves.
    expect(document.getElementById(PANEL_ID)).toHaveAttribute('hidden')
  })

  it('names each icon-only tab after its label', () => {
    renderWithProviders(<Harness />)

    expect(
      screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-label')),
    ).toEqual(['Propriedades', 'Atividade'])
  })

  it('opens on the first tab by default', () => {
    renderWithProviders(<Harness />)

    expect(screen.getByRole('tab', { name: 'Propriedades' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Conteúdo das propriedades',
    )
  })

  it('opens on defaultTab when one is given', () => {
    renderWithProviders(
      <DetailsPanel
        id={PANEL_ID}
        label='Detalhes de teste'
        open
        tabs={TABS}
        defaultTab='activity'
      />,
    )

    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Conteúdo da atividade',
    )
  })

  it('shows the content of the tab the user picks', async () => {
    const { user } = renderWithProviders(<Harness />)

    await user.click(screen.getByRole('tab', { name: 'Atividade' }))
    await user.click(screen.getByRole('tab', { name: 'Atividade' }))

    expect(screen.getByRole('tab', { name: 'Atividade' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Conteúdo da atividade',
    )
    expect(
      screen.queryByText('Conteúdo das propriedades'),
    ).not.toBeInTheDocument()
  })

  it('shows the label as a tooltip on the tab', async () => {
    const { user } = renderWithProviders(<Harness />)

    await user.hover(screen.getByRole('tab', { name: 'Atividade' }))

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Atividade')
  })

  it('renders children as a plain panel when there are no tabs', () => {
    renderWithProviders(
      <DetailsPanel id={PANEL_ID} label='Detalhes de teste' open>
        <p>Conteúdo livre</p>
      </DetailsPanel>,
    )

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(panel()).toHaveTextContent('Conteúdo livre')
  })

  it('falls back to children when the tab list is empty', () => {
    renderWithProviders(
      <DetailsPanel id={PANEL_ID} label='Detalhes de teste' open tabs={[]}>
        <p>Sem abas</p>
      </DetailsPanel>,
    )

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(panel()).toHaveTextContent('Sem abas')
  })
})