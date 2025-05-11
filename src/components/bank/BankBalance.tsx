import { FC } from 'react'
import { useStore } from '@/store/bankStore'

interface BankBalanceProps {}

const BankBalance: FC<BankBalanceProps> = () => {
  const balance = useStore((state) => state.balance)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-2">Current Balance</h2>
      <div className="text-4xl font-bold text-blue-600">
        {formatCurrency(balance)}
      </div>
    </div>
  )
}

export default BankBalance 