export type WriteOffRow = {
  id: number;
  sku: string | null;
  name: string | null;
  quantity: number;
  boxes: number;
  unitsPerBox: number;
  reason: string | null;
  userName: string | null;
  date: string | null;
};

export type WriteOffsPageData = {
  page: number;
  pageSize: number;
  count: number;
  pageCount: number;
  rows: WriteOffRow[];
};
