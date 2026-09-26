import { useMemo } from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { AuthGate } from "@/components/app/auth-gate"
import { ConfirmProvider } from "@/components/app/confirm-dialog"
import { ElevateProvider } from "@/components/app/elevate-dialog"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/lib/auth"
import { createQueryClient } from "@/lib/query"

import "./pdv.css"
import { PdvApp } from "./pdv-app"

/** Caixa (PDV). */
export function App() {
  const queryClient = useMemo(() => createQueryClient(), [])
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider minRole="operador">
        <ConfirmProvider>
          <ElevateProvider>
            <AuthGate>
              <PdvApp />
            </AuthGate>
          </ElevateProvider>
        </ConfirmProvider>
      </AuthProvider>
      <Toaster
        theme="dark"
        position="bottom-center"
        offset={{ bottom: 110 }}
        mobileOffset={{ bottom: 110, left: 16, right: 16 }}
        toastOptions={{
          classNames: { toast: "justify-center! rounded-[30px]! px-6! text-center! font-sans!", title: "text-sm! font-bold!" },
        }}
      />
    </QueryClientProvider>
  )
}
