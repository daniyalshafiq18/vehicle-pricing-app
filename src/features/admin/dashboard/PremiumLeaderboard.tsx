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
import { Search, Download, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet } from 'lucide-react';

interface PremiumLeaderboardProps {
  data: TopVehicle[];
  onVehicleSelect: (vehicleId: string) => void;
}

const columnHelper = createColumnHelper<TopVehicle>();

export function PremiumLeaderboard({ data, onVehicleSelect }: PremiumLeaderboardProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'averagePrice', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const columns = useMemo(() => [
    columnHelper.accessor('rank', {
      header: '#',
      size: 40,
      enableColumnFilter: false,
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('year', {
      header: 'Year',
      size: 60,
      cell: (info) => (
        <span className="font-medium text-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('make', {
      header: 'Make',
      cell: (info) => (
        <span className="font-medium text-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('model', {
      header: 'Model',
      cell: (info) => (
        <span className="text-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('spec', {
      header: 'Spec',
      cell: (info) => (
        <span className="text-xs text-muted-foreground">{info.getValue() || '—'}</span>
      ),
    }),
    columnHelper.accessor('minPrice', {
      header: 'Min Price',
      size: 100,
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">{formatCurrency(info.getValue() || 0)}</span>
      ),
    }),
    columnHelper.accessor('averagePrice', {
      header: 'Avg Price',
      size: 110,
      cell: (info) => (
        <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('maxPrice', {
      header: 'Max Price',
      size: 100,
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">{formatCurrency(info.getValue() || 0)}</span>
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

  // ─── Export CSV ─────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Rank', 'Year', 'Make', 'Model', 'Spec', 'Min Price', 'Avg Price', 'Max Price'];
    const rows = data.map((v) => [v.rank, v.year, v.make, v.model, v.spec, v.minPrice, v.averagePrice, v.maxPrice]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'premium-vehicles.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Export Excel (XLSX via simple CSV fallback) ────
  const exportExcel = () => {
    const headers = ['Rank', 'Year', 'Make', 'Model', 'Spec', 'Min Price', 'Avg Price', 'Max Price'];
    const rows = data.map((v) => [v.rank, v.year, v.make, v.model, v.spec, v.minPrice, v.averagePrice, v.maxPrice]);
    const csv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'premium-vehicles.xls';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {data.length} vehicles
          </span>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileSpreadsheet className="h-3 w-3" />
            Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/30">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    <div
                      className="flex items-center gap-1 cursor-pointer select-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: <ArrowUp className="h-3 w-3" />,
                        desc: <ArrowDown className="h-3 w-3" />,
                      }[header.column.getIsSorted() as string] ?? <ArrowUpDown className="h-3 w-3 opacity-30" />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border/50 transition-colors hover:bg-muted/30 cursor-pointer"
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
                <td colSpan={8} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  No vehicles match your search
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="inline-flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
