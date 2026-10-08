export type LedgerEntry = {

  id: string;

  type: "expense" | "funding";

  accountId: number;

  projectId: number;

  amount: number;

  date: string;

  description?: string;

};

export function applyExpense(

  accounts: any[],

  expense: any

) {

  return accounts.map((account) => {

    if (account.id !== Number(expense.accountId))
      return account;

    return {

      ...account,

      currentBalance:
        account.currentBalance -
        expense.total,

      totalExpenses:
        account.totalExpenses +
        expense.total,

    };

  });

}

export function applyFunding(

  accounts: any[],

  funding: any

) {

  return accounts.map((account) => {

    if (account.id !== Number(funding.accountId))
      return account;

    return {

      ...account,

      currentBalance:
        account.currentBalance +
        funding.amount,

      totalFunding:
        account.totalFunding +
        funding.amount,

    };

  });

}
export function createLedgerEntry(
  type: "expense" | "funding",
  data: any
): LedgerEntry {

  return {

    id: crypto.randomUUID(),

    type,

    accountId: Number(data.accountId),

    projectId: Number(data.projectId),

    amount:
      type === "expense"
        ? data.total
        : data.amount,

    date:
      type === "expense"
        ? data.expenseDate
        : data.fundingDate,

    description:
      data.description ??
      data.notes ??
      "",

  };

}