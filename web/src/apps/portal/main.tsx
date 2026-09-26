import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/styles/globals.css"
import { initSupabase } from "@/lib/supabase"
import { applyThemeMode } from "@/lib/theme"

import { App } from "./app"

initSupabase("portal")
applyThemeMode()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
