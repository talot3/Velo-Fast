import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { DEFAULT_TICKET, useSaveStoreSettings, useStoreSettings } from "@/data/settings"
import type { TicketConfig } from "@/data/types"
import { errorMessage } from "@/lib/errors"

import { LoadError } from "../features/config/ui"

function TicketConfigForm({ initial }: { initial: TicketConfig }) {
  const save = useSaveStoreSettings()
  const [titleTicket, setTitleTicket] = useState(initial.titleTicket ?? DEFAULT_TICKET.titleTicket)
  const [titleFicha, setTitleFicha] = useState(initial.titleFicha ?? DEFAULT_TICKET.titleFicha)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    // Campos vazios voltam ao padrão (TICKET 1-A-1 / ficha).
    const ticketConfig = {
      titleTicket: titleTicket.trim() || DEFAULT_TICKET.titleTicket,
      titleFicha: titleFicha.trim() || DEFAULT_TICKET.titleFicha,
    }
    try {
      await save.mutateAsync({ ticketConfig })
      setTitleTicket(ticketConfig.titleTicket)
      setTitleFicha(ticketConfig.titleFicha)
      toast.success("Configurações salvas com sucesso!")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <CardContent>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="frm-cfg-ticket">Nome Principal do Impresso (Ex: TICKET 1-A-1)</FieldLabel>
              <Input id="frm-cfg-ticket" value={titleTicket} onChange={(e) => setTitleTicket(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="frm-cfg-ficha">Nome do Rodapé/Item (Ex: ficha, senha, etc)</FieldLabel>
              <Input id="frm-cfg-ficha" value={titleFicha} onChange={(e) => setTitleFicha(e.target.value)} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? <Spinner data-icon="inline-start" /> : null}
            Salvar Alterações
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

/** Gestão › Ajustes › Configuração do Ticket. */
export default function TicketConfigPage() {
  const settings = useStoreSettings()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configurações do Ticket" />
      {settings.isError ? <LoadError error={settings.error} /> : null}
      {settings.data ? (
        <TicketConfigForm initial={settings.data.ticketConfig} />
      ) : settings.isPending ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : null}
    </div>
  )
}
