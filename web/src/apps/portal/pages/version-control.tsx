import { useMemo, useState } from "react"
import { AwardIcon, CalendarIcon, CheckIcon, CirclePlusIcon, GitBranchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useStoreSettings } from "@/data/settings"
import { cn } from "@/lib/utils"

import { LoadError } from "../features/config/ui"
import { useEditor } from "../features/config/use-editor"
import { VersionDialog } from "../features/config/version-dialog"
import { formatVersionDate, seedVersion, sortVersionsDesc } from "../features/config/versions"

/** Sistema › Controle de Versão. */
export default function VersionControlPage() {
  const settings = useStoreSettings()
  const editor = useEditor<null>()
  const [seedDate] = useState(() => new Date())

  const stored = settings.data?.versions ?? []
  // Sem histórico gravado, mostra a versão inicial (como o sistema antigo).
  const versions = useMemo(() => (stored.length > 0 ? stored : [seedVersion(seedDate)]), [stored, seedDate])
  const sorted = useMemo(() => sortVersionsDesc(versions), [versions])
  const currentVersion = settings.data?.currentVersion ?? "1.0.0"

  return (
    <div className="mx-auto flex w-full max-w-[850px] flex-col gap-7 pt-2.5">
      {settings.isError ? <LoadError error={settings.error} /> : null}

      <Card className="flex-col gap-6 border-none bg-gradient-to-br from-brand-dark to-primary p-6 text-primary-foreground shadow-lg sm:flex-row sm:items-center sm:p-8">
        <div className="flex size-18 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <GitBranchIcon className="size-9" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[11px] font-extrabold tracking-widest uppercase opacity-80">Versão Atual Instalada</span>
          <h2 className="flex flex-wrap items-center gap-3 text-4xl leading-tight font-black">
            {settings.isPending ? <Skeleton className="h-9 w-32 bg-white/30" /> : `v${currentVersion}`}
            <Badge className="rounded-full bg-success px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-background uppercase">
              Ativa
            </Badge>
          </h2>
          <p className="text-[13px] font-medium opacity-90">Controle e gere novos marcos de versão do sistema VELO.</p>
        </div>
        <Button
          size="lg"
          className="bg-card font-extrabold text-primary shadow-md hover:bg-card/90"
          disabled={settings.isPending}
          onClick={() => editor.openEditor(null)}
        >
          <CirclePlusIcon data-icon="inline-start" />
          Gerar Nova Versão
        </Button>
      </Card>

      <Card className="gap-0 py-8">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b px-8 pb-4!">
          <CardTitle className="text-lg font-extrabold tracking-tight">Histórico de Atualizações (Changelog)</CardTitle>
          <span className="text-xs font-bold text-muted-foreground uppercase">{versions.length} marco(s) registrado(s)</span>
        </CardHeader>
        <CardContent className="px-8 pt-8">
          {settings.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="relative">
              <div aria-hidden className="absolute top-3 bottom-3 left-[19px] w-0.5 bg-input" />
              <ol className="relative flex flex-col gap-6">
              {sorted.map((v, index) => {
                const latest = index === 0
                return (
                  <li key={`${v.id}-${v.version}`} className="relative flex gap-5">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                        latest ? "bg-primary text-primary-foreground" : "bg-input text-muted-foreground"
                      )}
                    >
                      {latest ? <AwardIcon className="size-[18px]" /> : <CheckIcon className="size-[18px]" />}
                    </div>
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 flex-col gap-2 rounded-2xl p-5",
                        latest ? "border-2 border-primary bg-primary/5" : "border border-input"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-base font-extrabold">Versão {v.version}</h4>
                          {latest ? (
                            <Badge className="rounded-full bg-success/15 px-2 text-[10px] font-extrabold text-success uppercase">
                              Mais Recente
                            </Badge>
                          ) : null}
                        </div>
                        <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                          <CalendarIcon className="size-3.5" />
                          {formatVersionDate(v.date)}
                        </span>
                      </div>
                      <p className="mt-1 text-[13.5px] leading-relaxed font-medium whitespace-pre-wrap text-muted-foreground">
                        {v.description || "Nenhuma descrição fornecida."}
                      </p>
                    </div>
                  </li>
                )
              })}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      <VersionDialog
        key={editor.key}
        open={editor.open}
        onOpenChange={editor.setOpen}
        currentVersion={currentVersion}
        versions={versions}
      />
    </div>
  )
}
