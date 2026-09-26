import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { addDays, daysUntil, formatBRL, formatCNPJ, parseMoneyBR, presetRange, sumMoney, todayBR } from "./format"

describe("datas no fuso de São Paulo", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test("hoje é a data de São Paulo, não a de UTC", () => {
    vi.setSystemTime(new Date("2026-09-27T02:30:00Z")) // 23:30 de 26/09 em SP
    expect(todayBR()).toBe("2026-09-26")
  })

  test("daysUntil conta dias de calendário a partir de hoje", () => {
    vi.setSystemTime(new Date("2026-09-26T15:00:00Z"))
    expect(daysUntil("2026-09-26")).toBe(0)
    expect(daysUntil("2026-09-27")).toBe(1)
    expect(daysUntil("2026-09-25")).toBe(-1)
    expect(daysUntil("2026-10-26")).toBe(30)
    expect(daysUntil("2027-09-26")).toBe(365)
    expect(daysUntil("2026-09-26T23:59:59-03:00")).toBe(0)
  })

  test("addDays atravessa meses e anos", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
  })

  test("atalhos de período", () => {
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"))
    expect(presetRange("hoje")).toEqual({ from: "2026-01-15", to: "2026-01-15" })
    expect(presetRange("ontem")).toEqual({ from: "2026-01-14", to: "2026-01-14" })
    expect(presetRange("ultimoMes")).toEqual({ from: "2025-12-01", to: "2025-12-31" })
    expect(presetRange("esteMes")).toEqual({ from: "2026-01-01", to: "2026-01-15" })
    expect(presetRange("ultimoAno")).toEqual({ from: "2025-01-01", to: "2025-12-31" })
    vi.setSystemTime(new Date("2028-03-10T12:00:00Z"))
    expect(presetRange("ultimoMes")).toEqual({ from: "2028-02-01", to: "2028-02-29" })
  })
})

describe("dinheiro", () => {
  test("parseMoneyBR lê o padrão brasileiro e o internacional", () => {
    expect(parseMoneyBR("150,50")).toBe(150.5)
    expect(parseMoneyBR("1.234,56")).toBe(1234.56)
    expect(parseMoneyBR("150.50")).toBe(150.5)
    expect(parseMoneyBR("1,234.56")).toBe(1234.56)
    expect(parseMoneyBR("1.000.000")).toBe(1000000)
    expect(parseMoneyBR("R$ 9")).toBe(9)
    expect(parseMoneyBR(12.5)).toBe(12.5)
    expect(parseMoneyBR("")).toBeNaN()
    expect(parseMoneyBR("abc")).toBeNaN()
  })

  test("formatBRL e somas em centavos", () => {
    expect(formatBRL(1234.56).replace(/\s/g, " ")).toBe("R$ 1.234,56")
    expect(formatBRL(null).replace(/\s/g, " ")).toBe("R$ 0,00")
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
  })

  test("formatCNPJ", () => {
    expect(formatCNPJ("12345678000190")).toBe("12.345.678/0001-90")
    expect(formatCNPJ("123")).toBe("123")
  })
})
