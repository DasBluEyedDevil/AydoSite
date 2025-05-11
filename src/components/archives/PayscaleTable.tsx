import { FC, useState } from 'react'

interface PayscaleTableProps {}

interface PayScale {
  rank: string
  basePayPerHour: number
  subsidiaryBonus?: number
}

const generalPayScales: PayScale[] = [
  { rank: 'Board Member', basePayPerHour: 350000 },
  { rank: 'Director', basePayPerHour: 200000 },
  { rank: 'Manager', basePayPerHour: 150000 },
  { rank: 'Supervisor', basePayPerHour: 120000 },
  { rank: 'Senior Employee', basePayPerHour: 100000 },
  { rank: 'Employee', basePayPerHour: 80000 },
  { rank: 'Intern/Freelancer', basePayPerHour: 48000 },
]

const subsidiaryBonuses = [
  10000, 25000, 40000, 55000, 70000, 85000, 100000, 115000,
]

const PayscaleTable: FC<PayscaleTableProps> = () => {
  const [selectedTier, setSelectedTier] = useState<number | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Base Pay (per hour)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              With Subsidiary Bonus
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {generalPayScales.map((scale) => (
            <tr
              key={scale.rank}
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedTier(null)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {scale.rank}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {formatCurrency(scale.basePayPerHour)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {selectedTier !== null
                    ? formatCurrency(
                        scale.basePayPerHour + subsidiaryBonuses[selectedTier]
                      )
                    : '-'}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Subsidiary Bonus Tiers */}
      <div className="p-6 bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Subsidiary Bonus Tiers
        </h3>
        <div className="grid grid-cols-4 gap-4">
          {subsidiaryBonuses.map((bonus, index) => (
            <button
              key={index}
              className={`p-2 text-sm rounded-md transition-colors ${
                selectedTier === index
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setSelectedTier(index)}
            >
              Tier {index + 1}: {formatCurrency(bonus)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PayscaleTable 