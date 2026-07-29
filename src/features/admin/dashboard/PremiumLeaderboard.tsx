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
  const [sorting, setSorting] = useState<SortingState>([{ id: 'maxPrice', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const columns = useMemo(() => [
    columnHelper.accessor('rank', {
      header: '#',
      size: 40,
      enableColumnFilter: false,
      cell: (info) => (
        <span className="font-mono text-[11px] font-semibold text-[#8aa0ad]">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('year', {
      header: 'Year',
      size: 60,
      cell: (info) => (
        <span className="font-semibold text-[#071936]">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('make', {
      header: 'Make',
      cell: (info) => (
        <span className="font-semibold text-[#071936]">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('model', {
      header: 'Model',
      cell: (info) => (
        <span className="text-[#071936]">{info.getValue()}</span>
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
        <span className="font-mono text-[11px] font-semibold text-[#647887]">{formatCurrency(info.getValue() || 0)}</span>
      ),
    }),
    columnHelper.accessor('maxPrice', {
      header: 'Max Price',
      size: 100,
      cell: (info) => (
        <span className="font-mono text-[11px] font-semibold text-[#647887]">{formatCurrency(info.getValue() || 0)}</span>
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
    const headers = ['Rank', 'Year', 'Make', 'Model', 'Spec', 'Min Price', 'Max Price'];
    const rows = data.map((v) => [v.rank, v.year, v.make, v.model, v.spec, v.minPrice, v.maxPrice]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'premium-vehicles.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Export TSV (opens in spreadsheet apps) ──────────
  const exportTSV = () => {
    const headers = ['Rank', 'Year', 'Make', 'Model', 'Spec', 'Min Price', 'Max Price'];
    const rows = data.map((v) => [v.rank, v.year, v.make, v.model, v.spec, v.minPrice, v.maxPrice]);
    const csv = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    const blob = new Blob([csv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'premium-vehicles.tsv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8aa0ad]" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full rounded-[8px] border-0 bg-[#f4f8fb] py-2 pl-9 pr-3 text-[11px] font-medium text-[#071936] outline-none transition-colors placeholder:text-[#9aabb5] focus:bg-[#edf5f7] focus:ring-2 focus:ring-[#19b8a5]/25"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[#8aa0ad]">
            {data.length} vehicles
          </span>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#f4f8fb] px-3 py-1.5 text-[10px] font-bold text-[#647887] transition-colors hover:bg-[#ecfbf8] hover:text-[#08766c]"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
          <button
            onClick={exportTSV}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#f4f8fb] px-3 py-1.5 text-[10px] font-bold text-[#647887] transition-colors hover:bg-[#ecfbf8] hover:text-[#08766c]"
          >
            <FileSpreadsheet className="h-3 w-3" />
            TSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[10px] bg-white">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-[#f6f9fb]">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-normal text-[#8aa0ad]"
                  >
                    <div
                      className="flex cursor-pointer select-none items-center gap-1"
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
                className="cursor-pointer transition-colors hover:bg-[#f3faf9]"
                onClick={() => onVehicleSelect(row.original.vehicleId)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 text-[12px]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-[#8aa0ad]">
                  No vehicles match your search
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#8aa0ad]">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex items-center gap-1 rounded-[8px] bg-[#f4f8fb] px-2.5 py-1.5 text-[10px] font-bold text-[#647887] transition-colors hover:bg-[#ecfbf8] hover:text-[#08766c] disabled:opacity-30"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="inline-flex items-center gap-1 rounded-[8px] bg-[#f4f8fb] px-2.5 py-1.5 text-[10px] font-bold text-[#647887] transition-colors hover:bg-[#ecfbf8] hover:text-[#08766c] disabled:opacity-30"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
