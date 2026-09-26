import { ConstructionIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"

import { PAGE_TITLES, type PageId } from "./nav"

/** Marcador temporário de página ainda não migrada. */
export function MigrationPlaceholder({ page }: { page: PageId }) {
  return <EmptyState icon={ConstructionIcon} title={PAGE_TITLES[page]} description="Página em migração para o novo portal." />
}
