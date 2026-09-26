import { useState } from "react"
import { DatabaseIcon, DownloadIcon, InfoIcon, Trash2Icon } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useConfirm } from "@/components/app/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useProducts, useTerminals } from "@/data/catalog"
import { exportStoreData, useSalesCount } from "@/data/reports"
import { useStoreId } from "@/lib/auth"
import { errorMessage } from "@/lib/errors"
import { todayBR } from "@/lib/format"

import { clearLocalCaches } from "../features/config/local-cache"

function InfoRow({ label, value }: { label: string; value: number | string | undefined }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      {value === undefined ? <Skeleton className="h-4 w-8" /> : <span className="font-extrabold tabular-nums">{value}</span>}
    </li>
  )
}

/** Sistema › Backup de Dados. */
export default function BackupPage() {
  const storeId = useStoreId()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const products = useProducts()
  const terminals = useTerminals()
  const salesCount = useSalesCount()
  const [downloading, setDownloading] = useState(false)

  async function downloadBackup() {
    setDownloading(true)
    try {
      const data = await exportStoreData(storeId)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ticketpro_backup_${todayBR()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setDownloading(false)
    }
  }

  async function clearCache() {
    const ok = await confirm(
      "Deseja realmente limpar o cache de relatórios do seu navegador? Isso removerá as vendas salvas em cache local e forçará a recarga de dados limpos do servidor.",
      { destructive: true, confirmLabel: "Limpar" }
    )
    if (!ok) return
    clearLocalCaches(queryClient)
    window.location.reload()
  }

  const activeTerminals = terminals.data ? terminals.data.filter((t) => t.active).length : undefined

  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-6 pt-5">
      <Card className="flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-10">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-primary/15 text-primary">
          <DatabaseIcon className="size-10" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight">Backup do Banco de Dados</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Baixe uma cópia de segurança completa do seu sistema. Este arquivo contém todos os produtos, vendas, terminais e
            configurações.
          </p>
        </div>
        <Button size="lg" className="h-12 font-extrabold" disabled={downloading} onClick={() => void downloadBackup()}>
          {downloading ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
          Baixar Backup (.json)
        </Button>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-lg font-extrabold">
              <InfoIcon className="size-5 text-primary" />
              Informações do Banco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3 text-sm">
              <InfoRow label="Produtos Cadastrados:" value={products.isError ? "—" : products.data?.length} />
              <InfoRow label="Vendas Registradas:" value={salesCount.isError ? "—" : salesCount.data} />
              <InfoRow label="Terminais Ativos:" value={terminals.isError ? "—" : activeTerminals} />
            </ul>
          </CardContent>
        </Card>

        <Card className="justify-between border-dashed border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold text-primary">Limpar Cache local do Portal</CardTitle>
            <CardDescription className="leading-relaxed">
              Se você zerou as vendas no servidor, mas o portal ainda exibe dados antigos no dashboard por conta do cache do
              seu navegador, clique abaixo para limpar o cache local e forçar a atualização imediata das telas.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" className="w-full font-extrabold" onClick={() => void clearCache()}>
              <Trash2Icon data-icon="inline-start" />
              Limpar Cache e Zerar Relatórios
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
