import { FC, useState } from 'react'
import { useStore } from '@/store/bankStore'

interface AddTransactionProps {}

const AddTransaction: FC<AddTransactionProps> = () => {
  const addTransaction = useStore((state) => state.addTransaction)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount)) return

    // Hardcoding the admin user for now - this should come from auth context in the future
    addTransaction(numericAmount, description, 'Admin')
    
    // Reset form
    setAmount('')
    setDescription('')
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Add Transaction</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="number"
              name="amount"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-4 pr-12 sm:text-sm border-gray-300 rounded-md"
              placeholder="0"
              step="any"
              required
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Use positive numbers to add funds, negative to remove funds
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <div className="mt-1">
            <input
              type="text"
              name="description"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter transaction description"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add Transaction
        </button>
      </form>
    </div>
  )
}

export default AddTransaction 