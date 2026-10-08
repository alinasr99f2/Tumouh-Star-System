export type AccountType =
  | "عهدة موظف"
  | "حساب شركة"
  | "صندوق"
  | "حساب بنكي";

export type FinancialAccount = {
  id: number;

  name: string;

  type: AccountType;

  openingBalance: number;

  currentBalance: number;

  totalFunding: number;

  totalExpenses: number;

  notes?: string;

  active: boolean;

  createdAt: string;
};