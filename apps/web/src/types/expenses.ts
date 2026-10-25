export type ExpenseRow = {
  id: number;
  date: string | null;
  amount: number;
  detail: string;
  userName: string | null;
};

export type ExpensesPageData = {
  page: number;
  pageSize: number;
  count: number;
  pageCount: number;
  total: number;
  rows: ExpenseRow[];
};
