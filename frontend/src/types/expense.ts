export type Expense = {
  id: number;

  date: string;

  projectId: number;

  accountId: number;

  categoryId: number;

  supplier: string;

  description: string;

  amountBeforeTax: number;

  tax: number;

  total: number;

  paymentMethod:
    | "نقدي"
    | "تحويل"
    | "شيك";

  invoiceNumber?: string;

  attachment?: string;
};