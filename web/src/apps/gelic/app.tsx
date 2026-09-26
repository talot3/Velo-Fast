import { useMemo } from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { AuthGate } from "@/components/app/auth-gate"
import { ConfirmProvider } from "@/components/app/confirm-dialog"
import { EmptyState } from "@/components/app/empty-state"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/lib/auth"
import { createQueryClient } from "@/lib/query"

/** Painel master de licenças (GELIC). Tela principal: em migração. */
export function App() {
  const queryClient = useMemo(() => createQueryClient(), [])
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider minRole="master" scope="master">
        <ConfirmProvider>
          <AuthGate title="GELIC" subtitle="Gerenciamento de Licenças">
            <EmptyState title="GELIC" description="Painel em migração." />
          </AuthGate>
        </ConfirmProvider>
      </AuthProvider>
      <Toaster theme="dark" position="bottom-center" />
    </QueryClientProvider>
  )
}
