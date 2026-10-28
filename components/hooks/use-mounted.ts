'use client'

import * as React from 'react'

// Only becomes `true` after React's mount cycle (which in dev/Strict
// Mode runs mount->unmount->mount again) settles. Effects that open an
// external connection with async state (e.g. Yjs) should wait for this
// before initializing, otherwise the first phantom cycle's destroy()
// corrupts the second init().
export function useMounted() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    // Not useHydrated: this must wait for Strict Mode's mount-unmount-mount
    // to settle, which only a state set from an effect does.
    // react-doctor-disable-next-line react-doctor/no-initialize-state
    setMounted(true)
  }, [])

  return mounted
}
