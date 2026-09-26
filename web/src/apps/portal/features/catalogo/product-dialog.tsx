import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { CrudDialog } from "@/components/app/crud-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { newId, useSaveProducts } from "@/data/catalog"
import type { Group, PricingData, Printer, Product, Subgroup } from "@/data/types"
import { errorMessage } from "@/lib/errors"
import { formatDateBR, todayBR } from "@/lib/format"
import { cn } from "@/lib/utils"

import { IconPicker } from "./icon-picker"
import { intOrZero, moneyInput, moneyOrZero, numberInput, sortGroups } from "./lib"
import { initialPricing } from "./pricing/calc"
import { PricingModule } from "./pricing/pricing-module"

type ProductDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = "Novo Produto". */
  product: Product | null
  groups: Group[]
  subgroups: Subgroup[]
  printers: Printer[]
}

type ProductForm = {
  code: string
  name: string
  order: string
  cost: string
  price: string
  controlStock: boolean
  stock: string
  groupId: string
  subgroupId: string
  printerId: string
  useNameOnPrint: boolean
  description: string
  icon: string
}

function initialForm(product: Product | null, subgroups: Subgroup[], printers: Printer[]): ProductForm {
  const subgroup = product?.subgroupId ? subgroups.find((s) => s.id === product.subgroupId) : undefined
  // Como no antigo: sem impressora válida, o seletor mostra a primeira da lista.
  const printerId =
    product?.printerId && printers.some((p) => p.id === product.printerId) ? product.printerId : (printers[0]?.id ?? "")
  return {
    code: product?.code ?? "",
    name: product?.name ?? "",
    order: String(product?.order || 0),
    cost: moneyInput(product?.cost),
    price: moneyInput(product?.price),
    controlStock: product ? product.stock !== null : false,
    stock: product && product.stock !== null ? numberInput(product.stock) : "",
    groupId: subgroup?.groupId ?? "",
    subgroupId: subgroup ? subgroup.id : "",
    printerId,
    useNameOnPrint: product ? product.useNameOnPrint !== false : true,
    description: product?.description ?? "",
    icon: product?.icon || "package",
  }
}

const NEW_PRODUCT: Omit<Product, "id"> = {
  code: "",
  name: "",
  order: 0,
  cost: 0,
  price: 0,
  stock: null,
  subgroupId: null,
  printerId: null,
  useNameOnPrint: true,
  description: "",
  icon: "package",
  unit: "UNID",
  active: true,
  pricing: null,
}

/** Id curto no topo do cadastro (ids novos são UUID). */
function displayId(id: string) {
  return id.length > 12 ? id.slice(0, 8) : id
}

