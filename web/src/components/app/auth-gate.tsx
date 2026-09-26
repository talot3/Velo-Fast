import type { ReactNode } from "react"

import { LoginScreen } from "@/components/app/login-screen"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth"

/** Mostra o app só com sessão válida; senão, a tela de login. */
export function AuthGate({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  const { status } = useAuth()
  if (status === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    )
  }
  if (status === "signed-out") return <LoginScreen title={title} subtitle={subtitle} />
  return <>{children}</>
}
