import { useEffect, useState } from 'react'
import { getSummary } from '../../api/pieces'
import { getSpotPrices, refreshSpotPrices } from '../../api/spot-prices'
import { useCurrency } from '../../context/CurrencyContext'
import type { Summary, SpotPrice } from '../../types/piece'

function formatOz(n: number) {
  return `${n.toFixed(4).replace(/\.?0+$/, '')} oz`
}

export default function Dashboard() {
  const { formatMoney, formatUserMoney } = useCurrency()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [spotPrices, setSpotPrices] = useState<SpotPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getSummary(), getSpotPrices()])
      .then(([s, sp]) => { setSummary(s); setSpotPrices(sp) })
      .catch(() => {/* ignore */})
      .finally(() => setLoading(false))
  }, [])

  async function handleRefreshPrices() {
    setRefreshing(true)
    setRefreshError(null)
    try {
      const updated = await refreshSpotPrices()
      setSpotPrices(updated)
      const s = await getSummary()
      setSummary(s)
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Failed to refresh')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) return <div className="text-gray-500 text-center py-16">Loading...</div>
  if (!summary) return <div className="text-red-400 text-center py-16">Failed to load dashboard</div>

  const gainLossPositive = summary.gain_loss >= 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-yellow-400">Dashboard</h1>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Pieces', value: summary.total_pieces.toString() },
          { label: 'Total Cost', value: formatUserMoney(summary.total_purchase_cost) },
          { label: 'Total Melt Value', value: formatMoney(summary.total_melt_value), highlight: true },
          {
            label: 'Gain / Loss',
            value: `${gainLossPositive ? '+' : ''}${formatUserMoney(summary.gain_loss)}`,
            positive: gainLossPositive,
          },
        ].map(({ label, value, highlight, positive }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-500 text-sm mb-1">{label}</p>
            <p className={`text-2xl font-bold ${
              highlight ? 'text-yellow-400' :
              positive !== undefined ? (positive ? 'text-green-400' : 'text-red-400') :
              'text-gray-100'
            }`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm mb-1">Graded</p>
          <p className="text-xl font-bold text-blue-400">{summary.graded_count}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm mb-1">Raw</p>
          <p className="text-xl font-bold text-gray-200">{summary.raw_count}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-gray-500 text-sm mb-1">Est. Value</p>
          <p className="text-xl font-bold text-gray-100">{formatUserMoney(summary.total_estimated_value)}</p>
        </div>
      </div>

      {/* Breakdown by metal */}
      {summary.by_metal.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-gray-200">Breakdown by Metal</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-left border-b border-gray-800">
                  <th className="px-6 py-3">Metal</th>
                  <th className="px-6 py-3">Count</th>
                  <th className="px-6 py-3">Total Weight</th>
                  <th className="px-6 py-3">Pure Oz</th>
                  <th className="px-6 py-3">Spot Price</th>
                  <th className="px-6 py-3">Melt Value</th>
                  <th className="px-6 py-3">Cost</th>
                  <th className="px-6 py-3">Est. Value</th>
                </tr>
              </thead>
              <tbody>
                {summary.by_metal.map(m => (
                  <tr key={m.metal_type} className="border-b border-gray-800/50">
                    <td className="px-6 py-3 font-medium text-gray-100 capitalize">{m.metal_type}</td>
                    <td className="px-6 py-3 text-gray-300">{m.count}</td>
                    <td className="px-6 py-3 text-gray-300">{formatOz(m.total_weight_oz)}</td>
                    <td className="px-6 py-3 text-gray-300">{formatOz(m.total_pure_oz)}</td>
                    <td className="px-6 py-3 text-gray-400">{formatMoney(m.spot_price)}/oz</td>
                    <td className="px-6 py-3 text-yellow-400 font-medium">{formatMoney(m.total_melt_value)}</td>
                    <td className="px-6 py-3 text-gray-400">{formatUserMoney(m.total_purchase_cost)}</td>
                    <td className="px-6 py-3 text-gray-200">{formatUserMoney(m.total_estimated_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Spot Prices */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">Spot Prices</h2>
          <button
            onClick={handleRefreshPrices}
            disabled={refreshing}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm px-4 py-1.5 rounded"
          >
            {refreshing ? 'Refreshing...' : '⟳ Refresh from API'}
          </button>
        </div>
        {refreshError && (
          <p className="text-red-400 text-sm mb-3">{refreshError}</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {spotPrices.map(sp => (
            <div key={sp.metal_type} className="bg-gray-800 rounded p-3">
              <p className="text-gray-500 text-xs capitalize mb-1">{sp.metal_type}</p>
              <p className="text-gray-100 font-semibold">{formatMoney(sp.price_per_oz)}/oz</p>
              <p className="text-gray-600 text-xs mt-1">
                {sp.source === 'api' ? '🌐 API' : '✏️ Manual'} ·{' '}
                {new Date(sp.updated_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {summary.total_pieces === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg mb-2">No pieces yet</p>
          <a href="/pieces/new" className="text-yellow-400 hover:text-yellow-300">Add your first piece →</a>
        </div>
      )}
    </div>
  )
}
