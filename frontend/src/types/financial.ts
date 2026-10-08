export interface Account {

  id: number;

  code: string;

  name: string;

  type:
    | "asset"
    | "liability"
    | "equity"
    | "revenue"
    | "expense";

  currentBalance: number;

  active: boolean;

}

export interface Category {

  id: number;

  code: string;

  name: string;

  icon?: string;

  color?: string;

  accountId: number;

  parentId?: number | null;

  active: boolean;

}

export interface Expense {

  id: number;

  date: string;

  invoiceNo: string;

  projectId?: number;

  accountId: number;

  categoryId: number;

  supplier: string;

  description: string;

  amount: number;

  vat: number;

  total: number;

  paymentMethod: string;

}

export interface Funding {

  id: number;

  date: string;

  accountId: number;

  amount: number;

  note: string;

}

export interface LedgerEntry {

  id: number;

  date: string;

  type: "expense" | "funding";

  accountId: number;

  debit: number;

  credit: number;

  referenceId: number;

  note: string;

}