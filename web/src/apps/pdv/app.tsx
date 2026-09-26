import { AuthGate } from "@/components/app/auth-gate"
import { ConfirmProvider } from "@/components/app/confirm-dialog"
import { ElevateProvider } from "@/components/app/elevate-dialog"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/lib/auth"

import "./pdv.css"
import { PdvApp } from "./pdv-app"

/**
 * Caixa (PDV). Não usa o cache de dados do portal (TanStack Query): o PDV
 * fala com o banco por funções diretas (data/pdv.ts) e tem cache próprio
 * para funcionar offline — assim não baixa essa biblioteca.
 */
export function App() {
  return (
    <>
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
    </>
  )
}
