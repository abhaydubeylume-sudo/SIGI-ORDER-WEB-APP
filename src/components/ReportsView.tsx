import React, { useState, useEffect } from 'react';
import { Order, User } from '../types';
import { 
  FileSpreadsheet, 
  FileText, 
  ArrowDownToLine, 
  Database, 
  Eye,
  X,
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Save,
  Filter,
  Trash2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getExpandedEntries } from '../utils';

interface ReportsViewProps {
  orders: Order[];
  currentUser?: User | null;
}

const initialFilterState = {
  orderDateRange: 'all',
  orderCustomStart: '',
  orderCustomEnd: '',
  shippingDateRange: 'all',
  shippingCustomStart: '',
  shippingCustomEnd: '',
  deliveryDateRange: 'all',
  deliveryCustomStart: '',
  deliveryCustomEnd: '',
  factoryIssueDateRange: 'all',
  factoryIssueCustomStart: '',
  factoryIssueCustomEnd: '',
  stoneIssueDateRange: 'all',
  stoneIssueCustomStart: '',
  stoneIssueCustomEnd: '',
  selectedCustomer: 'all',
  orderSearchNumber: '',
  selectedMetal: 'all',
  selectedStatus: 'all',
  minProgress: 0,
  maxProgress: 100,
  selectedRingSize: 'all',
  centerStoneReq: 'all',
  centerStoneShapeFilter: 'all',
  isUrgentOnly: false,
  selectedEmployee: 'all',
  universalSearch: '',
  sortBy: 'orderDate',
  sortDirection: 'desc' as 'asc' | 'desc',
  simulatedRole: ''
};

