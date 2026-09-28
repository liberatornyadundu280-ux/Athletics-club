import React, { forwardRef, useState, useMemo } from 'react';
import { cn } from '@/utils/helpers';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, Minus } from 'lucide-react';

// ==================== TABLE ====================
export interface Column<T> {
  key: string;
  header: string;
  accessor?: keyof T | ((item: T) => React.ReactNode);
  render?: (item: T, value: any) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  sortable?: boolean;
  defaultSortKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  rowClassName?: (item: T) => string;
  stickyHeader?: boolean;
  caption?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  sortable = false,
  defaultSortKey,
  defaultSortDirection = 'asc',
  onSort,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  rowClassName,
  stickyHeader = false,
  caption,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);
  const [selectAll, setSelectAll] = useState(false);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortable) return data;

    return [...data].sort((a, b) => {
      const column = columns.find(c => c.key === sortKey);
      if (!column || !column.accessor) return 0;

      const aVal = typeof column.accessor === 'function' ? column.accessor(a) : a[column.accessor as keyof T];
      const bVal = typeof column.accessor === 'function' ? column.accessor(b) : b[column.accessor as keyof T];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection, columns, sortable]);

  const handleSort = (key: string) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    onSort?.(key, sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleSelectAll = () => {
    const newSelection = selectAll ? [] : sortedData.map(keyExtractor);
    setSelectAll(!selectAll);
    onSelectionChange?.(newSelection);
  };

  const handleSelectRow = (key: string) => {
    const newSelection = selectedKeys.includes(key)
      ? selectedKeys.filter(k => k !== key)
      : [...selectedKeys, key];
    onSelectionChange?.(newSelection);
    setSelectAll(newSelection.length === sortedData.length && newSelection.length > 0);
  };

  const isSelected = (key: string) => selectedKeys.includes(key);
  const allSelected = sortedData.length > 0 && sortedData.every(item => isSelected(keyExtractor(item)));

  if (loading) {
    return (
      <div className="table-container">
        <table className="table" role="grid">
          <thead>
            <tr>
              {selectable && <th className="w-12" scope="col"><div className="skeleton w-4 h-4 rounded" /></th>}
              {columns.map(col => (
                <th key={col.key} scope="col" style={{ width: col.width }} className={cn(col.align && `text-${col.align}`, col.className)}>
                  <div className="skeleton h-4 w-3/4" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {selectable && <td><div className="skeleton w-4 h-4 rounded" /></td>}
                {columns.map(col => (
                  <td key={col.key} className={cn(col.align && `text-${col.align}`)}>
                    <div className="skeleton-text" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className="table-container">
        <table className="table" role="grid">
          <thead>
            <tr>
              {selectable && <th className="w-12" scope="col"><input type="checkbox" className="w-4 h-4" disabled /></th>}
              {columns.map(col => (
                <th key={col.key} scope="col" style={{ width: col.width }} className={cn(col.align && `text-${col.align}`, col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center">
                <div className="empty-state">
                  {emptyIcon || (
                    <svg className="w-12 h-12 empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <p className="empty-state-title">No Data</p>
                  <p className="empty-state-description">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={cn('table-container', stickyHeader && 'max-h-[600px] overflow-y-auto')}>
      <table className="table" role="grid">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
          <tr>
            {selectable && (
              <th scope="col" className="w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-surface-300 text-primary-800 focus:ring-2 focus:ring-primary-500"
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map(column => (
              <th
                key={column.key}
                scope="col"
                style={{ width: column.width }}
                className={cn(
                  column.align && `text-${column.align}`,
                  column.sortable && sortable && 'cursor-pointer select-none hover:bg-surface-100 dark:hover:bg-surface-800',
                  column.className
                )}
                onClick={() => column.sortable && sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-1.5">
                  <span>{column.header}</span>
                  {column.sortable && sortable && (
                    <span className="flex flex-col gap-0">
                      <ChevronUp
                        className={cn('w-3 h-3', sortKey === column.key && sortDirection === 'asc' ? 'text-primary-800' : 'text-surface-300')}
                      />
                      <ChevronDown
                        className={cn('w-3 h-3 -mt-1', sortKey === column.key && sortDirection === 'desc' ? 'text-primary-800' : 'text-surface-300')}
                      />
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map(item => {
            const key = keyExtractor(item);
            return (
              <tr
                key={key}
                className={cn(rowClassName?.(item))}
              >
                {selectable && (
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected(key)}
                      onChange={() => handleSelectRow(key)}
                      className="w-4 h-4 rounded border-surface-300 text-primary-800 focus:ring-2 focus:ring-primary-500"
                      aria-label={`Select row ${key}`}
                    />
                  </td>
                )}
                {columns.map(column => {
                  const value = column.accessor
                    ? typeof column.accessor === 'function'
                      ? column.accessor(item)
                      : item[column.accessor as keyof T]
                    : undefined;

                  return (
                    <td
                      key={column.key}
                      className={cn(column.align && `text-${column.align}`, column.className)}
                    >
                      {column.render
                        ? column.render(item, value)
                        : value !== undefined && value !== null
                        ? String(value)
                        : <span className="text-surface-400 dark:text-surface-500">—</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ==================== PAGINATION ====================
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  showItemsPerPage?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
  showItemsPerPage = true,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const pages = useMemo(() => {
    const result: (number | string)[] = [];
    const delta = 2;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        result.push(i);
      } else if (
        (result[result.length - 1] !== '...' && i < currentPage - delta) ||
        (result[result.length - 1] !== '...' && i > currentPage + delta)
      ) {
        result.push('...');
      }
    }
    return result;
  }, [currentPage, totalPages]);

  return (
    <nav className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 py-4', className)} aria-label="Pagination">
      <div className="text-body-sm text-surface-600 dark:text-surface-400">
        Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of <span className="font-medium">{totalItems}</span> results
      </div>

      <div className="flex items-center gap-2">
        {showItemsPerPage && onItemsPerPageChange && (
          <select
            value={itemsPerPage}
            onChange={e => onItemsPerPageChange(Number(e.target.value))}
            className="input w-auto px-3 py-1.5 text-body-sm"
            aria-label="Items per page"
          >
            {itemsPerPageOptions.map(opt => (
              <option key={opt} value={opt}>{opt} per page</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {pages.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-2 text-surface-500 dark:text-surface-400">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className="min-w-[36px]"
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}