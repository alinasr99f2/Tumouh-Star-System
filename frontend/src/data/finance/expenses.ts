export type Expense = {
  id: string;

  voucherNo: string;

  expenseDate: string;

  entryDate: string;

  accountId: string;

  projectId: string;

  categoryId: string;

  supplier: string;

  paymentMethod: string;

  amount: number;

  tax: number;

  total: number;

  status:
    | "new"
    | "approved"
    | "cancelled";
};