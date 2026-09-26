import { useMemo } from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { AuthGate } from "@/components/app/auth-gate"
import { ConfirmProvider } from "@/components/app/confirm-dialog"
import { ElevateProvider } from "@/components/app/elevate-dialog"
import { EmptyState } from "@/components/app/empty-state"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/lib/auth"
import { createQueryClient } from "@/lib/query"

/** Caixa (PDV). Tela principal: ver apps/pdv/* (em migração). */
export function App() {
  const queryClient = useMemo(() => createQueryClient(), [])
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider minRole="operador">
        <ConfirmProvider>
          <ElevateProvider>
            <AuthGate>
              <EmptyState title="VELO FAST · PDV" description="Caixa em migração." />
            </AuthGate>
          </ElevateProvider>
        </ConfirmProvider>
      </AuthProvider>
      <Toaster theme="dark" position="bottom-center" />
    </QueryClientProvider>
  )
}
