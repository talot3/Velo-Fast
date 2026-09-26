import { memo, useMemo, type CSSProperties, type MouseEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { Product, Subgroup } from "@/data/types"
import { formatBRL } from "@/lib/format"
import { productIcon } from "@/lib/product-icons"
import { cn } from "@/lib/utils"

type ProductPanelProps = {
  products: Product[] | null
  subgroups: Subgroup[]
  activeSubgroup: string | null
  search: string
  onSubgroup: (id: string | null) => void
  onClearSearch: () => void
  onProduct: (product: Product, card: HTMLElement) => void
}

const tabBase =
  "h-auto min-h-0 shrink-0 rounded-[30px] border-[1.5px] border-input bg-background px-[18px] py-2 text-[13px] font-bold whitespace-nowrap text-muted-foreground shadow-none hover:bg-secondary max-md:min-h-[46px] max-md:snap-start max-md:px-4 max-md:py-[9px] max-md:text-[12.5px]"

/** Coluna direita: abas de subgrupo + grade de produtos. */
export function ProductPanel(props: ProductPanelProps) {
  const { products, subgroups, activeSubgroup, search } = props
  const filtered = useMemo(() => {
    if (!products) return null
    let list = products
    if (activeSubgroup) list = list.filter((p) => p.subgroupId === activeSubgroup)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    return list
  }, [products, activeSubgroup, search])

  const noCatalog = products !== null && !products.length && !subgroups.length

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div
        role="tablist"
        aria-label="Subgrupos"
        className="pdv-no-scrollbar flex shrink-0 gap-2.5 overflow-x-auto border-b-[1.5px] border-border bg-card px-5 py-4 max-md:snap-x max-md:snap-mandatory max-md:gap-1.5 max-md:p-2.5"
      >
        {noCatalog ? null : (
          <>
            <Button
              type="button"
              role="tab"
              variant="secondary"
              aria-selected={activeSubgroup === null}
              className={cn(
                tabBase,
                activeSubgroup === null
                  ? "border-(--pdv-tab-all) bg-(--pdv-tab-all) font-extrabold text-(--pdv-tab-all-foreground) hover:bg-(--pdv-tab-all)"
                  : "text-foreground"
              )}
              onClick={() => props.onSubgroup(null)}
            >
              Todos
            </Button>
            {subgroups.map((sg) => {
              const active = activeSubgroup === sg.id
              const color = sg.buttonColor || "var(--primary)"
              const style: CSSProperties = active ? { background: color, color: sg.textColor || "#ffffff", borderColor: color } : { color }
              return (
                <Button
                  key={sg.id}
                  type="button"
                  role="tab"
                  variant="secondary"
                  aria-selected={active}
                  className={cn(tabBase, active && "font-extrabold")}
                  style={style}
                  onClick={() => props.onSubgroup(sg.id)}
                >
                  {sg.name}
                </Button>
              )
            })}
          </>
        )}
      </div>

      <div
        className="pdv-scroll grid flex-1 touch-pan-y auto-rows-min grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start gap-4 overflow-y-auto p-5 max-md:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] max-md:gap-2.5 max-md:p-3"
        data-testid="product-grid"
      >
        {filtered === null ? (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-[132px] rounded-2xl border-[1.5px] border-border bg-card" />)
        ) : noCatalog ? (
          <GridEmpty
            emoji="📦"
            title="Nenhum produto cadastrado ainda"
            hint="Cadastre produtos no Portal (Catálogo de Itens) para eles aparecerem aqui."
          />
        ) : !filtered.length ? (
          <GridEmpty
            emoji="🔍"
            title="Nenhum produto encontrado"
            hint={search ? `Sem resultados para "${search}".` : "Tente outro grupo ou termo de busca."}
            action={
              search ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-2.5 h-auto border-[1.5px] border-primary bg-secondary px-[18px] py-2 text-[13px] font-extrabold text-primary hover:bg-primary/10"
                  onClick={props.onClearSearch}
                >
                  Limpar busca
                </Button>
              ) : null
            }
          />
        ) : (
          filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              subgroup={subgroups.find((s) => s.id === p.subgroupId) ?? null}
              onProduct={props.onProduct}
            />
          ))
        )}
      </div>
    </div>
  )
}

function GridEmpty({ emoji, title, hint, action }: { emoji: string; title: string; hint: string; action?: React.ReactNode }) {
  return (
    <Empty className="col-span-full px-6 py-14">
      <EmptyHeader>
        <EmptyMedia className="mb-1.5 text-4xl opacity-70">{emoji}</EmptyMedia>
        <EmptyTitle className="text-[15px] font-extrabold">{title}</EmptyTitle>
        <EmptyDescription className="max-w-[320px] text-[13px]">{hint}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}

const noFocus = (e: MouseEvent) => e.preventDefault()

const ProductCard = memo(function ProductCard({
  product: p,
  subgroup,
  onProduct,
}: {
  product: Product
  subgroup: Subgroup | null
  onProduct: (product: Product, card: HTMLElement) => void
}) {
  const Icon = productIcon(p.icon)
  const controlled = p.stock !== null
  const outOfStock = controlled && p.stock! <= 0
  const low = controlled && !outOfStock && p.stock! <= 5
  return (
    <Button
      type="button"
      variant="secondary"
      aria-disabled={outOfStock || undefined}
      data-testid={`product-${p.id}`}
      onMouseDown={noFocus}
      onClick={(e) => onProduct(p, e.currentTarget)}
      style={subgroup?.buttonColor ? { borderLeft: `4px solid ${subgroup.buttonColor}` } : undefined}
      className={cn(
        "group relative h-auto min-h-[46px] flex-col gap-3 rounded-2xl border-[1.5px] border-border bg-card px-3.5 py-5 text-center whitespace-normal shadow-[0_2px_6px_rgba(0,0,0,0.25),0_6px_16px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:border-input hover:bg-card hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)] max-md:gap-2 max-md:px-2.5 max-md:py-3.5",
        outOfStock &&
          "cursor-not-allowed opacity-55 hover:translate-y-0 hover:shadow-[0_2px_6px_rgba(0,0,0,0.25),0_6px_16px_rgba(0,0,0,0.2)]"
      )}
    >
      {outOfStock ? (
        <Badge
          variant="outline"
          className="absolute top-2 right-2 border-destructive/35 bg-destructive/12 px-[7px] text-[10px] font-extrabold text-destructive"
        >
          Sem estoque
        </Badge>
      ) : low ? (
        <Badge
          variant="outline"
          className="absolute top-2 right-2 border-primary/35 bg-primary/15 px-[7px] text-[10px] font-extrabold text-primary"
        >
          Últ. {p.stock}
        </Badge>
      ) : null}
      <span className="flex size-[54px] items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary transition-colors group-hover:border-primary/15 group-hover:bg-primary/8 max-md:size-11 max-md:rounded-[10px]">
        <Icon className="size-[26px] stroke-[1.8] max-md:size-[22px]" />
      </span>
      <span className="text-[13.5px] leading-[1.3] font-extrabold text-foreground max-md:text-xs">{p.name}</span>
      <span className="text-[17px] font-black text-primary max-md:text-[13.5px]">{formatBRL(p.price)}</span>
    </Button>
  )
})
