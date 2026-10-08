export interface ExpenseDistribution {
  expenseId: string;

  projectId: number;

  villaCode: string;

  amount: number;
}

export const expenseDistributions: ExpenseDistribution[] = [];