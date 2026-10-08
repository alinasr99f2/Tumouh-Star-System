import { Category } from "../types/financial";

export class CategoryEngine {

  getCategories(): Category[] {
    return [];
  }

  addCategory(category: Category) {
    return category;
  }

  deleteCategory(id: string) {
    return id;
  }

}

export const categoryEngine =
  new CategoryEngine();