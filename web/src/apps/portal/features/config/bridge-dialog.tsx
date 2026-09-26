import { useRef, useState, type FormEvent } from "react"
import { CheckIcon, CopyIcon, KeyRoundIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useCreatePrinterBridge } from "@/data/catalog"
import { useStoreId } from "@/lib/auth"
import { env } from "@/lib/env"
import { errorMessage } from "@/lib/errors"

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

/**
 * Conteúdo do arquivo .env da ponte local (bridge/velo-bridge.js): URL do
 * Supabase, a chave PUBLICÁVEL (a mesma que o navegador já usa) e a chave
 * da ponte. Nenhuma chave secreta/service role aparece aqui.
 */
function bridgeEnvText(bridgeKey: string): string {
  return [
    `VELO_SUPABASE_URL=${env.supabaseUrl ?? ""}`,
    `VELO_SUPABASE_KEY=${env.supabaseKey ?? ""}`,
    `VELO_BRIDGE_KEY=${bridgeKey}`,
  ].join("\n")
}

/** Copia texto; sem a API de área de transferência, usa a seleção do campo. */
async function copyText(text: string, fallback: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    if (!fallback) return false
    fallback.focus()
    fallback.select()
    try {
      return document.execCommand("copy")
    } catch {
      return false
    }
  }
}

/**
 * "Ponte de Impressão": gera a chave que o programa da ponte local usa para
 * buscar a fila de impressão da loja. A chave aparece uma única vez, já no
 * formato do arquivo .env da ponte.
 */
export function PrinterBridgeDialog({ open, onOpenChange }: Props) {
  const storeId = useStoreId()
  const create = useCreatePrinterBridge()
  const [name, setName] = useState("")
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const envRef = useRef<HTMLTextAreaElement>(null)

  const envText = apiKey ? bridgeEnvText(apiKey) : ""

  async function generate(e: FormEvent) {
    e.preventDefault()
    if (apiKey) return
    try {
      const result = await create.mutateAsync(name.trim())
      setApiKey(result.api_key)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function copy() {
    if (!envText) return
    if (await copyText(envText, envRef.current)) {
      setCopied(true)
      toast.success("Configuração da ponte copiada.")
    } else {
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={generate} className="flex min-w-0 flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Ponte de Impressão</DialogTitle>
            <DialogDescription>
              A ponte é o programa instalado em um computador da loja, na mesma rede das impressoras. Ela busca os impressos
              enviados pelo sistema (fichas, sangrias, fechamentos e testes) e imprime na hora.
            </DialogDescription>
          </DialogHeader>

          {apiKey ? (
            <FieldGroup className="gap-4">
              <Alert>
                <TriangleAlertIcon />
                <AlertTitle>A chave da ponte aparece uma única vez.</AlertTitle>
                <AlertDescription>Copie e guarde agora. Se perder, gere uma nova chave.</AlertDescription>
              </Alert>
              <Field>
                <FieldLabel htmlFor="bridge-env">Arquivo .env da ponte</FieldLabel>
                <InputGroup>
                  <InputGroupTextarea
                    ref={envRef}
                    id="bridge-env"
                    readOnly
                    rows={3}
                    wrap="off"
                    spellCheck={false}
                    value={envText}
                    className="min-h-0 font-mono text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <InputGroupAddon align="block-end" className="border-t">
                    <InputGroupText className="font-mono text-xs">.env</InputGroupText>
                    <InputGroupButton size="sm" variant="default" className="ml-auto" onClick={() => void copy()}>
                      {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
                      Copiar
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription>
                  No computador da loja, salve estas três linhas no arquivo <code className="font-mono">.env</code> da pasta
                  da ponte e rode <code className="font-mono">node velo-bridge.js</code>. Depois use “Testar” em uma
                  impressora para conferir.
                </FieldDescription>
              </Field>
            </FieldGroup>
          ) : (
            <FieldGroup className="gap-4">
              <ol className="ml-5 flex list-decimal flex-col gap-1 text-sm text-muted-foreground">
                <li>Gere a chave abaixo: ela aparece uma única vez, já no formato do arquivo .env.</li>
                <li>No computador da loja, salve o conteúdo no arquivo .env da pasta da ponte.</li>
                <li>Deixe a ponte rodando: os impressos passam a sair nas impressoras.</li>
              </ol>
              <Field>
                <FieldLabel htmlFor="bridge-name">Nome da Ponte</FieldLabel>
                <Input id="bridge-name" value={name} placeholder={`Ponte ${storeId}`} onChange={(e) => setName(e.target.value)} />
              </Field>
            </FieldGroup>
          )}

          <DialogFooter>
            {apiKey ? (
              <Button type="button" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? <Spinner data-icon="inline-start" /> : <KeyRoundIcon data-icon="inline-start" />}
                  Gerar Chave
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
