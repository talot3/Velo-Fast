import { useState } from "react"
import { toast } from "sonner"

import { usePrintTest } from "@/data/catalog"
import { errorMessage, isNetworkError } from "@/lib/errors"

/**
 * "Testar": coloca uma ficha de teste na fila da ponte de impressão local,
 * usando a configuração GRAVADA da impressora (como no sistema antigo).
 */
export function usePrinterTest() {
  const test = usePrintTest()
  const [testingId, setTestingId] = useState<string | null>(null)

  async function run(printerId: string) {
    setTestingId(printerId)
    try {
      const result = await test.mutateAsync(printerId)
      toast.success(`Ficha de teste enviada com sucesso para: ${result?.printer_name || "Impressora"}`, {
        description: "Verifique se o papel saiu corretamente.",
      })
    } catch (e) {
      if (isNetworkError(e)) {
        toast.error(`Erro de conexão: ${errorMessage(e)}`, { description: "Verifique se o servidor está rodando." })
      } else {
        toast.error(`Falha no teste: ${errorMessage(e, "Erro desconhecido.")}`, {
          description: "Verifique IP, porta e configurações da impressora.",
        })
      }
    } finally {
      setTestingId(null)
    }
  }

  return { run, testingId }
}
