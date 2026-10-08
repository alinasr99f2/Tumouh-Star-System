import { villas } from "../../data/villas";

export class DistributionEngine {
  distributeExpense(
    expense: any,
    projects: any[]
  ) {

    // توزيع على فيلا محددة
    if (expense.villaId) {
      return {
        expenseId: expense.id,
        projectId: expense.projectId,
        villaCode: expense.villaId,
        amount: expense.total,
      };
    }

    // توزيع على جميع فلل المشروع
    if (expense.projectId) {
      const projectVillas = villas.filter(
        (villa) =>
          String(villa.projectId) ===
          String(expense.projectId)
      );

      // لو المشروع مفيهوش فلل
      if (projectVillas.length === 0) {
        return {
          expenseId: expense.id,
          projectId: expense.projectId,
          villaCode: "",
          amount: expense.total,
        };
      }

      const amountPerVilla =
        expense.total / projectVillas.length;

      return projectVillas.map((villa) => ({
        expenseId: expense.id,
        projectId: expense.projectId,
        villaCode: villa.code,
        amount: amountPerVilla,
      }));
    }

    // مصروف عام بدون مشروع
    return {
      expenseId: expense.id,
      projectId: expense.projectId,
      villaCode: "",
      amount: expense.total,
    };
  }
}

export const distributionEngine =
  new DistributionEngine();