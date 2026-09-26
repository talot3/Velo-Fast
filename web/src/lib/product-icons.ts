import {
  BeerIcon,
  CoffeeIcon,
  CookieIcon,
  CupSodaIcon,
  FlameIcon,
  GiftIcon,
  GlassWaterIcon,
  PackageIcon,
  PizzaIcon,
  ReceiptIcon,
  SandwichIcon,
  ShoppingCartIcon,
  SoupIcon,
  TagIcon,
  TicketIcon,
  UtensilsIcon,
  WineIcon,
  type LucideIcon,
} from "lucide-react"

/** Os 17 ícones de produto do sistema (mesmos nomes lucide do cadastro). */
export const PRODUCT_ICONS: Record<string, LucideIcon> = {
  beer: BeerIcon,
  "cup-soda": CupSodaIcon,
  coffee: CoffeeIcon,
  utensils: UtensilsIcon,
  pizza: PizzaIcon,
  sandwich: SandwichIcon,
  soup: SoupIcon,
  cookie: CookieIcon,
  wine: WineIcon,
  "glass-water": GlassWaterIcon,
  package: PackageIcon,
  tag: TagIcon,
  ticket: TicketIcon,
  "shopping-cart": ShoppingCartIcon,
  receipt: ReceiptIcon,
  gift: GiftIcon,
  flame: FlameIcon,
}

const ALIASES: Record<string, string> = {
  droplet: "glass-water",
  cake: "cookie",
  candy: "cookie",
  apple: "utensils",
  fish: "utensils",
  star: "tag",
  heart: "gift",
  zap: "flame",
}

export const PRODUCT_ICON_NAMES = Object.keys(PRODUCT_ICONS)

/** Ícone do produto (aliases antigos aceitos; desconhecido → package). */
export function productIcon(name: string | null | undefined): LucideIcon {
  if (!name) return PackageIcon
  return PRODUCT_ICONS[name] ?? PRODUCT_ICONS[ALIASES[name] ?? ""] ?? PackageIcon
}
