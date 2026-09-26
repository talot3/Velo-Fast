import type { ComponentProps } from "react"

import { NativeSelect } from "@/components/ui/native-select"
import { cn } from "@/lib/utils"

/** NativeSelect ocupando toda a largura disponível (o componente base é "w-fit"). */
export function FullNativeSelect({ className, wrapperClassName, ...props }: ComponentProps<typeof NativeSelect> & { wrapperClassName?: string }) {
  return (
    <div className={cn("w-full min-w-0 [&>[data-slot=native-select-wrapper]]:w-full", wrapperClassName)}>
      <NativeSelect className={cn("w-full", className)} {...props} />
    </div>
  )
}
