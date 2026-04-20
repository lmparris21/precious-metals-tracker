import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { getCurrencySettings } from '../api/settings'

interface CurrencyContextValue {
  currency: string
  rate: number
  rateUpdatedAt: string
  symbol: string
  // For USD-based values (melt value, spot prices) — applies exchange rate
  formatMoney: (usdValue: number | undefined) => string
  // For user-entered values (purchase price, estimated value) — no conversion, just symbol
  formatUserMoney: (value: number | undefined) => string
  reload: () => void
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', GBP: '£', EUR: '€', CAD: 'CA$', AUD: 'A$',
  CHF: 'Fr.', JPY: '¥', NZD: 'NZ$', SGD: 'S$', HKD: 'HK$',
  ZAR: 'R', INR: '₹', SEK: 'kr', NOK: 'kr', DKK: 'kr',
}

const DEFAULT: CurrencyContextValue = {
  currency: 'USD',
  rate: 1,
  rateUpdatedAt: '',
  symbol: '$',
  formatMoney: (v) => v == null ? '—' : `$${v.toFixed(2)}`,
  formatUserMoney: (v) => v == null ? '—' : `$${v.toFixed(2)}`,
  reload: () => {},
}

const CurrencyContext = createContext<CurrencyContextValue>(DEFAULT)

function makeFmt(currency: string, symbol: string, rate: number, applyRate: boolean) {
  return (value: number | undefined) => {
    if (value == null) return '—'
    const converted = applyRate ? value * rate : value
    try {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted)
    } catch {
      return `${symbol}${converted.toFixed(2)}`
    }
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState('USD')
  const [rate, setRate] = useState(1)
  const [rateUpdatedAt, setRateUpdatedAt] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    getCurrencySettings()
      .then(s => {
        setCurrency(s.currency)
        setRate(s.exchange_rate)
        setRateUpdatedAt(s.rate_updated_at)
      })
      .catch(() => {})
  }, [tick])

  const reload = useCallback(() => setTick(t => t + 1), [])
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency

  return (
    <CurrencyContext.Provider value={{
      currency,
      rate,
      rateUpdatedAt,
      symbol,
      formatMoney: makeFmt(currency, symbol, rate, true),
      formatUserMoney: makeFmt(currency, symbol, rate, false),
      reload,
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
