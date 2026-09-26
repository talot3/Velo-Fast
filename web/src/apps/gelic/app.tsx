import { useMemo } from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { AuthGate } from "@/components/app/auth-gate"
import { ConfirmProvider } from "@/components/app/confirm-dialog"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/lib/auth"
import { createQueryClient } from "@/lib/query"

import { GelicShell } from "./shell"

/** Painel master de licenças (GELIC): lojas, licenças e acesso ao portal de cada loja. */
export function App() {
  const queryClient = useMemo(() => createQueryClient(), [])
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider minRole="master" scope="master">
        <ConfirmProvider>
          <AuthGate title="GELIC" subtitle="Gerenciamento de Licenças">
            <GelicShell />
          </AuthGate>
        </ConfirmProvider>
      </AuthProvider>
      <Toaster theme="dark" position="bottom-center" richColors />
    </QueryClientProvider>
  )
}
