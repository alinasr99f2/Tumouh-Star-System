export interface Custody {

  id: string;

  name: string;

  balance: number;

  currency: string;

  isActive: boolean;

}


export const initialCustodies: Custody[] = [

  {
    id: "C001",
    name: "عهدة علي نصر",
    balance: 25000,
    currency: "SAR",
    isActive: true,
  },

  {
    id: "C002",
    name: "عهدة أحمد",
    balance: 12000,
    currency: "SAR",
    isActive: true,
  },

];