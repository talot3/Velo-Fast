import { createContext, useCallback, useContext, useRef, useState, type FormEvent, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { apiPost } from "@/lib/api"
import { errorMessage } from "@/lib/errors"
import { getStoreId } from "@/lib/store-context"
import { createEphemeralClient, type Supabase } from "@/lib/supabase"

export type Elevation = {
  client: Supabase
  username: string
  /** Encerra a sessão temporária do supervisor. */
  release: () => Promise<void>
}

type Pending = { resolve: (value: Elevation | null) => void }

const ElevateContext = createContext<(() => Promise<Elevation | null>) | null>(null)

/**
 * "Autorização necessária": um supervisor ou admin digita usuário e senha no
 * próprio caixa. A sessão dele vale só para a ação autorizada.
 */
export function ElevateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const pending = useRef<Pending | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const request = useCallback(() => {
    setUsername("")
    setPassword("")
    setError(null)
    setOpen(true)
    return new Promise<Elevation | null>((resolve) => {
      pending.current = { resolve }
    })
  }, [])

  const finish = (value: Elevation | null) => {
    pending.current?.resolve(value)
    pending.current = null
    setOpen(false)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await apiPost<{ session: { access_token: string; refresh_token: string }; user: { username: string } }>(
        "auth/login",
        { storeId: getStoreId(), username: username.trim(), password, scope: "elevate" }
      )
      const client = createEphemeralClient()
      const { error: sessionError } = await client.auth.setSession(result.session)
      if (sessionError) throw sessionError
      finish({
        client,
        username: result.user.username,
        release: async () => {
          await client.auth.signOut({ scope: "local" }).catch(() => undefined)
        },
      })
    } catch (err) {
      setError(errorMessage(err, "Usuário sem permissão suficiente."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ElevateContext.Provider value={request}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !o && finish(null)}>
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>Autorização necessária</DialogTitle>
              <DialogDescription>Peça a um supervisor ou admin para autorizar esta ação.</DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <Field>
                <FieldLabel htmlFor="velofast-elevate-user">Usuário</FieldLabel>
                <Input id="velofast-elevate-user" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
              </Field>
              <Field data-invalid={Boolean(error) || undefined}>
                <FieldLabel htmlFor="velofast-elevate-pass">Senha</FieldLabel>
                <Input
                  id="velofast-elevate-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(error) || undefined}
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => finish(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy || !username || !password}>
                {busy ? <Spinner data-icon="inline-start" /> : null}
                Autorizar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ElevateContext.Provider>
  )
}

export function useElevate() {
  const ctx = useContext(ElevateContext)
  if (!ctx) throw new Error("useElevate fora do ElevateProvider")
  return ctx
}
