/**
 * PDF export utilities for vehicle valuation reports.
 *
 * Uses jsPDF + jspdf-autotable to generate clean, printable PDFs
 * with the vehicle identity, price summary, and technical specs.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Vehicle, VehiclePricing } from '@types';

export interface PdfExportData {
  vehicle: Vehicle;
  pricing: VehiclePricing;
}

/**
 * Generate and download a valuation PDF for the given vehicle + pricing.
 *
 * Layout:
 *   — Header bar (brand name)
 *   — Vehicle identity (year / make / model / spec)
 *   — Price summary (min, average, max)
 *   — Technical specifications table
 *   — Footer (generated date + disclaimer)
 */
export function downloadValuationPdf(data: PdfExportData): void {
  const { vehicle, pricing } = data;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const teal: [number, number, number] = [25, 184, 165];
  const tealDark: [number, number, number] = [8, 118, 108];
  const navy: [number, number, number] = [7, 25, 54];
  const muted: [number, number, number] = [100, 120, 135];
  const border: [number, number, number] = [217, 226, 232];
  const softSurface: [number, number, number] = [244, 248, 251];
  const tealSurface: [number, number, number] = [236, 251, 248];

  // ── Brand header ──────────────────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setFillColor(...teal);
  doc.rect(0, 17.2, pageW, 0.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Vehicle Pricing Intelligence Platform', 14, 12);

  // ── Vehicle identity ──────────────────────────────────────
  let y = 30;
  doc.setTextColor(...navy);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  doc.text(title, 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text(vehicle.spec, 14, y);
  y += 14;

  // ── Price summary ──────────────────────────────────────────
  doc.setFillColor(...tealSurface);
  doc.roundedRect(14, y, pageW - 28, 28, 3, 3, 'F');
  doc.setDrawColor(...border);
  doc.roundedRect(14, y, pageW - 28, 28, 3, 3, 'S');

  // Colour each price box
  const priceCols = [
    { label: 'Minimum Price', value: pricing.minimumPrice, x: 14, w: (pageW - 28) / 3 },
    { label: 'Average Price', value: pricing.averagePrice, x: 14 + (pageW - 28) / 3, w: (pageW - 28) / 3 },
    { label: 'Maximum Price', value: pricing.maximumPrice, x: 14 + 2 * (pageW - 28) / 3, w: (pageW - 28) / 3 },
  ];

  for (const col of priceCols) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(col.label, col.x + 4, y + 8);

    doc.setFontSize(12);
    doc.setTextColor(...tealDark);
    doc.setFont('helvetica', 'bold');
    const formatted = `AED ${col.value.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`;
    doc.text(formatted, col.x + 4, y + 21);
  }

  y += 42;

  // ── Specs table ───────────────────────────────────────────
  const specRows = [
    ['Engine Size', `${vehicle.engineSize}L`],
    ['Horsepower', `${vehicle.horsepower} HP`],
    ['Cylinders', String(vehicle.cylinders)],
    ['Transmission', vehicle.transmission],
    ['Drive Type', vehicle.driveType],
    ['Body Type', vehicle.bodyType],
    ['Doors', String(vehicle.doors)],
    ['Seats', String(vehicle.seats)],
    ['Powertrain', vehicle.powertrain],
    ['Category', vehicle.category],
    ['Vehicle Type', vehicle.vehicleType],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Specification', 'Value']],
    body: specRows,
    theme: 'grid',
    headStyles: {
      fillColor: teal,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: navy,
      lineColor: border,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: softSurface,
    },
    styles: {
      font: 'helvetica',
      cellPadding: 2.5,
      lineColor: border,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold', textColor: muted },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  // ── Footer ────────────────────────────────────────────────
  const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y + 100;
  doc.setFontSize(7);
  doc.setTextColor(...muted);
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    14,
    lastY + 14,
  );
  doc.text(
    'This report is for informational purposes only and does not constitute professional advice.',
    14,
    lastY + 20,
  );

  // ── Download ──────────────────────────────────────────────
  const fileName = `${vehicle.year}-${vehicle.make}-${vehicle.model}-valuation.pdf`
    .replace(/\s+/g, '-')
    .toLowerCase();
  doc.save(fileName);
}
