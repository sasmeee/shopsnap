import { useState } from "react";

export const PAGE_SIZE = 10;

// page through a list that is already in memory.
export function usePagination<T>(items: T[], pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;

  return {
    page: current,
    totalPages,
    pageItems: items.slice(start, start + pageSize),
    setPage,
    reset: () => setPage(1),
  };
}
