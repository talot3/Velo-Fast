import type { ComponentType, ReactNode } from "react"
import { InboxIcon } from "lucide-react"

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

/** Estado vazio padrão ("Nenhum ... cadastrado ainda"). */
export function EmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
  action,
}: {
  title: string
  description?: ReactNode
  icon?: ComponentType
  action?: ReactNode
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}
