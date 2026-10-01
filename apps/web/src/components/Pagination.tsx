import { LABELS } from '../constants/labels';

export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="font-medium text-slate-500">
        {LABELS.page} {page} {LABELS.of} {pageCount}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          {LABELS.previous}
        </button>
        <button
          type="button"
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page >= pageCount}
          onClick={() => onPage(page + 1)}
        >
          {LABELS.next}
        </button>
      </div>
    </div>
  );
}
