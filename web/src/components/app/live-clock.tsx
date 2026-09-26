import { useEffect, useState } from "react"

import { formatTimeBR } from "@/lib/format"

/** Relógio HH:MM atualizado a cada segundo. */
export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => formatTimeBR())
  useEffect(() => {
    const t = setInterval(() => setNow(formatTimeBR()), 1000)
    return () => clearInterval(t)
  }, [])
  return <span className={className}>{now}</span>
}
