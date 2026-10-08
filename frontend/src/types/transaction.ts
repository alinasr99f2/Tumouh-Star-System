export type TransactionType =
  | "expense"
  | "funding";

export type Transaction = {
  id: number;

  type: TransactionType;

  date: string;

  projectId?: number;

  accountId: number;

  categoryId?: number;

  supplier: string;

  amount: number;

  tax: number;

  total: number;

  description: string;
};