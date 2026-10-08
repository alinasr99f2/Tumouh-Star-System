import type { FinancialAccount } from "../types/financialAccount";

export const financialAccounts: FinancialAccount[] = [

  {
    id: 1,
    name: "محمد أحمد",
    type: "عهدة موظف",
    openingBalance: 120000,
    currentBalance: 120000,
    totalFunding: 120000,
    totalExpenses: 0,
    notes: "",
    active: true,
    createdAt: "2026-08-03",
  },

  {
    id: 2,
    name: "شركة طموح ستار",
    type: "حساب شركة",
    openingBalance: 950000,
    currentBalance: 950000,
    totalFunding: 950000,
    totalExpenses: 0,
    notes: "",
    active: true,
    createdAt: "2026-08-03",
  },

  {
    id: 3,
    name: "صندوق الموقع",
    type: "صندوق",
    openingBalance: 50000,
    currentBalance: 50000,
    totalFunding: 50000,
    totalExpenses: 0,
    notes: "",
    active: true,
    createdAt: "2026-08-03",
  },

];