import { useState } from "react"
import { toast } from "sonner"

import { useSaveGroups, useSaveProducts, useSaveSubgroups } from "@/data/catalog"
import type { Group, Printer, Product, Subgroup } from "@/data/types"
import { errorMessage } from "@/lib/errors"

import { extractRows, planImport, readSpreadsheet } from "./excel"

type Catalog = { products: Product[]; groups: Group[]; subgroups: Subgroup[]; printers: Printer[] }

/** Texto de várias linhas (as mensagens do antigo usavam \n). */
function lines(text: string) {
  return <span className="whitespace-pre-line">{text}</span>
}

const LONG = 10_000

/** "Importar Planilha": lê o arquivo, aplica as regras e grava grupos, subgrupos e produtos. */
export function useProductImport(catalog: Catalog | null) {
  const saveGroups = useSaveGroups()
  const saveSubgroups = useSaveSubgroups()
  const saveProducts = useSaveProducts()
  const [importing, setImporting] = useState(false)

  async function importFile(file: File) {
    if (!catalog) return
    setImporting(true)
    try {
      let sheet
      try {
        sheet = await readSpreadsheet(file)
      } catch (err) {
        console.warn("Erro ao importar planilha:", err)
        toast.error("Erro ao ler o arquivo.", {
          duration: LONG,
          description: lines(
            `Verifique se é um arquivo Excel válido (.xlsx, .xls ou .csv) e tente novamente.\n\nDetalhe: ${errorMessage(err, "formato não reconhecido.")}`
          ),
        })
        return
      }

      const { headerFound, rows } = extractRows(sheet)
      if (!headerFound) {
        toast.error("Erro: Planilha inválida!", {
          duration: LONG,
          description: lines(
            'Não foi possível encontrar os cabeçalhos obrigatórios (Nome, PrecoVenda).\n\nBaixe o modelo clicando em "Ver Modelo Excel" e preencha conforme as instruções.'
          ),
        })
        return
      }
      if (rows.length === 0) {
        toast.warning("Aviso: A planilha não contém produtos para importar.", {
          duration: LONG,
          description: "Preencha pelo menos uma linha abaixo do cabeçalho e tente novamente.",
        })
        return
      }

      const plan = planImport(rows, catalog)
      if (plan.erros.length > 0 && plan.novos === 0 && plan.atualizados === 0) {
        toast.error("Erro: Nenhum produto foi importado por erros:", {
          duration: LONG,
          description: lines(plan.erros.slice(0, 5).join("\n")),
        })
        return
      }

      // Grupos e subgrupos novos primeiro (os produtos apontam para eles).
      await saveGroups.mutateAsync(plan.newGroups)
      await saveSubgroups.mutateAsync(plan.newSubgroups)
      await saveProducts.mutateAsync(plan.products)

      let msg = `${plan.novos} novo(s) produto(s) adicionado(s)\n${plan.atualizados} produto(s) atualizado(s)`
      if (plan.erros.length > 0) msg += `\nLinhas ignoradas por erro: ${plan.erros.length}`
      toast.success("Importação concluída com sucesso!", { duration: LONG, description: lines(msg) })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setImporting(false)
    }
  }

  return { importFile, importing }
}
