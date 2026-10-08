import { useEffect, useState } from "react";

import Header from "../components/Header";
import KpiCards from "../components/KpiCards";
import VillaGroups from "../components/VillaGroups";
import AddVillaButton from "../components/buttons/AddVillaButton";
import AddVillaModal from "../components/modals/AddVillaModal";
import AddExpenseModal from "../components/modals/AddExpenseModal";
import ExpensesPage from "./ExpensesPage";
import Sidebar from "../components/sidebar/Sidebar";


import {
  villas as initialVillas,
  type Villa,
} from "../data/villas";

import {
  initialExpenses,
  initialExpenseCategories,
  initialExpenseClassifications,
  type Expense,
  type ExpenseCategory,
  type ExpenseClassification,
} from "../data/expenses";


function Dashboard() {

  // ==========================================
  // VILLAS
  // ==========================================

  const [villas, setVillas] = useState<Villa[]>(() => {

    const saved =
      localStorage.getItem("tabuk-villas");

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialVillas;
      }
    }

    return initialVillas;

  });


  // ==========================================
  // EXPENSES
  // ==========================================

  const [expenses, setExpenses] =
    useState<Expense[]>(() => {

      const saved =
        localStorage.getItem(
          "tabuk-expenses"
        );

      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return initialExpenses;
        }
      }

      return initialExpenses;

    });


  // ==========================================
  // EXPENSE CATEGORIES
  // ==========================================

  const [
    expenseCategories,
    setExpenseCategories
  ] = useState<ExpenseCategory[]>(() => {

    const saved =
      localStorage.getItem(
        "tabuk-expense-categories"
      );

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialExpenseCategories;
      }
    }

    return initialExpenseCategories;

  });


  // ==========================================
  // EXPENSE CLASSIFICATIONS
  // ==========================================

  const [
    expenseClassifications,
    setExpenseClassifications
  ] = useState<ExpenseClassification[]>(() => {

    const saved =
      localStorage.getItem(
        "tabuk-expense-classifications"
      );

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialExpenseClassifications;
      }
    }

    return initialExpenseClassifications;

  });


  // ==========================================
  // MODALS
  // ==========================================

  const [
    isAddVillaOpen,
    setIsAddVillaOpen
  ] = useState(false);


  const [
    isAddExpenseOpen,
    setIsAddExpenseOpen
  ] = useState(false);


  

  // ==========================================
  // SAVE VILLAS
  // ==========================================

  useEffect(() => {

    localStorage.setItem(
      "tabuk-villas",
      JSON.stringify(villas)
    );

  }, [villas]);


  // ==========================================
  // SAVE EXPENSES
  // ==========================================

  useEffect(() => {

    localStorage.setItem(
      "tabuk-expenses",
      JSON.stringify(expenses)
    );

  }, [expenses]);


  // ==========================================
  // SAVE CATEGORIES
  // ==========================================

  useEffect(() => {

    localStorage.setItem(
      "tabuk-expense-categories",
      JSON.stringify(expenseCategories)
    );

  }, [expenseCategories]);


  // ==========================================
  // SAVE CLASSIFICATIONS
  // ==========================================

  useEffect(() => {

    localStorage.setItem(
      "tabuk-expense-classifications",
      JSON.stringify(
        expenseClassifications
      )
    );

  }, [expenseClassifications]);


  // ==========================================
  // ADD VILLA
  // ==========================================

  const addVilla = (
    newVilla: Villa
  ) => {

    const villaExists =
      villas.some(
        (villa) =>
          villa.code.toUpperCase() ===
          newVilla.code.toUpperCase()
      );


    if (villaExists) {

      alert(
        `الفيلا ${newVilla.code} موجودة بالفعل`
      );

      return false;

    }


    setVillas(
      (currentVillas) => [
        ...currentVillas,
        newVilla,
      ]
    );


    return true;

  };


  // ==========================================
  // UPDATE VILLA
  // ==========================================

  const updateVilla = (
    updatedVilla: Villa
  ) => {

    setVillas(
      (currentVillas) =>
        currentVillas.map(
          (villa) =>
            villa.code ===
            updatedVilla.code
              ? updatedVilla
              : villa
        )
    );

  };

// ==========================================
// DELETE VILLA
// ==========================================

