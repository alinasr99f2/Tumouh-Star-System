import {
  Home,
  LayoutDashboard,
  FolderKanban,
  Building2,
  Receipt,
  BarChart3,
  UsersRound,
  LayoutGrid,
  ShieldCheck,
  Headset,
  History,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type SidebarMenuItem = {
  title: string;
  icon: LucideIcon;
  path: string;
  children?: SidebarMenuItem[];
};

export const sidebarMenu: SidebarMenuItem[] = [
  {
    title: "الشاشة الرئيسية",
    icon: Home,
    path: "/home",
  },

  {
    title: "لوحة التحكم",
    icon: LayoutDashboard,
    path: "/dashboard",
  },

  {
    title: "المشاريع",
    icon: FolderKanban,
    path: "/projects",
  },

  {
    title: "العمائر",
    icon: Building2,
    path: "/buildings",

    children: [
      {
        title: "خريطة الشقق",
        icon: LayoutGrid,
        path: "/buildings/1/apartments",
      },

      {
        title: "التفاصيل المالية",
        icon: BarChart3,
        path: "/buildings/financial-details",
      },

      {
        title: "تفاصيل المستأجرين",
        icon: UsersRound,
        path: "/buildings/tenant-details",
      },
    ],
  },

  {
    title: "الشقق المتاحة / المؤجرة",
    icon: LayoutGrid,
    path: "/apartments",
  },

  {
    title: "المركز المالي",
    icon: Receipt,
    path: "/financial",
  },

  {
    title: "المستخدمين والصلاحيات",
    icon: ShieldCheck,
    path: "/users-permissions",
  },

  // =========================================
  // سجل نشاط النظام
  // =========================================
  {
    title: "سجل النشاط",
    icon: History,
    path: "/activity-log",
  },

  {
    title: "تواصل معنا",
    icon: Headset,
    path: "/contact-us",
  },
];