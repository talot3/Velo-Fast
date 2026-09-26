import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/styles/globals.css"
import { initSupabase } from "@/lib/supabase"

import { App } from "./app"

initSupabase("gelic")
// O GELIC só tem tema escuro: controles nativos (data, número, lista) também.
document.documentElement.style.colorScheme = "dark"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
