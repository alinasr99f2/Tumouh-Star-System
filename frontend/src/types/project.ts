export type ProjectStatus =
  | "قيد التنفيذ"
  | "مكتمل"
  | "متوقف";

export interface Company {
  id: string;
  name: string;
}

export interface Project {
  id: number;

  name: string;

  city: string;

  progress: number;

  units: number;

  status: ProjectStatus;

  // حقول إضافية للنظام لاحقًا
  companyId?: string;

  type?:
    | "villa"
    | "building"
    | "hotel"
    | "restaurant"
    | "cafe"
    | "mall"
    | "warehouse";

  active?: boolean;
}

export interface Asset {
  id: string;

  projectId: string;

  code: string;

  name: string;

  type:
    | "villa"
    | "apartment"
    | "room"
    | "shop"
    | "office"
    | "warehouse";

  area?: number;

  rooms?: number;

  active: boolean;
}