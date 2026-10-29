export const CONTEXT_SIDEBAR_SECTIONS = ['projects'] as const

export type ContextSidebarSectionId = (typeof CONTEXT_SIDEBAR_SECTIONS)[number]

export function contextSidebarStorageKey(section: ContextSidebarSectionId) {
  return `nexo.sidebar.${section}`
}

/** `<html>` attribute present while a section's sidebar is collapsed. */
export function contextSidebarAttribute(section: ContextSidebarSectionId) {
  return `data-sidebar-${section}`
}

export function contextSidebarId(section: ContextSidebarSectionId) {
  return `context-sidebar-${section}`
}

// Runs before the first paint, next to the theme script. The server always
// renders the sidebars open (localStorage only exists in the browser), so
// without it a collapsed sidebar would flash open on every full load.
// Plain localStorage strings, not greatstorage: its devalue format is not
// something an inline script should parse.
export const CONTEXT_SIDEBAR_INIT_SCRIPT = `(function(){try{var d=document.documentElement;${JSON.stringify(CONTEXT_SIDEBAR_SECTIONS)}.forEach(function(s){if(localStorage.getItem('nexo.sidebar.'+s)==='closed')d.setAttribute('data-sidebar-'+s,'closed')})}catch(e){}})()`

// Visibility is CSS only, keyed off the <html> attribute: the server markup
// and the hydrated markup are identical, so nothing flips at hydration.
// Unlayered, so it wins over Tailwind's (layered) utilities.
//
// The sidebar animates its width instead of toggling display (display cannot
// transition). visibility interpolates as visible for the whole close and
// flips at the end, so the slide is seen and the collapsed sidebar still
// leaves the tab order and the accessibility tree. A full load starts in its
// final state (the init script runs before the first paint), so only clicks
// animate.
export const CONTEXT_SIDEBAR_STYLE =
  CONTEXT_SIDEBAR_SECTIONS.map(
    (s) =>
      `[data-context-sidebar='${s}']{transition:width 200ms ease-out,visibility 200ms}` +
      `html[data-sidebar-${s}='closed'] [data-context-sidebar='${s}']{width:0;visibility:hidden}` +
      `html:not([data-sidebar-${s}='closed']) [data-context-sidebar-expand='${s}']{display:none}`,
  ).join('') +
  '@media (prefers-reduced-motion:reduce){[data-context-sidebar]{transition:none}}'
