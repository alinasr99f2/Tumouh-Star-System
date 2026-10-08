// ==========================================
// EXPENSE
// ==========================================

export interface Expense {
  id: string;

  operationNo: number;

  date: string;

  projectId: string;

  projectName: string;

  operationType: string;

  categoryId: string;

  classificationId: string;

  supplier: string;

  paymentMethod: string;

  amount: number;

  tax: number;

  total: number;

  voucherNo: string;

  description: string;

  paymentSource: string;

  custodyId: string;

  currency: string;

  status: string;

  attachment: string;

  notes: string;

  createdAt: string;
}

// ==========================================
// CATEGORY
// ==========================================

export interface ExpenseCategory {
  id: string;

  name: string;

  isActive: boolean;

  createdAt: string;
}

// ==========================================
// CLASSIFICATION
// ==========================================

export interface ExpenseClassification {
  id: string;

  categoryId: string;

  name: string;

  isActive: boolean;

  createdAt: string;
}

// ==========================================
// INITIAL CATEGORIES
// ==========================================

export const initialExpenseCategories: ExpenseCategory[] = [

  {
    id: "CAT-001",
    name: "مواد البناء",
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  {
    id: "CAT-002",
    name: "العمالة",
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  {
    id: "CAT-003",
    name: "الكهرباء",
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  {
    id: "CAT-004",
    name: "السباكة",
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  {
    id: "CAT-005",
    name: "التكييف",
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  {
    id: "CAT-006",
    name: "التشطيبات",
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  {
    id: "CAT-007",
    name: "المقاولين",
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  {
    id: "CAT-008",
    name: "النقل",
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  {
    id: "CAT-009",
    name: "المصاريف الإدارية",
    isActive: true,
    createdAt: new Date().toISOString(),
  },

  {
    id: "CAT-010",
    name: "أخرى",
    isActive: true,
    createdAt: new Date().toISOString(),
  },

];

// ==========================================
// INITIAL CLASSIFICATIONS
// ==========================================

export const initialExpenseClassifications: ExpenseClassification[] = [];

// ==========================================
// INITIAL EXPENSES
// ==========================================

export const initialExpenses: Expense[] = [];