import { FC } from 'react'
import BankBalance from '@/components/bank/BankBalance'
import TransactionHistory from '@/components/bank/TransactionHistory'
import AddTransaction from '@/components/bank/AddTransaction'

const CompanyBankPage: FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Company Bank</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Balance Card */}
        <div className="lg:col-span-1">
          <BankBalance />
        </div>

        {/* Transaction Form */}
        <div className="lg:col-span-2">
          <AddTransaction />
        </div>
      </div>

      {/* Transaction History */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Transaction History</h2>
        <TransactionHistory />
      </div>
    </div>
  )
}

export default CompanyBankPage 