/** Cadastro de produto (antigo #product-modal "Novo Produto" / "Editar Produto"). */
export function ProductDialog({ open, onOpenChange, product, groups, subgroups, printers }: ProductDialogProps) {
  const save = useSaveProducts()
  const [form, setForm] = useState<ProductForm>(() => initialForm(product, subgroups, printers))
  const [invalid, setInvalid] = useState<{ name?: boolean; subgroup?: boolean }>({})
  const [pricing, setPricing] = useState<PricingData>(() => initialPricing(product))
  const [pricingChanged, setPricingChanged] = useState(false)
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const sortedGroups = useMemo(() => sortGroups(groups), [groups])
  const groupSubgroups = useMemo(
    () => (form.groupId ? subgroups.filter((s) => s.groupId === form.groupId) : []),
    [form.groupId, subgroups]
  )

  const set = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  function applyFromPricing(price: number, cost: number) {
    setForm((f) => ({ ...f, price: price.toFixed(2).replace(".", ","), cost: cost.toFixed(2).replace(".", ",") }))
    setFlash(true)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(false), 800)
  }

  async function handleSubmit() {
    const name = form.name.trim()
    if (!name) {
      setInvalid({ name: true })
      toast.error("Nome do produto é obrigatório.")
      return
    }
    const subgroupId = form.subgroupId && subgroups.some((s) => s.id === form.subgroupId) ? form.subgroupId : null
    if (!subgroupId) {
      setInvalid({ subgroup: true })
      toast.error("Selecione um subgrupo válido.")
      return
    }
    const base: Product = product ?? { id: newId(), ...NEW_PRODUCT }
    const next: Product = {
      ...base,
      code: form.code,
      name,
      order: intOrZero(form.order),
      cost: moneyOrZero(form.cost),
      price: moneyOrZero(form.price),
      stock: form.controlStock ? moneyOrZero(form.stock) : null,
      subgroupId,
      printerId: form.printerId || null,
      useNameOnPrint: form.useNameOnPrint,
      description: form.description,
      icon: form.icon || "package",
      // A ficha técnica só é gravada se o módulo de precificação foi alterado.
      pricing: pricingChanged ? pricing : base.pricing,
    }
    try {
      await save.mutateAsync(next)
      onOpenChange(false)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <CrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={product ? "Editar Produto" : "Novo Produto"}
      headerExtra={
        <div className="order-last">
          <IconPicker value={form.icon} onChange={(icon) => set("icon", icon)} />
        </div>
      }
      submitLabel="Gravar"
      onSubmit={handleSubmit}
      submitting={save.isPending}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed pb-3">
          <span className="text-sm font-extrabold text-muted-foreground" title={product?.id}>
            # {product ? displayId(product.id) : "NOVO"}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">Data: {formatDateBR(todayBR())}</span>
          <Field orientation="horizontal" className="w-auto gap-2">
            <FieldLabel htmlFor="frm-control-stock" className="text-xs font-extrabold">
              Controlar estoque?
            </FieldLabel>
            <Checkbox
              id="frm-control-stock"
              checked={form.controlStock}
              onCheckedChange={(v) => set("controlStock", v === true)}
            />
          </Field>
        </div>

        <FieldGroup className="gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="frm-code">Código</FieldLabel>
              <Input id="frm-code" value={form.code} onChange={(e) => set("code", e.target.value)} autoComplete="off" />
            </Field>
            <Field className="md:col-span-8" data-invalid={invalid.name || undefined}>
              <FieldLabel htmlFor="frm-name">Nome</FieldLabel>
              <Input
                id="frm-name"
                value={form.name}
                aria-invalid={invalid.name || undefined}
                onChange={(e) => {
                  set("name", e.target.value)
                  if (invalid.name) setInvalid({})
                }}
                autoComplete="off"
              />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="frm-order">Ordem</FieldLabel>
              <Input id="frm-order" type="number" value={form.order} onChange={(e) => set("order", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <Field className="md:col-span-4">
              <FieldLabel htmlFor="frm-cost">$ Última Compra (UNID)</FieldLabel>
              <InputGroup className={cn("transition-colors duration-300", flash && "bg-success/15")}>
                <InputGroupAddon className="font-semibold">R$</InputGroupAddon>
                <InputGroupInput
                  id="frm-cost"
                  inputMode="decimal"
                  autoComplete="off"
                  value={form.cost}
                  onChange={(e) => set("cost", e.target.value)}
                />
              </InputGroup>
            </Field>
            <Field className="md:col-span-4">
              <FieldLabel htmlFor="frm-price">$ Venda</FieldLabel>
              <InputGroup className={cn("transition-colors duration-300", flash && "bg-success/15")}>
                <InputGroupAddon className="font-semibold">R$</InputGroupAddon>
                <InputGroupInput
                  id="frm-price"
                  inputMode="decimal"
                  autoComplete="off"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </InputGroup>
            </Field>
            <Field className="md:col-span-4" data-disabled={!form.controlStock || undefined}>
              <FieldLabel htmlFor="frm-stock">Estoque</FieldLabel>
              <Input
                id="frm-stock"
                inputMode="decimal"
                autoComplete="off"
                disabled={!form.controlStock}
                value={form.stock}
                onChange={(e) => set("stock", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <Field className="md:col-span-4">
              <FieldLabel htmlFor="frm-group">Grupo</FieldLabel>
              <Select
                value={form.groupId}
                onValueChange={(groupId) => setForm((f) => ({ ...f, groupId, subgroupId: "" }))}
              >
                <SelectTrigger id="frm-group" className="w-full">
                  <SelectValue placeholder="Selecione o Grupo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sortedGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field className="md:col-span-4" data-invalid={invalid.subgroup || undefined}>
              <FieldLabel htmlFor="frm-subgroup">Subgrupo</FieldLabel>
              <Select
                value={form.subgroupId}
                onValueChange={(subgroupId) => {
                  set("subgroupId", subgroupId)
                  if (invalid.subgroup) setInvalid({})
                }}
              >
                <SelectTrigger id="frm-subgroup" className="w-full" aria-invalid={invalid.subgroup || undefined}>
                  <SelectValue placeholder="Selecione o Subgrupo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {groupSubgroups.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field className="md:col-span-4">
              <FieldLabel htmlFor="frm-printer">Local Impressão</FieldLabel>
              <Select value={form.printerId} onValueChange={(printerId) => set("printerId", printerId)}>
                <SelectTrigger id="frm-printer" className="w-full" disabled={printers.length === 0}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {printers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field orientation="horizontal">
            <Checkbox
              id="frm-usename"
              checked={form.useNameOnPrint}
              onCheckedChange={(v) => set("useNameOnPrint", v === true)}
            />
            <FieldLabel htmlFor="frm-usename" className="font-semibold">
              Usar nome do produto no impresso
            </FieldLabel>
          </Field>

          <Field>
            <FieldLabel htmlFor="frm-desc">Descrição</FieldLabel>
            <Textarea id="frm-desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </FieldGroup>

        <Separator />

        <PricingModule
          value={pricing}
          onChange={(next) => {
            setPricing(next)
            setPricingChanged(true)
          }}
          onApply={applyFromPricing}
        />
      </div>
    </CrudDialog>
  )
}