function isDateInRange(dateStr: string | undefined, rangeType: string, customStart?: string, customEnd?: string): boolean {
  if (rangeType === 'all') return true;
  if (!dateStr) return false;
  const dateNorm = dateStr.substring(0, 10);
  const date = new Date(dateNorm + 'T00:00:00');
  if (isNaN(date.getTime())) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const getWeekRange = (weeksAgo: number) => {
    const start = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff - (weeksAgo * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };
  
  switch (rangeType) {
    case 'all':
      return true;
    case 'today':
      return date.getTime() === today.getTime();
    case 'yesterday':
      return date.getTime() === yesterday.getTime();
    case 'this-week': {
      const { start, end } = getWeekRange(0);
      return date >= start && date <= end;
    }
    case 'last-week': {
      const { start, end } = getWeekRange(1);
      return date >= start && date <= end;
    }
    case 'this-month': {
      return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
    }
    case 'last-month': {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth();
    }
    case 'this-year': {
      return date.getFullYear() === today.getFullYear();
    }
    case 'custom': {
      if (!customStart && !customEnd) return true;
      const start = customStart ? new Date(customStart + 'T00:00:00') : null;
      const end = customEnd ? new Date(customEnd + 'T23:59:59') : null;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    }
    default:
      return true;
  }
}

export default function ReportsView({ orders, currentUser }: ReportsViewProps) {
  // Advanced Filter state variables
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
  const [savedFilters, setSavedFilters] = useState<any[]>(() => {
    const saved = localStorage.getItem('sigi_saved_reports_filters');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [filters, setFilters] = useState(initialFilterState);
  const [appliedFilters, setAppliedFilters] = useState(initialFilterState);

  // Compute unique dropdown options dynamically from actual active orders database
  const uniqueCustomers = Array.from(new Set(orders.map(o => o.clientCode).filter(Boolean))).sort();
  const uniqueMetals = Array.from(new Set(orders.flatMap(o => [o.metalType, ...(o.specs || []).map(s => s.metalType)]).filter(Boolean))).sort();
  const uniqueRingSizes = Array.from(new Set(orders.flatMap(o => [o.ringSize, ...(o.specs || []).map(s => s.ringSize)]).filter(Boolean))).sort((a, b) => parseFloat(a) - parseFloat(b));
  const uniqueCenterStoneShapes = Array.from(new Set(orders.flatMap(o => [o.centerStoneShape, ...(o.specs || []).map(s => s.centerStoneShape)]).filter(Boolean))).sort();
  const uniqueEmployees = Array.from(new Set(orders.flatMap(o => Object.values(o.stages || {}).map((s: any) => s.updatedBy)).filter(Boolean))).sort();

  const handleSaveFilter = () => {
    const name = prompt("Enter a name for this filter configuration template:");
    if (!name) return;
    const newSaved = [...savedFilters, { id: Date.now().toString(), name, config: filters }];
    setSavedFilters(newSaved);
    localStorage.setItem('sigi_saved_reports_filters', JSON.stringify(newSaved));
  };

  const getFilteredOrders = (ordersList: Order[], applied: typeof initialFilterState) => {
    const activeRole = applied.simulatedRole || currentUser?.role || 'Admin';
    let roleFiltered = [...ordersList];
    
    // Role permissions check
    if (activeRole === 'Staff') {
      roleFiltered = ordersList.filter(o => {
        return Object.values(o.stages || {}).some((stage: any) => 
          stage.updatedBy?.toLowerCase() === currentUser?.name?.toLowerCase() || 
          stage.updatedBy?.toLowerCase() === currentUser?.username?.toLowerCase()
        );
      });
    } else if (activeRole === 'Sales' || activeRole === 'Manager') {
      roleFiltered = ordersList;
    }

    return roleFiltered.filter(o => {
      // Universal Search
      if (applied.universalSearch) {
        const q = applied.universalSearch.toLowerCase();
        const match = 
          (o.sigiOrderNumber || '').toLowerCase().includes(q) ||
          (o.clientCode || '').toLowerCase().includes(q) ||
          (o.clientOrderRef || '').toLowerCase().includes(q) ||
          (o.sigiStyleNumber || '').toLowerCase().includes(q) ||
          (o.sigiSkuNumber || '').toLowerCase().includes(q) ||
          (o.metalType || '').toLowerCase().includes(q) ||
          (o.factoryOrderNumber || '').toLowerCase().includes(q) ||
          (o.factorySerialNumber || '').toLowerCase().includes(q) ||
          (o.remarks || '').toLowerCase().includes(q) ||
          (o.factoryNotes || '').toLowerCase().includes(q) ||
          (o.productionNotes || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      // Date Filters
      if (!isDateInRange(o.orderDate, applied.orderDateRange, applied.orderCustomStart, applied.orderCustomEnd)) {
        return false;
      }
      if (!isDateInRange(o.expectedShippingDate, applied.shippingDateRange, applied.shippingCustomStart, applied.shippingCustomEnd)) {
        return false;
      }
      const deliveryDate = o.stages?.Shipping?.completedDate || o.expectedShippingDate || '';
      if (!isDateInRange(deliveryDate, applied.deliveryDateRange, applied.deliveryCustomStart, applied.deliveryCustomEnd)) {
        return false;
      }
      const factoryIssueDate = o.stages?.Casting?.startedDate || o.stages?.CAD?.startedDate || '';
      if (!isDateInRange(factoryIssueDate, applied.factoryIssueDateRange, applied.factoryIssueCustomStart, applied.factoryIssueCustomEnd)) {
        return false;
      }
      const stoneIssueDate = o.stages?.QC?.startedDate || '';
      if (!isDateInRange(stoneIssueDate, applied.stoneIssueDateRange, applied.stoneIssueCustomStart, applied.stoneIssueCustomEnd)) {
        return false;
      }

      // Dropdowns & text filters
      if (applied.selectedCustomer !== 'all' && o.clientCode !== applied.selectedCustomer) {
        return false;
      }

      if (applied.orderSearchNumber) {
        const q = applied.orderSearchNumber.toLowerCase();
        const matchSigi = (o.sigiOrderNumber || '').toLowerCase().includes(q);
        const matchClient = (o.clientOrderRef || '').toLowerCase().includes(q);
        const matchFactory = (o.factoryOrderNumber || '').toLowerCase().includes(q);
        if (!matchSigi && !matchClient && !matchFactory) return false;
      }

      if (applied.selectedMetal !== 'all' && o.metalType !== applied.selectedMetal) {
        const specMatch = o.specs?.some(s => s.metalType === applied.selectedMetal);
        if (!specMatch) return false;
      }

      if (applied.selectedStatus !== 'all' && o.status !== applied.selectedStatus) {
        return false;
      }

      if (o.productionPercentage < applied.minProgress || o.productionPercentage > applied.maxProgress) {
        return false;
      }

      if (applied.selectedRingSize !== 'all' && o.ringSize !== applied.selectedRingSize) {
        const specMatch = o.specs?.some(s => s.ringSize === applied.selectedRingSize);
        if (!specMatch) return false;
      }

      if (applied.centerStoneReq !== 'all') {
        const reqBool = applied.centerStoneReq === 'yes';
        if (o.centerStoneRequired !== reqBool) return false;
      }

      if (applied.centerStoneShapeFilter !== 'all' && o.centerStoneShape !== applied.centerStoneShapeFilter) {
        const specMatch = o.specs?.some(s => s.centerStoneShape === applied.centerStoneShapeFilter);
        if (!specMatch) return false;
      }

      if (applied.isUrgentOnly && !o.urgent) {
        return false;
      }

      if (applied.selectedEmployee !== 'all') {
        const hasEmployee = Object.values(o.stages || {}).some((stage: any) => 
          stage.updatedBy?.toLowerCase() === applied.selectedEmployee.toLowerCase()
        );
        if (!hasEmployee) return false;
      }

      return true;
    });
  };

  const countActiveFilters = (applied: typeof initialFilterState) => {
    let count = 0;
    if (applied.universalSearch) count++;
    if (applied.selectedCustomer !== 'all') count++;
    if (applied.orderSearchNumber) count++;
    if (applied.selectedStatus !== 'all') count++;
    if (applied.selectedMetal !== 'all') count++;
    if (applied.selectedRingSize !== 'all') count++;
    if (applied.centerStoneReq !== 'all') count++;
    if (applied.centerStoneShapeFilter !== 'all') count++;
    if (applied.selectedEmployee !== 'all') count++;
    if (applied.minProgress !== 0 || applied.maxProgress !== 100) count++;
    if (applied.isUrgentOnly) count++;
    if (applied.orderDateRange !== 'all') count++;
    if (applied.shippingDateRange !== 'all') count++;
    if (applied.deliveryDateRange !== 'all') count++;
    if (applied.factoryIssueDateRange !== 'all') count++;
    if (applied.stoneIssueDateRange !== 'all') count++;
    return count;
  };

  const activeFiltersCount = countActiveFilters(appliedFilters);

  const filteredOrders = getFilteredOrders(orders, appliedFilters);

  // Apply sorting dynamically
  filteredOrders.sort((a, b) => {
    let valA: any = a[appliedFilters.sortBy as keyof Order] || '';
    let valB: any = b[appliedFilters.sortBy as keyof Order] || '';
    
    if (appliedFilters.sortBy === 'deliveryDate') {
      valA = a.stages?.Shipping?.completedDate || a.expectedShippingDate || '';
      valB = b.stages?.Shipping?.completedDate || b.expectedShippingDate || '';
    } else if (appliedFilters.sortBy === 'status') {
      valA = a.status || '';
      valB = b.status || '';
    } else if (appliedFilters.sortBy === 'productionPercentage') {
      valA = a.productionPercentage || 0;
      valB = b.productionPercentage || 0;
    }
    
    if (typeof valA === 'string') {
      return appliedFilters.sortDirection === 'asc' 
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else {
      return appliedFilters.sortDirection === 'asc'
        ? (valA > valB ? 1 : -1)
        : (valA < valB ? 1 : -1);
    }
  });

  const expandedEntries = getExpandedEntries(filteredOrders);

  const [activePreview, setActivePreview] = useState<'excel' | 'pdf' | 'csv' | null>(null);
  const [previewSearch, setPreviewSearch] = useState('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);

  const handleClosePreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
    setActivePreview(null);
  };

  // Real 29 columns from the uploaded ERP layout
  const csvHeaders = [
    'Order Date:',
    'Expected Shipping Date',
    'SIGI ORDER #',
    'Client Code',
    'Urgent',
    'SIGI Style #',
    'SIGI SKU #',
    'Metal Type',
    'Style Pictures',
    'Ring Size',
    'Center-Stone Size & Shape',
    'Center stone to set ?',
    'Notes for Factory',
    'Stamp/Laser',
    'Client Order Ref. #',
    'Factory Order #',
    'Factory serial Number',
    'Order Qty',
    'Items Completed',
    'Bal.',
    'Stone issued to qc on date',
    'Cad ok',
    'Cast ok',
    'Filling. Ok',
    'Selection ok',
    'Setting ok',
    'Progress Bar'
  ];

  const getExcelImageConfig = (dataUrl: string) => {
    if (!dataUrl) return null;
    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!match) return null;
    const ext = match[1].toLowerCase();
    if (ext.includes('svg') || ext.includes('xml')) {
      return null;
    }
    return {
      extension: (ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : 'png') as 'jpeg' | 'png',
      base64: match[2]
    };
  };

  const getRowCells = (entry: any) => {
    return [
      entry.orderDate || '',
      entry.expectedShippingDate || '',
      entry.sigiOrderNumber || '',
      entry.clientCode || '',
      entry.urgent ? 'YES' : 'NO',
      entry.sigiStyleNumber || '',
      entry.sigiSkuNumber || '',
      entry.metalType || '',
      entry.stylePicture || '',
      entry.ringSize || '',
      [entry.centerStoneSize, entry.centerStoneShape].filter(Boolean).join(' - ') || '—',
      entry.centerStoneRequired ? 'YES' : 'NO',
      entry.productionNotes || '',
      entry.stampLaser || '',
      entry.clientOrderRef || '',
      entry.factoryOrderNumber || '',
      entry.factorySerialNumber || '',
      entry.orderQuantity || 0,
      entry.itemsCompleted || 0,
      entry.balanceQuantity || 0,
      entry.stages?.QC?.startedDate || '',
      (entry.stages?.CAD?.status === 'Not Started' || !entry.stages?.CAD?.status) ? '' : entry.stages.CAD.status,
      (entry.stages?.Casting?.status === 'Not Started' || !entry.stages?.Casting?.status) ? '' : entry.stages.Casting.status,
      (entry.stages?.Filing?.status === 'Not Started' || !entry.stages?.Filing?.status) ? '' : entry.stages.Filing.status,
      (entry.stages?.Selection?.status === 'Not Started' || !entry.stages?.Selection?.status) ? '' : entry.stages.Selection.status,
      (entry.stages?.Setting?.status === 'Not Started' || !entry.stages?.Setting?.status) ? '' : entry.stages.Setting.status,
      entry.itemsCompleted >= entry.orderQuantity ? 'Completed' : `${entry.productionPercentage}%`
    ];
  };

  // CSV Exporter (exact 27 columns aligned with Excel & PDF)
  const handleExportCSV = (isPreview = false) => {
    if (expandedEntries.length === 0) return;
    
    const rows: any[] = [];
    expandedEntries.forEach(entry => {
      const cells = [...getRowCells(entry)];
      // Convert stylePicture dataUrl to "[IMAGE]" text for CSV representation
      if (cells[8]) {
        cells[8] = '[IMAGE]';
      }
      rows.push(cells);
    });

    const csvContent = [csvHeaders.join(','), ...rows.map(e => e.map(val => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    if (isPreview) {
      setActivePreview('csv');
      setPreviewSearch('');
    } else {
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SIGI_Jewelry_ERP_Database_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  // ExcelJS Exporter (exact 29 columns with identical color groupings as screenshot)
  const handleExportExcel = async (isPreview = false) => {
    if (expandedEntries.length === 0) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('SIGI Jewelry Orders');

      // Set Excel column definitions
      worksheet.columns = [
        { header: 'Order Date:', key: 'orderDate', width: 14 },
        { header: 'Expected Shipping Date', key: 'expectedShippingDate', width: 18 },
        { header: 'SIGI ORDER #', key: 'sigiOrderNumber', width: 16 },
        { header: 'Client Code', key: 'clientCode', width: 14 },
        { header: 'Urgent', key: 'urgent', width: 10 },
        { header: 'SIGI Style #', key: 'sigiStyleNumber', width: 14 },
        { header: 'SIGI SKU #', key: 'sigiSkuNumber', width: 18 },
        { header: 'Metal Type', key: 'metalType', width: 18 },
        { header: 'Style Pictures', key: 'stylePicture', width: 14 },
        { header: 'Ring Size', key: 'ringSize', width: 10 },
        { header: 'Center-Stone Size & Shape', key: 'centerStoneSizeShape', width: 22 },
        { header: 'Center stone to set ?', key: 'centerStoneRequired', width: 18 },
        { header: 'Notes for Factory', key: 'factoryNotes', width: 35 },
        { header: 'Stamp/Laser', key: 'stampLaser', width: 16 },
        { header: 'Client Order Ref. #', key: 'clientOrderRef', width: 18 },
        { header: 'Factory Order #', key: 'factoryOrderNumber', width: 16 },
        { header: 'Factory serial Number', key: 'factorySerialNumber', width: 18 },
        { header: 'Order Qty', key: 'orderQuantity', width: 12 },
        { header: 'Items Completed', key: 'itemsCompleted', width: 14 },
        { header: 'Bal.', key: 'balanceQuantity', width: 10 },
        { header: 'Stone issued to qc on date', key: 'stoneIssuedToQCOnDate', width: 22 },
        { header: 'Cad ok', key: 'cadOk', width: 12 },
        { header: 'Cast ok', key: 'castOk', width: 12 },
        { header: 'Filling. Ok', key: 'filingOk', width: 12 },
        { header: 'Selection ok', key: 'selectionOk', width: 12 },
        { header: 'Setting ok', key: 'settingOk', width: 12 },
        { header: 'Progress Bar', key: 'progressBar', width: 16 }
      ];

      // Format Header Row (Colors grouped exactly as the screenshot)
      const headerRow = worksheet.getRow(1);
      headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      // Apply background color groupings to headers (updated to 27 columns)
      for (let i = 1; i <= 27; i++) {
        const cell = headerRow.getCell(i);
        let color = '374151'; // default dark gray (QC / Progress Bar)
        if (i <= 15) {
          color = '1F5335'; // forest green group (Cols 1-15, now including production notes)
        } else if (i <= 17) {
          color = '52525B'; // medium gray factory group (Cols 16-17)
        } else if (i <= 20) {
          color = '71717A'; // light-medium gray qty group (Cols 18-20)
        } else {
          color = '374151'; // dark gray for QC / OK steps / Progress Bar
        }
        
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: color }
        };
      }

      // Add Data Rows
      expandedEntries.forEach(entry => {
        const cells = getRowCells(entry);
        const addedRow = worksheet.addRow({
          orderDate: cells[0],
          expectedShippingDate: cells[1],
          sigiOrderNumber: cells[2],
          clientCode: cells[3],
          urgent: cells[4],
          sigiStyleNumber: cells[5],
          sigiSkuNumber: cells[6],
          metalType: cells[7],
          stylePicture: '', // Keep string cell empty since we'll draw the image overlay
          ringSize: cells[9],
          centerStoneSizeShape: cells[10],
          centerStoneRequired: cells[11],
          factoryNotes: cells[12],
          stampLaser: cells[13],
          clientOrderRef: cells[14],
          factoryOrderNumber: cells[15],
          factorySerialNumber: cells[16],
          orderQuantity: cells[17],
          itemsCompleted: cells[18],
          balanceQuantity: cells[19],
          stoneIssuedToQCOnDate: cells[20],
          cadOk: cells[21],
          castOk: cells[22],
          filingOk: cells[23],
          selectionOk: cells[24],
          settingOk: cells[25],
          progressBar: cells[26]
        });

        // Overlay the style picture if available
        if (entry.stylePicture) {
          const imgConfig = getExcelImageConfig(entry.stylePicture);
          if (imgConfig) {
            try {
              const imageId = workbook.addImage({
                base64: imgConfig.base64,
                extension: imgConfig.extension
              });
              const rIndex = worksheet.rowCount;
              worksheet.addImage(imageId, {
                tl: { col: 8, row: rIndex - 1 },
                ext: { width: 44, height: 44 },
                editAs: 'oneCell'
              });
              addedRow.height = 38; // Adjust row height to fit image beautifully
            } catch (imageErr) {
              console.error("Failed to embed image in Excel file:", imageErr);
            }
          }
        }
      });

      // Color Completed cells in green
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const progressCell = row.getCell(27);
          if (progressCell.value === 'Completed') {
            progressCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: '1F5335' } // forest green background
            };
            progressCell.font = { name: 'Arial', color: { argb: 'FFFFFF' }, bold: true };
            progressCell.alignment = { horizontal: 'center' };
          }
        }
      });

      // Write Buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);

      if (isPreview) {
        setActivePreview('excel');
        setPreviewSearch('');
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `SIGI_Jewelry_ERP_Database_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate Excel sheet", err);
    }
  };

  // jsPDF Exporter (exact 27 columns rendered with autoTable for a clean bordered grid)
  const handleExportPDF = (isPreview = false) => {
    if (expandedEntries.length === 0) return;

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      const reportRows: any[] = [];
      expandedEntries.forEach(entry => {
        reportRows.push(getRowCells(entry));
      });

      // Page Title block
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text('SIGI ORDER REPORT', 10, 16);

      doc.setFontSize(11);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Export Date: ${new Date().toISOString().split('T')[0]} | Total Row Records (including specs): ${reportRows.length}`, 10, 24);

      // Core KPI Panel in PDF
      const totalItemsVal = expandedEntries.length;
      const totalCompletedVal = expandedEntries.filter(e => e.balanceQuantity === 0).length;
      const totalBalanceVal = expandedEntries.filter(e => e.balanceQuantity > 0).length;
      
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(310, 6, 100, 22, 3, 3, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`TOTAL QTY: ${totalItemsVal} Pcs`, 314, 13);
      doc.text(`COMPLETED: ${totalCompletedVal} Pcs`, 314, 21);
      doc.text(`ACTIVE BAL: ${totalBalanceVal} Pcs`, 364, 13);
      doc.text(`PIPELINE: ACTIVE`, 364, 21);

      // Define 27 columns for PDF
      const pdfColumns = [
        { header: 'Order Date:', width: 16 },
        { header: 'Expected Shipping Date', width: 16 },
        { header: 'SIGI ORDER #', width: 16 },
        { header: 'Client Code', width: 13 },
        { header: 'Urgent', width: 8 },
        { header: 'SIGI Style #', width: 16 },
        { header: 'SIGI SKU #', width: 16 },
        { header: 'Metal Type', width: 16 },
        { header: 'Style Pictures', width: 18 },
        { header: 'Ring Size', width: 16 },
        { header: 'Center-Stone Size & Shape', width: 23 },
        { header: 'Center stone to set ?', width: 15 },
        { header: 'Notes for Factory', width: 35 },
        { header: 'Stamp/Laser', width: 15 },
        { header: 'Client Order Ref. #', width: 16 },
        { header: 'Factory Order #', width: 16 },
        { header: 'Factory serial Number', width: 16 },
        { header: 'Order Qty', width: 8 },
        { header: 'Items Completed', width: 8 },
        { header: 'Bal.', width: 8 },
        { header: 'Stone issued to qc on date', width: 16 },
        { header: 'Cad ok', width: 10 },
        { header: 'Cast ok', width: 10 },
        { header: 'Filling. Ok', width: 10 },
        { header: 'Selection ok', width: 10 },
        { header: 'Setting ok', width: 10 },
        { header: 'Progress Bar', width: 18 }
      ];

      // Draw the table with autoTable
      autoTable(doc, {
        head: [pdfColumns.map(col => col.header)],
        body: reportRows,
        startY: 34,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          fontStyle: 'bold', // MAKE LETTERS BOLD
          cellPadding: 1.5,
          valign: 'middle',
          halign: 'left',
          lineWidth: 0.15,
          lineColor: [180, 180, 180], // clean grid borders
          textColor: [30, 41, 59], // Slate-800
          font: 'Helvetica',
          overflow: 'linebreak',
          minCellHeight: 18 // accommodate image beautifully
        },
        headStyles: {
          fillColor: [31, 83, 53], // Forest green header default
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 16 }, // Order Date
          1: { cellWidth: 16 }, // Expected Shipping Date
          2: { cellWidth: 16 }, // SIGI ORDER #
          3: { cellWidth: 13 },  // Client Code
          4: { cellWidth: 8, halign: 'center' },  // Urgent
          5: { cellWidth: 16 }, // SIGI Style #
          6: { cellWidth: 16 }, // SIGI SKU #
          7: { cellWidth: 16 }, // Metal Type
          8: { cellWidth: 18, halign: 'center' }, // Style Pictures
          9: { cellWidth: 16, halign: 'center' },  // Ring Size
          10: { cellWidth: 23 }, // Center-Stone Size & Shape
          11: { cellWidth: 15, halign: 'center' }, // Center stone required?
          12: { cellWidth: 35 }, // Notes for Factory
          13: { cellWidth: 15 },  // Stamp/Laser
          14: { cellWidth: 16 }, // Client Order Ref. #
          15: { cellWidth: 16 }, // Factory Order #
          16: { cellWidth: 16 }, // Factory serial Number
          17: { cellWidth: 8, halign: 'center' },  // Order Qty
          18: { cellWidth: 8, halign: 'center' },  // Items Completed
          19: { cellWidth: 8, halign: 'center' },  // Bal.
          20: { cellWidth: 16 }, // Stone issued to qc on date
          21: { cellWidth: 10, halign: 'center' },  // Cad ok
          22: { cellWidth: 10, halign: 'center' },  // Cast ok
          23: { cellWidth: 10, halign: 'center' },  // Filing ok
          24: { cellWidth: 10, halign: 'center' },  // Selection ok
          25: { cellWidth: 10, halign: 'center' },  // Setting ok
          26: { cellWidth: 18, halign: 'center' }, // Progress Bar
        },
        margin: { top: 34, bottom: 20, left: 10, right: 10 },
        didParseCell: (data) => {
          if (data.section === 'head') {
            const colIndex = data.column.index;
            // Left group forest green (Cols 0-15)
            if (colIndex <= 15) {
              data.cell.styles.fillColor = [31, 83, 53];
            }
            // Factory group medium gray (Cols 16-17)
            else if (colIndex === 16 || colIndex === 17) {
              data.cell.styles.fillColor = [82, 82, 91];
            }
            // Qty group light-medium gray (Cols 18-20)
            else if (colIndex >= 18 && colIndex <= 20) {
              data.cell.styles.fillColor = [113, 113, 122];
            }
            // QC/Progress group dark gray (Cols 21-26)
            else {
              data.cell.styles.fillColor = [55, 65, 81];
            }
          } else if (data.section === 'body') {
            if (data.column.index === 8) {
              // Suppress raw base64 string text representation in body cell
              data.cell.text = [];
            }
            if (data.column.index === 26) {
              const val = String(data.cell.raw || '');
              if (val === 'Completed') {
                data.cell.styles.textColor = [31, 83, 53];
                data.cell.styles.fontStyle = 'bold';
              } else if (val.includes('%')) {
                data.cell.styles.textColor = [37, 99, 235];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 8) {
            const entry = expandedEntries[data.row.index];
            if (entry && entry.stylePicture && entry.stylePicture.startsWith('data:image/')) {
              const lower = entry.stylePicture.toLowerCase();
              if (lower.includes('/png') || lower.includes('/jpeg') || lower.includes('/jpg')) {
                try {
                  const x = data.cell.x + 1;
                  const y = data.cell.y + 1;
                  const width = data.cell.width - 2;
                  const height = data.cell.height - 2;
                  doc.addImage(entry.stylePicture, 'PNG', x, y, width, height, undefined, 'FAST');
                } catch (pdfImgErr) {
                  console.error("Failed to render image in PDF row:", pdfImgErr);
                }
              }
            }
          }
        },
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184); // Slate-400
          
          doc.text(
            `PAGE ${data.pageNumber} OF ${pageCount}`,
            410,
            287,
            { align: 'right' }
          );
        }
      });

      if (isPreview) {
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
        setActivePreview('pdf');
        setPreviewSearch('');
      } else {
        doc.save(`SIGI_ERP_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (err) {
      console.error("Failed to generate PDF", err);
    }
  };

  const totalCommittedItems = expandedEntries.length;
  const totalFinishedItems = expandedEntries.filter(e => e.itemsCompleted === 1).length;
  const totalBalanceItems = expandedEntries.filter(e => e.balanceQuantity === 1).length;

  // New specific Report Summary metrics requested by the user
  const totalOrdersCount = filteredOrders.length;
  const totalPiecesSum = filteredOrders.reduce((sum, o) => sum + (o.orderQuantity || 0), 0);
  const totalActiveBalanceSum = expandedEntries.reduce((sum, e) => sum + (e.balanceQuantity || 0), 0);
  const totalFinishedPiecesSum = expandedEntries.reduce((sum, e) => sum + (e.itemsCompleted || 0), 0);



  const filteredPreviewEntries = expandedEntries.filter(entry => {
    const query = previewSearch.toLowerCase();
    if (!query) return true;
    return (
      (entry.sigiOrderNumber || '').toLowerCase().includes(query) ||
      (entry.clientCode || '').toLowerCase().includes(query) ||
      (entry.sigiStyleNumber || '').toLowerCase().includes(query) ||
      (entry.sigiSkuNumber || '').toLowerCase().includes(query) ||
      (entry.factoryOrderNumber || '').toLowerCase().includes(query) ||
      (entry.factorySerialNumber || '').toLowerCase().includes(query)
    );
  });

  const ITEMS_PER_PAGE = 25;
  const pdfPageCount = Math.ceil(filteredPreviewEntries.length / ITEMS_PER_PAGE) || 1;
  const paginatedPdfEntries = filteredPreviewEntries.slice(
    (pdfCurrentPage - 1) * ITEMS_PER_PAGE,
    pdfCurrentPage * ITEMS_PER_PAGE
  );

  // Construct raw CSV string from filtered list
  const csvRows = filteredPreviewEntries.map(entry => [
    entry.sigiOrderNumber, entry.orderDate, entry.expectedShippingDate, entry.clientCode,
    entry.clientOrderRef, entry.urgent ? 'YES' : 'NO', entry.sigiStyleNumber, entry.sigiSkuNumber,
    entry.metalType, entry.ringSize, entry.centerStoneSize, entry.centerStoneShape, entry.centerStoneRequired ? 'YES' : 'NO',
    entry.stampLaser, entry.factoryOrderNumber, entry.factorySerialNumber, entry.orderQuantity, 
    entry.itemsCompleted, entry.balanceQuantity, `${entry.productionPercentage}%`, entry.status, entry.currentStage, entry.remarks
  ]);
  const rawCsvString = [csvHeaders.join(','), ...csvRows.map(e => e.map(val => `"${String(val !== undefined && val !== null ? val : '').replace(/"/g, '""')}"`).join(','))].join('\n');

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 overflow-y-auto h-screen w-full bg-gray-50 dark:bg-gray-950 transition-colors duration-200 pb-20">
      
      {/* Top Title Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">SIGI ERP Export & Reporting Suite</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Generate multi-page landscape PDF summaries, custom structured Excel files, or CSV database records with detailed item specifications.</p>
      </div>

      {/* Advanced Report Filter Section */}
      <div className="max-w-7xl mx-auto mb-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-200">
        {/* Filter Header Toggler */}
        <div 
          onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-850/50 transition select-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Advanced Report Filters
                {activeFiltersCount > 0 && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-bold">
                    {activeFiltersCount} Applied
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Refine the dataset before generating or exporting your manufacturing sheets.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {savedFilters.length > 0 && (
              <span className="hidden sm:inline-block text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded font-bold">
                {savedFilters.length} Saved templates
              </span>
            )}
            {isFilterCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
          </div>
        </div>

        {/* Filter Body Content */}
        {!isFilterCollapsed && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-850 bg-gray-50/50 dark:bg-gray-900/50 space-y-6">
            
            {/* Permissions & Saved Templates Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Role Permission:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  (filters.simulatedRole || currentUser?.role || 'Admin') === 'Admin' 
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                    : 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-100 dark:border-green-900/30'
                }`}>
                  {(filters.simulatedRole || currentUser?.role || 'Admin').toUpperCase()} VIEW
                </span>
                <select 
                  value={filters.simulatedRole} 
                  onChange={(e) => setFilters({...filters, simulatedRole: e.target.value})}
                  className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 font-semibold text-gray-600 dark:text-gray-300 focus:outline-hidden"
                >
                  <option value="">Default (Logged-in)</option>
                  <option value="Admin">Simulate Admin (All Records)</option>
                  <option value="Manager">Simulate Manager (Assigned)</option>
                  <option value="Staff">Simulate Staff (Own Records)</option>
                </select>
              </div>

              {/* Saved Filters Dropdown */}
              {savedFilters.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">Quick Templates:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value === 'none') return;
                      const selected = savedFilters.find(f => f.id === e.target.value);
                      if (selected) {
                        setFilters(selected.config);
                        setAppliedFilters(selected.config);
                      }
                    }}
                    className="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 font-bold text-gray-700 dark:text-gray-200 focus:outline-hidden"
                  >
                    <option value="none">-- Load Saved Filter --</option>
                    {savedFilters.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const select = document.querySelector('select[value]') as HTMLSelectElement;
                      const id = select?.value;
                      if (id && id !== 'none') {
                        const newSaved = savedFilters.filter(f => f.id !== id);
                        setSavedFilters(newSaved);
                        localStorage.setItem('sigi_saved_reports_filters', JSON.stringify(newSaved));
                      } else {
                        const name = prompt("Enter the template name you want to delete:");
                        if (name) {
                          const newSaved = savedFilters.filter(f => f.name.toLowerCase() !== name.toLowerCase());
                          setSavedFilters(newSaved);
                          localStorage.setItem('sigi_saved_reports_filters', JSON.stringify(newSaved));
                        }
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 rounded-lg transition"
                    title="Delete Saved Filter template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              
              {/* Universal Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Universal Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search any field..."
                    value={filters.universalSearch}
                    onChange={(e) => setFilters({...filters, universalSearch: e.target.value})}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Customer Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Customer</label>
                <select
                  value={filters.selectedCustomer}
                  onChange={(e) => setFilters({...filters, selectedCustomer: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Customers</option>
                  {uniqueCustomers.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Order Search by Sigi / Client / Factory */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">SIGI/Client/Factory #</label>
                <input
                  type="text"
                  placeholder="Search order numbers..."
                  value={filters.orderSearchNumber}
                  onChange={(e) => setFilters({...filters, orderSearchNumber: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Status</label>
                <select
                  value={filters.selectedStatus}
                  onChange={(e) => setFilters({...filters, selectedStatus: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Past Due">Past Due</option>
                  <option value="Due Soon">Due Soon</option>
                  <option value="On Track">On Track</option>
                </select>
              </div>

              {/* Metal Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Metal Type</label>
                <select
                  value={filters.selectedMetal}
                  onChange={(e) => setFilters({...filters, selectedMetal: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Metal Types</option>
                  {uniqueMetals.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Ring Size Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Ring Size</label>
                <select
                  value={filters.selectedRingSize}
                  onChange={(e) => setFilters({...filters, selectedRingSize: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Ring Sizes</option>
                  {uniqueRingSizes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Center Stone Required Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Center Stone To Set?</label>
                <select
                  value={filters.centerStoneReq}
                  onChange={(e) => setFilters({...filters, centerStoneReq: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All (Yes/No)</option>
                  <option value="yes">YES</option>
                  <option value="no">NO</option>
                </select>
              </div>

              {/* Center Stone Shape Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Center Stone Shape</label>
                <select
                  value={filters.centerStoneShapeFilter}
                  onChange={(e) => setFilters({...filters, centerStoneShapeFilter: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Shapes</option>
                  {uniqueCenterStoneShapes.map(sh => (
                    <option key={sh} value={sh}>{sh}</option>
                  ))}
                </select>
              </div>

              {/* Employee Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Assign/Filter Employee</label>
                <select
                  value={filters.selectedEmployee}
                  onChange={(e) => setFilters({...filters, selectedEmployee: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Employees</option>
                  {uniqueEmployees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              {/* Manufacturing Progress Slider */}
              <div className="space-y-1.5 lg:col-span-2">
                <div className="flex justify-between items-center select-none">
                  <label className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mfg. Progress Range</label>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{filters.minProgress}% to {filters.maxProgress}%</span>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-gray-950 p-2 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-bold text-gray-400">Min:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minProgress}
                    onChange={(e) => setFilters({...filters, minProgress: parseInt(e.target.value)})}
                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-[10px] font-bold text-gray-400">Max:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.maxProgress}
                    onChange={(e) => setFilters({...filters, maxProgress: parseInt(e.target.value)})}
                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              {/* Urgent Checkbox */}
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer select-none w-full hover:bg-gray-50 dark:hover:bg-gray-950/50 transition">
                  <input
                    type="checkbox"
                    checked={filters.isUrgentOnly}
                    onChange={(e) => setFilters({...filters, isUrgentOnly: e.target.checked})}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 accent-red-600"
                  />
                  <span className="text-xs font-extrabold text-gray-750 dark:text-gray-250 uppercase tracking-wider">
                    🚨 Urgent Orders Only
                  </span>
                </label>
              </div>

            </div>

            {/* Date Filters Section */}
            <div className="border-t border-gray-150 dark:border-gray-800/80 pt-5 mt-5">
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Date-Based Filters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                
                {/* 1. Order Date */}
                <div className="space-y-1.5 p-3.5 bg-white dark:bg-gray-950 rounded-xl border border-gray-150 dark:border-gray-800">
                  <span className="text-xs font-extrabold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Order Date</span>
                  <select
                    value={filters.orderDateRange}
                    onChange={(e) => setFilters({...filters, orderDateRange: e.target.value})}
                    className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this-week">This Week</option>
                    <option value="last-week">Last Week</option>
                    <option value="this-month">This Week/Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="this-year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {filters.orderDateRange === 'custom' && (
                    <div className="space-y-1 pt-1.5">
                      <input type="date" value={filters.orderCustomStart} onChange={(e) => setFilters({...filters, orderCustomStart: e.target.value})} className="w-full p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]" />
                      <input type="date" value={filters.orderCustomEnd} onChange={(e) => setFilters({...filters, orderCustomEnd: e.target.value})} className="w-full p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]" />
                    </div>
                  )}
                </div>

                {/* 2. Shipping Date */}
                <div className="space-y-1.5 p-3.5 bg-white dark:bg-gray-950 rounded-xl border border-gray-150 dark:border-gray-800">
                  <span className="text-xs font-extrabold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Shipping Date</span>
                  <select
                    value={filters.shippingDateRange}
                    onChange={(e) => setFilters({...filters, shippingDateRange: e.target.value})}
                    className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this-week">This Week</option>
                    <option value="last-week">Last Week</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="this-year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {filters.shippingDateRange === 'custom' && (
                    <div className="space-y-1 pt-1.5">
                      <input type="date" value={filters.shippingCustomStart} onChange={(e) => setFilters({...filters, shippingCustomStart: e.target.value})} className="w-full p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]" />
                      <input type="date" value={filters.shippingCustomEnd} onChange={(e) => setFilters({...filters, shippingCustomEnd: e.target.value})} className="w-full p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]" />
                    </div>
                  )}
                </div>

                {/* 3. Delivery Date */}
                <div className="space-y-1.5 p-3.5 bg-white dark:bg-gray-950 rounded-xl border border-gray-150 dark:border-gray-800">
                  <span className="text-xs font-extrabold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Delivery Date</span>
                  <select
                    value={filters.deliveryDateRange}
                    onChange={(e) => setFilters({...filters, deliveryDateRange: e.target.value})}
                    className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this-week">This Week</option>
                    <option value="last-week">Last Week</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="this-year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {filters.deliveryDateRange === 'custom' && (
                    <div className="space-y-1 pt-1.5">
                      <input type="date" value={filters.deliveryCustomStart} onChange={(e) => setFilters({...filters, deliveryCustomStart: e.target.value})} className="w-full p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]" />
                      <input type="date" value={filters.deliveryCustomEnd} onChange={(e) => setFilters({...filters, deliveryCustomEnd: e.target.value})} className="w-full p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]" />
                    </div>
                  )}
                </div>

                {/* 4. Factory Issue Date */}
                <div className="space-y-1.5 p-3.5 bg-white dark:bg-gray-950 rounded-xl border border-gray-150 dark:border-gray-800">
                  <span className="text-xs font-extrabold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Factory Issue Date</span>
                  <select
                    value={filters.factoryIssueDateRange}
                    onChange={(e) => setFilters({...filters, factoryIssueDateRange: e.target.value})}
                    className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this-week">This Week</option>
                    <option value="last-week">Last Week</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="this-year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {filters.factoryIssueDateRange === 'custom' && (
                    <div className="space-y-1 pt-1.5">
                      <input type="date" value={filters.factoryIssueCustomStart} onChange={(e) => setFilters({...filters, factoryIssueCustomStart: e.target.value})} className="w-full p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]" />
                      <input type="date" value={filters.factoryIssueCustomEnd} onChange={(e) => setFilters({...filters, factoryIssueCustomEnd: e.target.value})} className="w-full p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]" />
                    </div>
                  )}
                </div>

                {/* 5. Stone Issue Date */}
                <div className="space-y-1.5 p-3.5 bg-white dark:bg-gray-950 rounded-xl border border-gray-150 dark:border-gray-800">
                  <span className="text-xs font-extrabold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">Stone Issue Date</span>
                  <select
                    value={filters.stoneIssueDateRange}
                    onChange={(e) => setFilters({...filters, stoneIssueDateRange: e.target.value})}
                    className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this-week">This Week</option>
                    <option value="last-week">Last Week</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="this-year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  {filters.stoneIssueDateRange === 'custom' && (
                    <div className="space-y-1 pt-1.5">
                      <input type="date" value={filters.stoneIssueCustomStart} onChange={(e) => setFilters({...filters, stoneIssueCustomStart: e.target.value})} className="w-full p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]" />
                      <input type="date" value={filters.stoneIssueCustomEnd} onChange={(e) => setFilters({...filters, stoneIssueCustomEnd: e.target.value})} className="w-full p-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-[11px]" />
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Sort Order & Action Controls */}
            <div className="border-t border-gray-150 dark:border-gray-800 pt-5 mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Sort Results:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                  className="text-xs bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-lg px-2.5 py-1.5 font-bold text-gray-700 dark:text-gray-300 focus:outline-hidden"
                >
                  <option value="orderDate">Order Date</option>
                  <option value="expectedShippingDate">Shipping Date</option>
                  <option value="deliveryDate">Delivery Date</option>
                  <option value="status">Status</option>
                  <option value="productionPercentage">Mfg. Progress</option>
                </select>
                <button
                  onClick={() => setFilters({...filters, sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc'})}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-gray-950 border border-gray-250 dark:border-gray-700 rounded-lg font-black text-gray-700 dark:text-gray-300 hover:bg-gray-55 transition"
                >
                  {filters.sortDirection.toUpperCase()}
                </button>
              </div>

              {/* Apply/Clear/Save Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveFilter}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-4 h-4 text-gray-400" /> Save Filter
                </button>
                <button
                  onClick={() => {
                    setFilters(initialFilterState);
                    setAppliedFilters(initialFilterState);
                  }}
                  className="py-2 px-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-850 text-gray-500 dark:text-gray-400 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <X className="w-4 h-4" /> Clear Filter
                </button>
                <button
                  onClick={() => setAppliedFilters(filters)}
                  className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-blue-500/10"
                >
                  <Filter className="w-4 h-4" /> Apply Filter
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Dynamic Report Summary Block */}
      <div className="max-w-7xl mx-auto mb-8">
        <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3.5">
          Filtered Report Summary
        </h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Orders */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                {totalOrdersCount}
              </span>
              <span className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-0.5 rounded-md font-bold">
                Orders
              </span>
            </div>
          </div>

          {/* Total Pieces */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Total Pieces
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                {totalPiecesSum}
              </span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold">
                Pieces
              </span>
            </div>
          </div>

          {/* Total Active Balance */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Total Active Balance
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {totalActiveBalanceSum}
              </span>
              <span className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-md font-bold">
                Bal Qty
              </span>
            </div>
          </div>

          {/* Total Finished Pieces */}
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Total Finished Pieces
            </span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-black text-green-600 dark:text-green-400 font-mono">
                {totalFinishedPiecesSum}
              </span>
              <span className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 px-2 py-0.5 rounded-md font-bold">
                Completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Export Card 1: ExcelJS */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-md">
                Spreadsheet
              </span>
            </div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Excel Workbook</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Downloads a highly-detailed multi-column Excel spreadsheet. Features custom formatted header blocks, correct cell formats, auto-adjust columns, and dynamic percentage strings. Ideal for accounting or inventory auditing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleExportExcel(true)}
              className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-800 dark:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
              title="Downloads Excel spreadsheet directly"
            >
              <Eye className="w-4 h-4 text-gray-500" /> Preview
            </button>
            <button
              onClick={() => handleExportExcel(false)}
              className="py-2.5 px-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition"
              title="Download Excel (.xlsx) file"
            >
              <ArrowDownToLine className="w-4 h-4" /> Download
            </button>
          </div>
        </div>

        {/* Export Card 2: jsPDF */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded-md">
                Formal PDF
              </span>
            </div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Landscape PDF Report</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Generates a formal executive manufacturing database report PDF. Includes workshop KPI counters, multi-spec line splitting, and formatted 23-column tables with clean margins and page-break parameters.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleExportPDF(true)}
              className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-800 dark:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
              title="Open PDF Preview in a new browser tab"
            >
              <Eye className="w-4 h-4 text-gray-500" /> Preview
            </button>
            <button
              onClick={() => handleExportPDF(false)}
              className="py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition"
              title="Download PDF (.pdf) file"
            >
              <ArrowDownToLine className="w-4 h-4" /> Download
            </button>
          </div>
        </div>

        {/* Export Card 3: CSV Standard */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-md">
                Raw Database
              </span>
            </div>
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Standard CSV</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Generates a standard raw comma-separated values text sheet. Perfect for piping order database schemas directly into secondary third-party tools, legacy ERP portals, or customer CRM dashboards.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleExportCSV(true)}
              className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-800 dark:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
              title="Open CSV preview in a new browser tab"
            >
              <Eye className="w-4 h-4 text-gray-500" /> Preview
            </button>
            <button
              onClick={() => handleExportCSV(false)}
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow transition"
              title="Download CSV (.csv) file"
            >
              <ArrowDownToLine className="w-4 h-4" /> Download
            </button>
          </div>
        </div>

      </div>

      {/* QUICK INVENTORY PREVIEW */}
      <div className="max-w-7xl mx-auto mb-8 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
        <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-4">Direct Data Summary Checks</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] text-gray-400 block font-bold">TOTAL COMMITTED ITEMS</span>
            <span className="text-xl font-black text-gray-900 dark:text-white font-mono mt-1 block">
              {totalCommittedItems} Units
            </span>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] text-gray-400 block font-bold">FINISHED SHANKS / SETTINGS</span>
            <span className="text-xl font-black text-green-600 dark:text-green-400 font-mono mt-1 block">
              {totalFinishedItems} Units
            </span>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-gray-400 block font-bold">ACTIVE MANUFACTURING BALANCE</span>
            <span className="text-xl font-black text-amber-600 font-mono mt-1 block">
              {totalBalanceItems} Units
            </span>
          </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {activePreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 md:p-6 animate-fade-in" id="preview-modal-overlay" onClick={(e) => {
          if ((e.target as HTMLElement).id === 'preview-modal-overlay') {
            handleClosePreview();
          }
        }}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-7xl h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  activePreview === 'excel' ? 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400' :
                  activePreview === 'pdf' ? 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400' :
                  'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                }`}>
                  {activePreview === 'excel' && <FileSpreadsheet className="w-5 h-5" />}
                  {activePreview === 'pdf' && <FileText className="w-5 h-5" />}
                  {activePreview === 'csv' && <Database className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                    {activePreview === 'excel' && 'Excel Spreadsheet Preview'}
                    {activePreview === 'pdf' && 'Landscape PDF Report Preview'}
                    {activePreview === 'csv' && 'Standard CSV Database Preview'}
                    <span className="text-[10px] bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded font-mono font-bold text-gray-500">LIVE PREVIEW</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {activePreview === 'excel' && 'Immersive Google Sheets style live grid. All 23 spec-level columns mapped.'}
                    {activePreview === 'pdf' && 'Formal formatted A4 landscape document preview with KPI blocks.'}
                    {activePreview === 'csv' && 'Plain comma-separated raw values text representation.'}
                  </p>
                </div>
              </div>

              {/* Close Button & Actions */}
              <div className="flex items-center gap-2">
                {activePreview === 'csv' && (
                  <button
                    onClick={() => handleCopyToClipboard(rawCsvString)}
                    className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-extrabold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer border border-blue-200 dark:border-blue-900"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500 animate-bounce" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy CSV Code
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (activePreview === 'excel') handleExportExcel(false);
                    if (activePreview === 'pdf') handleExportPDF(false);
                    if (activePreview === 'csv') handleExportCSV(false);
                  }}
                  className={`py-1.5 px-3 font-extrabold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer text-white shadow-xs ${
                    activePreview === 'excel' ? 'bg-green-600 hover:bg-green-700' :
                    activePreview === 'pdf' ? 'bg-red-600 hover:bg-red-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" /> Download File
                </button>
                <button
                  onClick={handleClosePreview}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer animate-none"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Toolbar (Search / Controls) */}
            <div className="px-4 py-2 bg-gray-50/50 dark:bg-gray-850/50 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 select-none">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter preview items..."
                  value={previewSearch}
                  onChange={(e) => {
                    setPreviewSearch(e.target.value);
                    setPdfCurrentPage(1); // Reset page on filter
                  }}
                  className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold placeholder-gray-400 text-gray-800 dark:text-gray-100 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              {/* Specific controls for types */}
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                <span>Showing {filteredPreviewEntries.length} of {expandedEntries.length} records</span>
                {activePreview === 'pdf' && (
                  <div className="flex items-center gap-1.5 ml-4 text-slate-800 dark:text-gray-200">
                    <button
                      onClick={() => setPdfCurrentPage(p => Math.max(1, p - 1))}
                      disabled={pdfCurrentPage === 1}
                      className="p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-750 hover:bg-gray-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-gray-600 dark:text-gray-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2">Page {pdfCurrentPage} of {pdfPageCount}</span>
                    <button
                      onClick={() => setPdfCurrentPage(p => Math.min(pdfPageCount, p + 1))}
                      disabled={pdfCurrentPage === pdfPageCount}
                      className="p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-750 hover:bg-gray-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-gray-600 dark:text-gray-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950 flex flex-col">
              
              {/* EXCEL SHEET VIEW */}
              {activePreview === 'excel' && (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Google Sheets Header Options list */}
                  <div className="flex items-center gap-4 px-4 py-1 bg-gray-50 dark:bg-gray-850 text-[11px] text-gray-500 border-b border-gray-200 dark:border-gray-800 select-none">
                    <span className="hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer">File</span>
                    <span className="hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer">Edit</span>
                    <span className="hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer">View</span>
                    <span className="hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer">Insert</span>
                    <span className="hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer">Format</span>
                    <span className="hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer">Data</span>
                    <span className="hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer">Tools</span>
                  </div>

                  {/* Formula Bar */}
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-800 text-[11px] text-gray-500 font-mono select-none">
                    <div className="px-2 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded select-none text-center min-w-[32px]">
                      A1
                    </div>
                    <div className="text-gray-300 dark:text-gray-700">|</div>
                    <div className="italic text-gray-400 font-bold select-none text-center min-w-[14px]">fx</div>
                    <div className="flex-1 px-2 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-750 rounded truncate text-left">
                      =EXPORT_DATABASE_ACTIVE_RECORDS(COUNT={filteredPreviewEntries.length})
                    </div>
                  </div>

                  {/* The grid sheet */}
                  <div className="flex-1 overflow-auto relative">
                    <table className="border-collapse table-fixed w-full min-w-[3500px]">
                      <thead>
                        {/* Alphabetical Headers */}
                        <tr className="bg-gray-100 dark:bg-gray-850 text-[10px] text-gray-400 dark:text-gray-500 font-mono text-center select-none">
                          <th className="w-10 bg-gray-250 dark:bg-gray-800 border border-gray-350 dark:border-gray-700 sticky left-0 top-0 z-35"></th>
                          {csvHeaders.map((h, idx) => {
                            const letter = String.fromCharCode(65 + (idx % 26)) + (idx >= 26 ? Math.floor(idx / 26) : '');
                            return (
                              <th key={idx} className="w-44 bg-gray-200 dark:bg-gray-800 border border-gray-350 dark:border-gray-700 py-1 sticky top-0 z-20">
                                {letter}
                              </th>
                            );
                          })}
                        </tr>
                        {/* Real Excel Headers (Row 1) */}
                        <tr className="text-xs text-white font-bold bg-[#1E3A8A] border border-blue-900 text-left sticky top-[22px] z-10 select-none">
                          <td className="w-10 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 sticky left-0 font-mono text-[10px] text-gray-400 text-center z-30">1</td>
                          {csvHeaders.map((h, idx) => (
                            <td key={idx} className="border border-blue-800 dark:border-blue-900 px-4 py-2 whitespace-nowrap">
                              {h}
                            </td>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800 font-sans text-[11px] text-gray-850 dark:text-gray-200 text-left">
                        {filteredPreviewEntries.map((entry, rIdx) => {
                          const rowNum = rIdx + 2; // header was row 1
                          const cells = [...getRowCells(entry)];
                          if (cells[8]) {
                            cells[8] = '[IMAGE]';
                          }
                          return (
                            <tr key={rIdx} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                              <td className="w-10 bg-gray-150 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 font-mono text-[10px] text-gray-400 text-center sticky left-0 z-10 select-none">{rowNum}</td>
                              {cells.map((val, cIdx) => (
                                <td key={cIdx} className="border border-gray-200 dark:border-gray-700 px-4 py-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                  {String(val !== undefined && val !== null ? val : '')}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom sheet tab bar */}
                  <div className="h-8 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-750 flex items-center px-4 select-none justify-between">
                    <div className="flex items-center gap-1">
                      <div className="px-3 py-1.5 bg-white dark:bg-gray-900 text-green-700 dark:text-green-400 text-xs font-bold rounded-t-md border-t-2 border-green-600 flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        SIGI Jewelry Orders
                      </div>
                      <div className="px-3 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-xs font-bold cursor-pointer transition">
                        +
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Spreadsheet Mode V1.0</div>
                  </div>
                </div>
              )}

              {/* PDF LANDSCAPE VIEW */}
              {activePreview === 'pdf' && (
                <div className="flex-1 bg-gray-150 dark:bg-gray-950 p-4 md:p-8 overflow-auto flex justify-center items-start">
                  <div className="w-full min-w-[1100px] max-w-[1200px] bg-white text-slate-800 shadow-2xl border border-gray-250 p-8 rounded-lg flex flex-col justify-between font-sans min-h-[680px]">
                    
                    {/* PDF Document Header */}
                    <div>
                      <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4">
                        <div>
                          <h2 className="text-base font-black text-slate-800 tracking-tight uppercase text-left">SIGI Jewelry Manufacturing ERP - Detailed Database Report</h2>
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 font-semibold">
                            <span>Export Date: {new Date().toISOString().split('T')[0]}</span>
                            <span>|</span>
                            <span>Total Row Records (including specs): {filteredPreviewEntries.length}</span>
                          </div>
                        </div>

                        {/* PDF KPI Mini blocks */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px]">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-extrabold text-slate-500">TOTAL QTY:</span>
                            <span className="font-mono font-black text-slate-800">{filteredPreviewEntries.length} Pcs</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-extrabold text-slate-500">ACTIVE BAL:</span>
                            <span className="font-mono font-black text-slate-800">{filteredPreviewEntries.filter(e => e.balanceQuantity > 0).length} Pcs</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 col-span-2 border-t border-slate-200/60 pt-1 mt-1">
                            <span className="font-extrabold text-slate-500">PIPELINE STATUS:</span>
                            <span className="font-mono font-black text-green-600">ACTIVE REPORT</span>
                          </div>
                        </div>
                      </div>

                      {/* PDF Table Representation with 27 columns and proper bordered grid boxes */}
                      <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-sm">
                        <table className="w-full text-[8px] border-collapse leading-tight min-w-[2000px]">
                          <thead>
                            <tr className="text-white font-extrabold text-center select-none">
                              {csvHeaders.map((header, hIdx) => {
                                let bgClass = "bg-[#1f5335] border-r border-[#153a25]"; // Forest Green
                                if (hIdx >= 15 && hIdx <= 16) {
                                  bgClass = "bg-zinc-600 border-r border-zinc-700"; // Factory Group
                                } else if (hIdx >= 17 && hIdx <= 19) {
                                  bgClass = "bg-neutral-500 border-r border-neutral-600"; // Qty Group
                                } else if (hIdx >= 20) {
                                  bgClass = "bg-slate-700 border-r border-slate-800"; // QC/Progress Group
                                }
                                return (
                                  <th key={hIdx} className={`p-1.5 border-b border-slate-950 text-center text-[7.5px] font-bold tracking-wider uppercase ${bgClass}`}>
                                    {header}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="text-slate-700 font-medium text-left">
                            {paginatedPdfEntries.length === 0 ? (
                              <tr>
                                <td colSpan={27} className="text-center py-20 text-slate-400 font-semibold text-xs">
                                  No records found in this page range.
                                </td>
                              </tr>
                            ) : (
                              paginatedPdfEntries.map((entry, idx) => {
                                const cells = getRowCells(entry);
                                return (
                                  <tr key={idx} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}>
                                    {cells.map((cellVal, cIdx) => {
                                      let cellClass = "p-1.5 px-2 border border-slate-200 text-slate-800";
                                      let alignClass = "text-left";
                                      let fontClass = "font-sans";

                                      // Font styling per column type
                                      if ([0, 1, 2, 6, 8, 9, 14, 15, 16, 17, 18, 19, 20].includes(cIdx)) {
                                        fontClass = "font-mono text-[8px]";
                                      }

                                      // Alignment adjustments
                                      if ([4, 9, 11, 17, 18, 19, 21, 22, 23, 24, 25, 26].includes(cIdx)) {
                                        alignClass = "text-center";
                                      }

                                      // Custom conditional text colors/styles
                                      if (cIdx === 4 && cellVal === 'YES') {
                                        fontClass += " text-red-600 font-black";
                                      }
                                      if (cIdx === 26) {
                                        if (cellVal === 'Completed') {
                                          fontClass += " text-green-700 font-bold bg-green-50 rounded px-1.5 py-0.5 inline-block border border-green-200";
                                        } else {
                                          fontClass += " text-blue-600 font-bold bg-blue-50 rounded px-1.5 py-0.5 inline-block border border-blue-200";
                                        }
                                      }

                                      return (
                                        <td key={cIdx} className={`${cellClass} ${alignClass} ${fontClass} whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]`} title={cIdx === 8 ? 'Style Picture Reference' : String(cellVal)}>
                                          {cIdx === 8 && cellVal ? (
                                            <img 
                                              src={cellVal} 
                                              className="h-6 w-6 object-contain mx-auto rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-0.5" 
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            cellVal
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* PDF Footer page stamp */}
                    <div className="border-t border-slate-200 pt-3 mt-4 flex items-center justify-between text-[8px] text-slate-400 font-extrabold uppercase select-none tracking-wider">
                      <span>SIGI ERP LOGISTICS REPORT • CONFIDENTIAL INTRA-PLANT DOC</span>
                      <span>PAGE {pdfCurrentPage} OF {pdfPageCount}</span>
                    </div>

                  </div>
                </div>
              )}

              {/* CSV DATABASE VIEW */}
              {activePreview === 'csv' && (
                <div className="flex-1 bg-gray-950 text-gray-300 font-mono text-xs overflow-auto flex flex-col p-4">
                  <div className="flex-1 overflow-auto max-h-[500px]">
                    <table className="w-full">
                      <tbody>
                        {rawCsvString.split('\n').map((line, idx) => (
                          <tr key={idx} className="hover:bg-gray-900 py-0.5">
                            <td className="w-12 text-gray-600 text-right pr-4 select-none border-r border-gray-850 font-mono text-[10px]">{idx + 1}</td>
                            <td className="pl-4 text-emerald-400 font-mono whitespace-pre text-[11px] text-left">{line}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
