export type FinancialAccount = {
  id: string;

  name: string;

  holder: string;

  currentBalance: number;

  totalFunding: number;

  totalExpenses: number;

  status: "active" | "closed";
};