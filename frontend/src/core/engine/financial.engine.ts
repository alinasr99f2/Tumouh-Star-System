import { Expense, Funding } from "../../types/financial";

export class FinancialEngine {

  addExpense(
    expense: Expense
  ) {

    return {
      expense,
    };

  }

  addFunding(
    funding: Funding
  ) {

    return {
      funding,
    };

  }

  deleteExpense(
    id: string
  ) {

    return id;

  }

  updateExpense(
    expense: Expense
  ) {

    return expense;

  }

}

export const financialEngine =
  new FinancialEngine();