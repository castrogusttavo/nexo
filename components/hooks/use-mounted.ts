'use client'

import * as React from 'react'

// Só fica `true` depois que o ciclo de mount do React (que em dev/Strict
// Mode roda montar->desmontar->montar de novo) se estabiliza. Efeitos que
// abrem conexão externa com estado assíncrono (ex: Yjs) devem esperar isso
// antes de inicializar, senão o destroy() do primeiro ciclo fantasma corrompe
// o segundo init().
export function useMounted() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}
