import { create } from "zustand";

import { financialAccounts } from "../data/financialAccounts";

type FinancialStore = {

  expenses: any[];

  funding: any[];

  ledger: any[];

  accounts: any[];

  addExpense: (expense: any) => void;

  addFunding: (funding: any) => void;

  updateAccounts: (
    accounts: any[]
  ) => void;

  addLedger: (
    entry: any
  ) => void;

};

export const useFinancialStore = create<FinancialStore>((set) => ({

  expenses: [],

  funding: [],

  ledger: [],

  accounts: financialAccounts,
    addExpense: (expense) =>
    set((state) => ({
      expenses: [...state.expenses, expense],
    })),

  addFunding: (funding) =>
    set((state) => ({
      funding: [...state.funding, funding],
    })),

  updateAccounts: (accounts) =>
    set({
      accounts,
    }),

  addLedger: (entry) =>
    set((state) => ({
      ledger: [...state.ledger, entry],
    })),

}));