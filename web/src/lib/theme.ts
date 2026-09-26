import { useCallback, useEffect, useState } from "react"

export type ThemeMode = "dark" | "light" | "system"

const THEME_KEY = "tp_theme_mode"

function systemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true
}

function readMode(): ThemeMode {
  const v = localStorage.getItem(THEME_KEY)
  return v === "light" || v === "system" || v === "dark" ? v : "dark"
}

export function applyThemeMode(mode: ThemeMode = readMode()) {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark())
  document.documentElement.classList.toggle("dark", dark)
  return dark
}

/** Tema do portal: claro/escuro (padrão escuro), lembrado em tp_theme_mode. */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(readMode)
  const [isDark, setIsDark] = useState(() => applyThemeMode(readMode()))

  useEffect(() => {
    setIsDark(applyThemeMode(mode))
    if (mode !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setIsDark(applyThemeMode("system"))
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [mode])

  const toggle = useCallback(() => {
    const next: ThemeMode = isDark ? "light" : "dark"
    localStorage.setItem(THEME_KEY, next)
    setMode(next)
  }, [isDark])

  return { mode, isDark, toggle }
}
