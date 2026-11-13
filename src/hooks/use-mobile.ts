import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Adiado: evita setState síncrono no corpo do efeito (react-hooks).
    const t = window.setTimeout(() => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT), 0)
    return () => {
      window.clearTimeout(t)
      mql.removeEventListener("change", onChange)
    }
  }, [])

  return !!isMobile
}
