import { describe, expect, it } from "vitest"

import { greetingFor, hourBR } from "./greeting"

// São Paulo = UTC−3 (sem horário de verão desde 2019).
const sp = (hhmm: string) => new Date(`2026-09-28T${hhmm}:00-03:00`)

describe("greetingFor", () => {
  it("usa a hora de São Paulo, não a do aparelho", () => {
    expect(hourBR(new Date("2026-09-28T02:30:00Z"))).toBe(23)
    expect(hourBR(sp("00:05"))).toBe(0)
  })

  it("troca a saudação às 12h e às 18h", () => {
    expect(greetingFor(sp("00:00"))).toBe("Bom dia")
    expect(greetingFor(sp("11:59"))).toBe("Bom dia")
    expect(greetingFor(sp("12:00"))).toBe("Boa tarde")
    expect(greetingFor(sp("17:59"))).toBe("Boa tarde")
    expect(greetingFor(sp("18:00"))).toBe("Boa noite")
    expect(greetingFor(sp("23:59"))).toBe("Boa noite")
  })
})