const deleteVilla = (villaToDelete: Villa) => {

  const confirmed = window.confirm(
    `هل أنت متأكد من حذف الفيلا ${villaToDelete.code}؟\n\nلا يمكن التراجع عن هذه العملية.`
  );

  if (!confirmed) {
    return;
  }

  setVillas((currentVillas) =>
    currentVillas.filter(
      (villa) =>
        villa.code !== villaToDelete.code
    )
  );

};
  // ==========================================
  // ADD EXPENSE
  // ==========================================

  const addExpense = (
    newExpense: Expense
  ) => {

    setExpenses(
      (currentExpenses) => [
        ...currentExpenses,
        newExpense,
      ]
    );

  };


  // ==========================================
  // ADD EXPENSE CATEGORY
  // ==========================================

  const addExpenseCategory = (
    name: string
  ): ExpenseCategory => {

    const existingCategory =
      expenseCategories.find(
        (category) =>
          category.name
            .trim()
            .toLowerCase() ===
          name
            .trim()
            .toLowerCase()
      );


    if (existingCategory) {
      return existingCategory;
    }


    const newCategory:
      ExpenseCategory = {

      id:
        `CAT-${Date.now()}`,

      name:
        name.trim(),

      isActive:
        true,

      createdAt:
        new Date().toISOString(),

    };


    setExpenseCategories(
      (currentCategories) => [
        ...currentCategories,
        newCategory,
      ]
    );


    return newCategory;

  };


  // ==========================================
  // ADD EXPENSE CLASSIFICATION
  // ==========================================

  const addExpenseClassification = (
    categoryId: string,
    name: string
  ): ExpenseClassification => {

    const existingClassification =
      expenseClassifications.find(
        (classification) =>
          classification.categoryId ===
            categoryId &&
          classification.name
            .trim()
            .toLowerCase() ===
          name
            .trim()
            .toLowerCase()
      );


    if (existingClassification) {
      return existingClassification;
    }


    const newClassification:
      ExpenseClassification = {

      id:
        `CLS-${Date.now()}`,

      categoryId,

      name:
        name.trim(),

      isActive:
        true,

      createdAt:
        new Date().toISOString(),

    };


    setExpenseClassifications(
      (currentClassifications) => [
        ...currentClassifications,
        newClassification,
      ]
    );


    return newClassification;

  };


  // ==========================================
  // TOTAL EXPENSES
  // ==========================================

  const totalExpenses =
    expenses.reduce(
      (total, expense) =>
        total + expense.amount,
      0
    );


  const projectExpenses =
  expenses.reduce(
    (total, expense) =>
      total + expense.amount,
    0
  );


  const villaExpenses =
  expenses.reduce(
    (total, expense) =>
      total + expense.amount,
    0
  );


  // ==========================================
  // DISPLAY
  // ==========================================

 return (
  <div
    className="app-layout"
    dir="rtl"
  >
    {/* =====================================
        SIDEBAR
    ====================================== */}

    <Sidebar onLogout={() => {}} />
  


    <div className="app-main">

      {/* =====================================
          DASHBOARD PAGE
      ====================================== */}

            <>
          <Header />

          <main className="dashboard-content">

            {/* =====================================
                ACTION BAR
            ====================================== */}

            <div className="dashboard-actions">

              <div className="dashboard-actions-title">

                <span>
                  إدارة المشروع
                </span>

                <h2>
                  لوحة تحكم الفلل
                </h2>

              </div>


              <div className="dashboard-action-buttons">

                {/* إدارة المصروفات */}

                

                {/* إضافة فيلا */}

                <AddVillaButton
                  onClick={() =>
                    setIsAddVillaOpen(true)
                  }
                />

              </div>

            </div>


            {/* =====================================
                EXPENSE SUMMARY
            ====================================== */}

            <div className="expense-quick-summary">

              <div className="expense-summary-card">

                <span>
                  إجمالي المصروفات
                </span>

                <strong>
                  {totalExpenses.toLocaleString()} ريال
                </strong>

              </div>


              <div className="expense-summary-card">

                <span>
                  مصاريف المشروع العامة
                </span>

                <strong>
                  {projectExpenses.toLocaleString()} ريال
                </strong>

              </div>


              <div className="expense-summary-card">

                <span>
                  مصاريف الفلل
                </span>

                <strong>
                  {villaExpenses.toLocaleString()} ريال
                </strong>

              </div>


              <div className="expense-summary-card">

                <span>
                  عدد العمليات
                </span>

                <strong>
                  {expenses.length}
                </strong>

              </div>

            </div>


            {/* =====================================
                KPI
            ====================================== */}

            <KpiCards
              villas={villas}
            />


            {/* =====================================
                VILLA GROUPS
            ====================================== */}

            <VillaGroups
              villas={villas}
              onUpdateVilla={updateVilla}
              onDeleteVilla={deleteVilla}
            />

          </main>
        </>
    
      {/* =====================================
          EXPENSES PAGE
      ====================================== */}

      

      {/* =====================================
          VILLAS PAGE
      ====================================== */}

      


      {/* =====================================
          REPORTS PAGE
      ====================================== */}

      


      {/* =====================================
          ADD VILLA MODAL
      ====================================== */}

      <AddVillaModal
        isOpen={isAddVillaOpen}

        onClose={() =>
          setIsAddVillaOpen(false)
        }

        onAddVilla={addVilla}
      />


      {/* =====================================
          ADD EXPENSE MODAL
      ====================================== */}

      <AddExpenseModal
      open={isAddExpenseOpen}

        villas={villas}

        categories={
          expenseCategories
        }

        classifications={
          expenseClassifications
        }

        onClose={() =>
          setIsAddExpenseOpen(false)
        }

        onAddExpense={
          addExpense
        }

        onAddCategory={(category) => {
          addExpenseCategory(category.name);
        }}

        onAddClassification={(classification) => {
          addExpenseClassification(
            String(classification.categoryId),
            classification.name
          );
        }}
      />

    </div>

  </div>
);
}

export default Dashboard;