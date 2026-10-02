"use client";

import { Children, cloneElement, isValidElement, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type TableBodyProps = { children?: ReactNode };

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const tableChildren = Children.toArray(children);
  const bodyIndex = tableChildren.findIndex(
    (child) => isValidElement<TableBodyProps>(child) && child.type === TBody,
  );
  const body = bodyIndex >= 0 ? tableChildren[bodyIndex] : null;
  const rows = isValidElement<TableBodyProps>(body) ? Children.toArray(body.props.children) : [];
  const pageCount = Math.ceil(rows.length / pageSize);
  const currentPage = Math.min(page, pageCount || 1);
  const startIndex = (currentPage - 1) * pageSize;

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page]);

  if (bodyIndex >= 0 && isValidElement<TableBodyProps>(body) && body.type === TBody) {
    tableChildren[bodyIndex] = cloneElement(body, {
      children: rows.slice(startIndex, startIndex + pageSize),
    });
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className={cn("w-full text-left text-sm", className)}>{tableChildren}</table>
      </div>
      {rows.length > pageSize && (
        <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Rows per page</span>
            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="ml-1">
              Showing{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {startIndex + 1}–{Math.min(startIndex + pageSize, rows.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {rows.length}
              </span>
            </span>
          </div>
          <nav
            aria-label="Table pagination"
            className="flex items-center gap-1 self-end sm:self-auto"
          >
            <button
              type="button"
              aria-label="Go to previous page"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {getPageNumbers(currentPage, pageCount).map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-9 min-w-8 items-center justify-center text-slate-400"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  aria-label={`Go to page ${item}`}
                  aria-current={item === currentPage ? "page" : undefined}
                  onClick={() => setPage(item)}
                  className={cn(
                    "h-9 min-w-9 rounded-lg px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
                    item === currentPage
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              aria-label="Go to next page"
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

function getPageNumbers(currentPage: number, pageCount: number) {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis" as const, pageCount];
  if (currentPage >= pageCount - 2)
    return [1, "ellipsis" as const, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  return [
    1,
    "ellipsis" as const,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis" as const,
    pageCount,
  ];
}

export const THead = ({ children }: { children?: ReactNode }) => (
  <thead className="border-b bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-950/60">
    {children}
  </thead>
);
export const TBody = ({ children }: TableBodyProps) => (
  <tbody className="divide-y">{children}</tbody>
);
export const TR = ({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) => (
  <tr id={id} className={cn("transition hover:bg-slate-50 dark:hover:bg-slate-800/50", className)}>
    {children}
  </tr>
);
export const TH = ({ children }: { children?: ReactNode }) => (
  <th className="px-5 py-3 font-semibold">{children}</th>
);
export const TD = ({ children, className }: { children: ReactNode; className?: string }) => (
  <td className={cn("px-5 py-3.5 text-slate-600 dark:text-slate-300", className)}>{children}</td>
);
