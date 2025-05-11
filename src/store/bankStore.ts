import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Transaction {
  id: string
  amount: number
  description: string
  date: Date
  createdBy: string
}

interface BankState {
  balance: number
  transactions: Transaction[]
  addTransaction: (amount: number, description: string, createdBy: string) => void
}

export const useStore = create<BankState>()(
  persist(
    (set) => ({
      balance: 0,
      transactions: [],
      addTransaction: (amount, description, createdBy) => {
        const newTransaction: Transaction = {
          id: crypto.randomUUID(),
          amount,
          description,
          date: new Date(),
          createdBy,
        }

        set((state) => ({
          balance: state.balance + amount,
          transactions: [newTransaction, ...state.transactions],
        }))
      },
    }),
    {
      name: 'bank-storage',
    }
  )
) 