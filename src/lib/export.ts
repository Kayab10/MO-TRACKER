import { GROUP_LABEL } from '../data/taxonomy';
import { fmtLakh, fmtNum, fmtPct } from './format';
import type { GroupReport, ProductReport } from './aggregate';

function heading(report: GroupReport) {
  return `MO PERFORMANCE REPORT (${GROUP_LABEL[report.group]})`;
}

export async function exportGroupReportPDF(report: GroupReport, fileName?: string) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(heading(report), doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`For the period: ${report.range.label}`, doc.internal.pageSize.getWidth() / 2, 58, {
    align: 'center',
  });
  doc.text('Amount in lakh', doc.internal.pageSize.getWidth() - 40, 58, { align: 'right' });

  const body = report.rows.map((r) => [
    r.slNo,
    r.mo,
    fmtNum(r.target.number),
    fmtLakh(r.target.amount),
    fmtNum(r.achievement.number),
    fmtLakh(r.achievement.amount),
    fmtPct(r.pct.number),
    fmtPct(r.pct.amount),
  ]);
  body.push([
    '',
    'Total',
    fmtNum(report.total.target.number),
    fmtLakh(report.total.target.amount),
    fmtNum(report.total.achievement.number),
    fmtLakh(report.total.achievement.amount),
    fmtPct(report.total.pct.number),
    fmtPct(report.total.pct.amount),
  ]);

  autoTable(doc, {
    startY: 74,
    head: [
      [
        { content: 'Sl No.', rowSpan: 2 },
        { content: 'MO Name', rowSpan: 2 },
        { content: 'Target', colSpan: 2 },
        { content: 'Achievement', colSpan: 2 },
        { content: 'Achievement %', colSpan: 2 },
      ],
      ['No.', 'Amt.', 'No.', 'Amt.', 'No.', 'Amt.'],
    ],
    body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [165, 18, 43], halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 34 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    didParseCell: (d) => {
      if (d.row.index === body.length - 1) d.cell.styles.fontStyle = 'bold';
    },
  });

  doc.save(fileName ?? `MO_${report.group}_${stamp()}.pdf`);
}

export async function exportGroupReportExcel(report: GroupReport, fileName?: string) {
  const XLSX = await import('xlsx');
  const aoa: (string | number)[][] = [
    [heading(report)],
    [`For the period: ${report.range.label}`],
    ['Amount in lakh'],
    [],
    ['Sl No.', 'MO Name', 'Target No.', 'Target Amt.', 'Achv No.', 'Achv Amt.', 'Achv % No.', 'Achv % Amt.'],
  ];
  for (const r of report.rows)
    aoa.push([
      r.slNo,
      r.mo,
      r.target.number,
      r.target.amount,
      r.achievement.number,
      r.achievement.amount,
      r.pct.number,
      r.pct.amount,
    ]);
  aoa.push([
    '',
    'Total',
    report.total.target.number,
    report.total.target.amount,
    report.total.achievement.number,
    report.total.achievement.amount,
    report.total.pct.number,
    report.total.pct.amount,
  ]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, GROUP_LABEL[report.group].slice(0, 28));
  XLSX.writeFile(wb, fileName ?? `MO_${report.group}_${stamp()}.xlsx`);
}

// ---- Product-wise report exports ----
const PRODUCT_HEAD = 'PRODUCT-WISE LEAD REPORT';

