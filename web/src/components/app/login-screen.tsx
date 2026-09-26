import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth"
import { errorMessage } from "@/lib/errors"

type LoginScreenProps = {
  title?: string
  subtitle?: string
}

/** Tela de login (antigo overlay "VELO FAST / Entre para continuar"). */
export function LoginScreen({ title = "VELO FAST", subtitle = "Entre para continuar" }: LoginScreenProps) {
  const { login, message } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(username.trim(), password)
    } catch (err) {
      setError(errorMessage(err, "Falha no login"))
    } finally {
      setBusy(false)
    }
  }

  const shown = error ?? message
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-xs">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="velofast-auth-user" className="sr-only">
                  Usuário
                </FieldLabel>
                <Input
                  id="velofast-auth-user"
                  placeholder="Usuário"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
              <Field data-invalid={Boolean(shown) || undefined}>
                <FieldLabel htmlFor="velofast-auth-pass" className="sr-only">
                  Senha
                </FieldLabel>
                <Input
                  id="velofast-auth-pass"
                  type="password"
                  placeholder="Senha"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(shown) || undefined}
                />
                {shown ? <FieldError>{shown}</FieldError> : null}
              </Field>
              <Button type="submit" className="w-full" disabled={busy || !username || !password}>
                {busy ? <Spinner data-icon="inline-start" /> : null}
                Entrar
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
