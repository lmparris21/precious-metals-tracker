import { useState, useEffect } from 'react'
import { getSpotPrices, setSpotPrice, refreshSpotPrices } from '../../api/spot-prices'
import { updateCurrencySettings, refreshExchangeRate } from '../../api/settings'
import { useCurrency } from '../../context/CurrencyContext'
import type { SpotPrice } from '../../types/piece'

const METAL_LABELS: Record<string, string> = {
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  palladium: 'Palladium',
}

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'HKD', label: 'HKD — Hong Kong Dollar' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'SEK', label: 'SEK — Swedish Krona' },
  { code: 'NOK', label: 'NOK — Norwegian Krone' },
  { code: 'DKK', label: 'DKK — Danish Krone' },
]

export default function Settings() {
  const { currency, rate, rateUpdatedAt, formatMoney, reload: reloadCurrency } = useCurrency()

  const [spotPrices, setSpotPricesState] = useState<SpotPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [refreshSuccess, setRefreshSuccess] = useState(false)
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({})
  const [savingMetal, setSavingMetal] = useState<string | null>(null)
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})

  // Currency settings state
  const [selectedCurrency, setSelectedCurrency] = useState(currency)
  const [manualRate, setManualRate] = useState(rate.toString())
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  const [currencySuccess, setCurrencySuccess] = useState(false)
  const [refreshingRate, setRefreshingRate] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const [rateSuccess, setRateSuccess] = useState(false)

  useEffect(() => {
    setSelectedCurrency(currency)
    setManualRate(rate.toString())
  }, [currency, rate])

  useEffect(() => {
    getSpotPrices()
      .then(prices => {
        setSpotPricesState(prices)
        const inputs: Record<string, string> = {}
        for (const p of prices) inputs[p.metal_type] = (p.price_per_oz * rate).toFixed(2)
        setManualInputs(inputs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [rate])

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshError(null)
    setRefreshSuccess(false)
    try {
      const updated = await refreshSpotPrices()
      setSpotPricesState(updated)
      const inputs: Record<string, string> = {}
      for (const p of updated) inputs[p.metal_type] = (p.price_per_oz * rate).toFixed(2)
      setManualInputs(inputs)
      setRefreshSuccess(true)
      setTimeout(() => setRefreshSuccess(false), 3000)
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Failed to refresh spot prices')
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSaveManual(metal: string) {
    const displayValue = parseFloat(manualInputs[metal] ?? '')
    if (isNaN(displayValue) || displayValue <= 0) {
      setSaveErrors(e => ({ ...e, [metal]: 'Enter a valid positive price' }))
      return
    }
    // Convert from display currency back to USD for storage
    const usdValue = displayValue / rate
    setSavingMetal(metal)
    setSaveErrors(e => ({ ...e, [metal]: '' }))
    try {
      const updated = await setSpotPrice(metal, usdValue)
      setSpotPricesState(prices => prices.map(p => p.metal_type === metal ? updated : p))
    } catch (err) {
      setSaveErrors(e => ({ ...e, [metal]: err instanceof Error ? err.message : 'Failed to save' }))
    } finally {
      setSavingMetal(null)
    }
  }

  async function handleSaveCurrency() {
    setSavingCurrency(true)
    setCurrencyError(null)
    setCurrencySuccess(false)
    try {
      await updateCurrencySettings({ currency: selectedCurrency })
      reloadCurrency()
      setCurrencySuccess(true)
      setTimeout(() => setCurrencySuccess(false), 3000)
    } catch (err) {
      setCurrencyError(err instanceof Error ? err.message : 'Failed to save currency')
    } finally {
      setSavingCurrency(false)
    }
  }

  async function handleSaveManualRate() {
    const r = parseFloat(manualRate)
    if (isNaN(r) || r <= 0) {
      setCurrencyError('Enter a valid positive exchange rate')
      return
    }
    setSavingCurrency(true)
    setCurrencyError(null)
    try {
      await updateCurrencySettings({ exchange_rate: r })
      reloadCurrency()
      setCurrencySuccess(true)
      setTimeout(() => setCurrencySuccess(false), 3000)
    } catch (err) {
      setCurrencyError(err instanceof Error ? err.message : 'Failed to save rate')
    } finally {
      setSavingCurrency(false)
    }
  }

  async function handleRefreshRate() {
    setRefreshingRate(true)
    setRateError(null)
    setRateSuccess(false)
    try {
      await refreshExchangeRate()
      reloadCurrency()
      setRateSuccess(true)
      setTimeout(() => setRateSuccess(false), 3000)
    } catch (err) {
      setRateError(err instanceof Error ? err.message : 'Failed to fetch exchange rate')
    } finally {
      setRefreshingRate(false)
    }
  }

  if (loading) return <div className="text-gray-500 text-center py-16">Loading...</div>

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-yellow-400">Settings</h1>

      {/* Currency Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Currency</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Spot prices and melt values are fetched in USD and converted for display. Purchase prices and estimated values are stored as entered.
          </p>
        </div>

        {currencySuccess && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-3 text-sm">
            Currency settings saved.
          </div>
        )}
        {currencyError && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded px-4 py-3 text-sm">
            {currencyError}
          </div>
        )}

        {/* Currency selector */}
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Display Currency</label>
          <div className="flex gap-2">
            <select
              value={selectedCurrency}
              onChange={e => setSelectedCurrency(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-yellow-500"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <button
              onClick={handleSaveCurrency}
              disabled={savingCurrency || selectedCurrency === currency}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-semibold text-sm px-4 py-2 rounded"
            >
              {savingCurrency ? 'Saving...' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Exchange rate */}
        {currency !== 'USD' && (
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Exchange Rate <span className="text-gray-600">(1 USD = ? {currency})</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                step="0.0001"
                min="0"
                value={manualRate}
                onChange={e => setManualRate(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-yellow-500"
              />
              <button
                onClick={handleSaveManualRate}
                disabled={savingCurrency}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 font-medium text-sm px-4 py-2 rounded"
              >
                Set
              </button>
              <button
                onClick={handleRefreshRate}
                disabled={refreshingRate}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm px-4 py-2 rounded"
              >
                {refreshingRate ? 'Fetching...' : '⟳ Auto'}
              </button>
            </div>
            {rateSuccess && (
              <p className="text-green-400 text-xs">Exchange rate updated from API.</p>
            )}
            {rateError && (
              <p className="text-red-400 text-xs">{rateError} — set rate manually above.</p>
            )}
            {rateUpdatedAt && (
              <p className="text-gray-600 text-xs">
                Rate: 1 USD = {rate.toFixed(4)} {currency} · Updated {new Date(rateUpdatedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Spot Prices Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-200">Spot Prices</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              Prices shown in {currency}. Manual overrides also accept {currency}.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm px-4 py-2 rounded font-medium"
          >
            {refreshing ? 'Fetching...' : '⟳ Fetch from API'}
          </button>
        </div>

        {refreshSuccess && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 rounded px-4 py-3 mb-4 text-sm">
            Spot prices updated from API successfully.
          </div>
        )}
        {refreshError && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded px-4 py-3 mb-4 text-sm">
            <p className="font-medium">Could not fetch from API</p>
            <p className="mt-0.5">{refreshError}</p>
            <p className="mt-1 text-red-400">You can still set prices manually below.</p>
          </div>
        )}

        <div className="space-y-4">
          {spotPrices.map(sp => (
            <div key={sp.metal_type} className="border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-100">{METAL_LABELS[sp.metal_type] ?? sp.metal_type}</p>
                  <p className="text-xs text-gray-500">
                    {sp.source === 'api' ? '🌐 Last from API' : '✏️ Manually set'} &middot;{' '}
                    Updated {new Date(sp.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-bold">{formatMoney(sp.price_per_oz)}/oz</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualInputs[sp.metal_type] ?? ''}
                  onChange={e => setManualInputs(m => ({ ...m, [sp.metal_type]: e.target.value }))}
                  placeholder={`Override price in ${currency}...`}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-500"
                />
                <button
                  onClick={() => handleSaveManual(sp.metal_type)}
                  disabled={savingMetal === sp.metal_type}
                  className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-semibold text-sm px-4 py-2 rounded"
                >
                  {savingMetal === sp.metal_type ? 'Saving...' : 'Set'}
                </button>
              </div>
              {saveErrors[sp.metal_type] && (
                <p className="text-red-400 text-xs mt-1">{saveErrors[sp.metal_type]}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* About section */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-200 mb-3">API Key Setup</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          To auto-fetch spot prices, set the <code className="bg-gray-800 px-1 py-0.5 rounded text-yellow-300">METALS_DEV_API_KEY</code> environment variable
          before starting the server. Get a free API key at{' '}
          <span className="text-gray-300">metals.dev</span>.
        </p>
        <div className="mt-3 bg-gray-800 rounded p-3 text-xs font-mono text-gray-400">
          METALS_DEV_API_KEY=your_key npm run dev
        </div>
        <p className="text-gray-500 text-sm mt-4">
          Exchange rates are fetched for free from <span className="text-gray-300">open.er-api.com</span> — no API key required.
        </p>
      </div>
    </div>
  )
}
