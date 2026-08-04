import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { formatCurrency } from '@utils';
import type { TopVehicle } from '@types';
import { Search, Download, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface PremiumLeaderboardProps {
  data: TopVehicle[];
  onVehicleSelect: (vehicleId: string) => void;
}

const columnHelper = createColumnHelper<TopVehicle>();

export function PremiumLeaderboard({ data, onVehicleSelect }: PremiumLeaderboardProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'maxPrice', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const columns = useMemo(() => [
    columnHelper.accessor('year', {
      header: 'Year',
      size: 12,
      cell: (info) => (
        <span className="font-semibold text-[#071936] tabular-nums dark:text-white">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('make', {
      header: 'Make',
      size: 16,
      cell: (info) => (
        <span className="font-semibold text-[#071936] dark:text-white">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('model', {
      header: 'Model',
      size: 20,
      cell: (info) => (
        <span className="text-[#071936] dark:text-white">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('spec', {
      header: 'Spec',
      size: 18,
      cell: (info) => (
        <span className="text-xs font-medium text-[#647887] dark:text-[#b8cbd4]">{info.getValue() || '-'}</span>
      ),
    }),
    columnHelper.accessor('minPrice', {
      header: 'Min Price',
      size: 17,
      cell: (info) => (
        <span className="text-xs font-semibold text-[#647887] tabular-nums dark:text-[#b8cbd4]">{formatCurrency(info.getValue() || 0)}</span>
      ),
    }),
    columnHelper.accessor('maxPrice', {
      header: 'Max Price',
      size: 17,
      cell: (info) => (
        <span className="text-xs font-semibold text-[#647887] tabular-nums dark:text-[#b8cbd4]">{formatCurrency(info.getValue() || 0)}</span>
      ),
    }),
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnFilters: true,
  });

  const exportCSV = () => {
    const headers = ['Year', 'Make', 'Model', 'Spec', 'Min Price', 'Max Price'];
    const rows = data.map((v) => [v.year, v.make, v.model, v.spec, v.minPrice, v.maxPrice]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'premium-vehicles.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8aa0ad]" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-[8px] border-0 bg-[#f4f8fb] py-2 pl-9 pr-3 text-xs font-medium text-[#071936] outline-none transition-colors placeholder:text-[#9aabb5] focus:bg-[#edf5f7] focus:ring-2 focus:ring-[#19b8a5]/25 dark:bg-[#071936] dark:text-white dark:placeholder:text-[#8fb6cc] dark:focus:bg-[#071936]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#7e95a3] dark:text-[#b8cbd4]">
            {data.length} vehicles
          </span>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#f4f8fb] px-3 py-1.5 text-xs font-medium text-[#647887] transition-colors hover:bg-[#ecfbf8] hover:text-[#08766c] dark:bg-[#071936] dark:text-[#b8cbd4] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[10px] bg-white dark:bg-[#071936]">
        <table className="w-full table-fixed">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-[#f6f9fb] dark:bg-[#0a2029]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: `${header.getSize()}%` }}
                    className="px-3 py-2.5 text-left text-xs font-semibold tracking-normal text-[#8aa0ad] dark:text-[#8fb6cc]"
                  >
                    <button
                      type="button"
                      className="flex select-none items-center gap-1 transition-colors hover:text-[#08766c] dark:hover:text-[#19b8a5]"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ArrowUp className="h-3 w-3" />,
                        desc: <ArrowDown className="h-3 w-3" />,
                      }[header.column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer transition-colors hover:bg-[#f3faf9] dark:hover:bg-[#0f3f43]/60"
                onClick={() => onVehicleSelect(row.original.vehicleId)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 text-xs">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-[#8aa0ad]">
                  No vehicles match your search
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#8aa0ad]">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex items-center gap-1 rounded-[8px] bg-[#f4f8fb] px-2.5 py-1.5 text-xs font-medium text-[#647887] transition-colors hover:bg-[#ecfbf8] hover:text-[#08766c] disabled:opacity-30 dark:bg-[#071936] dark:text-[#8fb6cc] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="inline-flex items-center gap-1 rounded-[8px] bg-[#f4f8fb] px-2.5 py-1.5 text-xs font-medium text-[#647887] transition-colors hover:bg-[#ecfbf8] hover:text-[#08766c] disabled:opacity-30 dark:bg-[#071936] dark:text-[#8fb6cc] dark:hover:bg-[#0f3f43] dark:hover:text-[#19b8a5]"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
