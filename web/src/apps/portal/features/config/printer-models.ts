/** Modelos de impressora por marca (mesma lista do sistema antigo). */
export const PRINTER_MODELS: { brand: string; models: string[] }[] = [
  {
    brand: "Epson",
    models: ["Epson TM-T20", "Epson TM-T20X", "Epson TM-T20III", "Epson TM-T88V", "Epson TM-T88VI", "Epson TM-T88VII", "Epson TM-U220", "Epson TM-L90"],
  },
  { brand: "Elgin", models: ["Elgin i9", "Elgin i7", "Elgin i8", "Elgin RM-23"] },
  { brand: "Bematech", models: ["Bematech MP-4200 TH", "Bematech MP-2800 TH", "Bematech MP-100S TH", "Bematech MP-4000 TH"] },
  { brand: "Daruma", models: ["Daruma DR700", "Daruma DR600", "Daruma DR800"] },
  { brand: "Gertec", models: ["Gertec GT-825", "Gertec GS-100"] },
  { brand: "Sweda", models: ["Sweda SI-300S", "Sweda SI-150"] },
  { brand: "Tanca", models: ["Tanca TP-650", "Tanca TP-550", "Tanca TP-450"] },
  { brand: "Custom", models: ["Custom Q3X", "Custom VKP80II"] },
  { brand: "Star Micronics", models: ["Star TSP100", "Star TSP143", "Star TSP654II", "Star SP742"] },
  { brand: "Citizen", models: ["Citizen CT-S310II", "Citizen CT-S651", "Citizen CT-S801"] },
  { brand: "Outro", models: ["Genérico ESC/POS 80mm", "Genérico ESC/POS 58mm"] },
]

export const DEFAULT_PRINTER_MODEL = "Epson TM-T20"

export function isKnownPrinterModel(model: string | null | undefined): boolean {
  return Boolean(model) && PRINTER_MODELS.some((b) => b.models.includes(model as string))
}

/**
 * Nome da impressora do Windows: só letras (sem acento), números, espaço e
 * . _ - ( ) \ $ — a ponte nunca repassa isso a um shell (mesma regra do banco).
 */
export const WINDOWS_PRINTER_NAME = /^[A-Za-z0-9 ._()\\$-]{1,128}$/