export async function exportProductReportPDF(report: ProductReport, fileName?: string) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(PRODUCT_HEAD, doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`For the period: ${report.range.label}`, doc.internal.pageSize.getWidth() / 2, 58, {
    align: 'center',
  });
  doc.text('Amount in lakh', doc.internal.pageSize.getWidth() - 40, 58, { align: 'right' });

  const body = report.rows.map((r) => [
    r.product,
    r.subProduct,
    fmtNum(r.leads),
    fmtLakh(r.leadAmount),
    fmtNum(r.converted),
    fmtLakh(r.convertedAmount),
    fmtNum(r.pending),
    fmtNum(r.rejected),
  ]);
  body.push([
    'Total',
    '',
    fmtNum(report.total.leads),
    fmtLakh(report.total.leadAmount),
    fmtNum(report.total.converted),
    fmtLakh(report.total.convertedAmount),
    fmtNum(report.total.pending),
    fmtNum(report.total.rejected),
  ]);

  autoTable(doc, {
    startY: 74,
    head: [
      [
        { content: 'Product', rowSpan: 2 },
        { content: 'Sub-product', rowSpan: 2 },
        { content: 'Leads (all)', colSpan: 2 },
        { content: 'Converted', colSpan: 2 },
        { content: 'Pending', rowSpan: 2 },
        { content: 'Rejected', rowSpan: 2 },
      ],
      ['No.', 'Amt.', 'No.', 'Amt.'],
    ],
    body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [124, 58, 237], halign: 'center' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    didParseCell: (d) => {
      if (d.row.index === body.length - 1) d.cell.styles.fontStyle = 'bold';
    },
  });

  doc.save(fileName ?? `Product_report_${stamp()}.pdf`);
}

export async function exportProductReportExcel(report: ProductReport, fileName?: string) {
  const XLSX = await import('xlsx');
  const aoa: (string | number)[][] = [
    [PRODUCT_HEAD],
    [`For the period: ${report.range.label}`],
    ['Amount in lakh'],
    [],
    ['Product', 'Sub-product', 'Leads No.', 'Leads Amt.', 'Converted No.', 'Converted Amt.', 'Pending', 'Rejected'],
  ];
  for (const r of report.rows)
    aoa.push([
      r.product,
      r.subProduct,
      r.leads,
      r.leadAmount,
      r.converted,
      r.convertedAmount,
      r.pending,
      r.rejected,
    ]);
  aoa.push([
    'Total',
    '',
    report.total.leads,
    report.total.leadAmount,
    report.total.converted,
    report.total.convertedAmount,
    report.total.pending,
    report.total.rejected,
  ]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 13 }, { wch: 14 }, { wch: 10 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Product-wise');
  XLSX.writeFile(wb, fileName ?? `Product_report_${stamp()}.xlsx`);
}

export function productShareText(report: ProductReport): string {
  const lines: string[] = [];
  lines.push(`*${PRODUCT_HEAD}*`);
  lines.push(report.range.label);
  lines.push('_Amount in lakh_');
  lines.push('');
  lines.push(`Total leads: ${fmtNum(report.total.leads)} / ${fmtLakh(report.total.leadAmount)}`);
  lines.push(
    `Converted: ${fmtNum(report.total.converted)} / ${fmtLakh(report.total.convertedAmount)}`,
  );
  lines.push(`Pending: ${fmtNum(report.total.pending)}   Rejected: ${fmtNum(report.total.rejected)}`);
  lines.push('');
  const top = [...report.rows].sort((a, b) => b.converted - a.converted).slice(0, 6);
  if (top.length) {
    lines.push('Top sub-products (converted):');
    top.forEach((r, i) =>
      lines.push(`${i + 1}. ${r.subProduct} — ${fmtNum(r.converted)} / ${fmtLakh(r.convertedAmount)}`),
    );
  }
  return lines.join('\n');
}

export function reportShareText(report: GroupReport): string {
  const lines: string[] = [];
  lines.push(`*${heading(report)}*`);
  lines.push(report.range.label);
  lines.push('_Amount in lakh_');
  lines.push('');
  lines.push(
    `Target: ${fmtNum(report.total.target.number)} / ${fmtLakh(report.total.target.amount)}`,
  );
  lines.push(
    `Achieved: ${fmtNum(report.total.achievement.number)} / ${fmtLakh(report.total.achievement.amount)}`,
  );
  lines.push(`Achv %: ${fmtPct(report.total.pct.number)} / ${fmtPct(report.total.pct.amount)}`);
  lines.push('');
  const top = [...report.rows]
    .filter((r) => r.achievement.amount > 0)
    .sort((a, b) => b.pct.amount - a.pct.amount)
    .slice(0, 5);
  if (top.length) {
    lines.push('Top performers (Amt %):');
    top.forEach((r, i) => lines.push(`${i + 1}. ${r.mo} — ${fmtPct(r.pct.amount)}`));
  }
  return lines.join('\n');
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function stamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
