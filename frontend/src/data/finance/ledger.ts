export type LedgerEntry = {

  id: string;

  date: string;

  accountId: string;

  type:
    | "expense"
    | "funding"
    | "cancel";

  referenceId: string;

  debit: number;

  credit: number;

  balanceAfter: number;

};