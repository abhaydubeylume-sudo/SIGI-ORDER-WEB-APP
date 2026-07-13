import React, { useState } from 'react';
import { Order, StageName, ProductionStage, OrderItemSpec } from '../types';
import { Upload, AlertCircle, RefreshCw, Save, Check, Plus, Trash2 } from 'lucide-react';
import { getTodayDateStr } from '../utils';

interface OrderFormViewProps {
  orders: Order[];
  onOrderCreated: (newOrder: Order) => void;
  operatorName: string;
  operatorRole: string;
}

export default function OrderFormView({ orders, onOrderCreated, operatorName, operatorRole }: OrderFormViewProps) {
  // Input fields state
  const [sigiOrderNumber, setSigiOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(getTodayDateStr());
  const [expectedShippingDate, setExpectedShippingDate] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [clientOrderRef, setClientOrderRef] = useState('');
  const [urgent, setUrgent] = useState(false);

  // Unlimited specification state
  const [specs, setSpecs] = useState<OrderItemSpec[]>([
    {
      sigiStyleNumber: '',
      sigiSkuNumber: '',
      metalType: '18K White Gold',
      ringSize: '6.5',
      centerStoneSize: '',
      centerStoneShape: '',
      stampLaser: '',
      stylePicture: '',
      stonePicture: '',
      productionNotes: ''
    }
  ]);

  const [centerStoneRequired, setCenterStoneRequired] = useState(false);
  const [factoryNotes, setFactoryNotes] = useState('');
  const [factoryOrderNumber, setFactoryOrderNumber] = useState('');
  const [factorySerialNumber, setFactorySerialNumber] = useState('');
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [itemsCompleted, setItemsCompleted] = useState<number>(0);
  const [remarks, setRemarks] = useState('');
  const [stoneWeight, setStoneWeight] = useState('');
  const [adminReturnSign, setAdminReturnSign] = useState('');

  // Drag states per specification item index
  const [styleDragOver, setStyleDragOver] = useState<Record<number, boolean>>({});
  const [stoneDragOver, setStoneDragOver] = useState<Record<number, boolean>>({});

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleAddSpec = () => {
    setSpecs([
      ...specs,
      {
        sigiStyleNumber: '',
        sigiSkuNumber: '',
        metalType: '18K White Gold',
        ringSize: '6.5',
        centerStoneSize: '',
        centerStoneShape: '',
        stampLaser: '',
        stylePicture: '',
        stonePicture: '',
        productionNotes: ''
      }
    ]);
  };

  const handleUpdateSpec = (index: number, field: keyof OrderItemSpec, value: string) => {
    const updated = [...specs];
    updated[index] = { ...updated[index], [field]: value };
    setSpecs(updated);
  };

  const handleRemoveSpec = (index: number) => {
    if (specs.length <= 1) return;
    setSpecs(specs.filter((_, i) => i !== index));
  };

  const metalTypesList = [
    '18K White Gold',
    '18K Yellow Gold',
    '18K Rose Gold',
    '14K White Gold',
    '14K Yellow Gold',
    '14K Rose Gold',
    'Platinum 950',
    'Sterling Silver'
  ];

  const centerStoneShapesList = [
    'Round Brilliant',
    'Oval Cut',
    'Emerald Cut',
    'Princess Cut',
    'Pear Shape',
    'Cushion Cut',
    'Marquise Cut',
    'Radiant Cut',
    'N/A'
  ];

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!sigiOrderNumber.trim()) {
      newErrors.sigiOrderNumber = 'SIGI Order Number is required.';
    } else {
      // Check for uniqueness (exact match or split suffix match like SIGI-12345-1)
      const isDuplicate = orders.some((o) => {
        const otherNum = o.sigiOrderNumber.toUpperCase().trim();
        const inputNum = sigiOrderNumber.toUpperCase().trim();
        return otherNum === inputNum || otherNum.startsWith(inputNum + '-');
      });
      if (isDuplicate) {
        newErrors.sigiOrderNumber = `SIGI Order Number '${sigiOrderNumber}' already exists in ERP logs. Must be unique.`;
      }
    }

    if (!orderDate) {
      newErrors.orderDate = 'Order Date is required.';
    }

    if (!expectedShippingDate) {
      newErrors.expectedShippingDate = 'Expected Shipping Date is required.';
    } else if (orderDate && new Date(expectedShippingDate) < new Date(orderDate)) {
      newErrors.expectedShippingDate = 'Expected Shipping Date cannot be before the Order Date.';
    }

    if (!clientCode.trim()) {
      newErrors.clientCode = 'Client Code is required.';
    }

    // Validate all specification rows
    specs.forEach((spec, idx) => {
      if (!spec.sigiStyleNumber.trim()) {
        newErrors[`spec_${idx}_style`] = `Item #${idx + 1}: Style Number is required.`;
      }
      if (!spec.sigiSkuNumber.trim()) {
        newErrors[`spec_${idx}_sku`] = `Item #${idx + 1}: SKU Number is required.`;
      }
    });

    if (orderQuantity <= 0) {
      newErrors.orderQuantity = 'Order Quantity must be at least 1.';
    }

    if (itemsCompleted < 0) {
      newErrors.itemsCompleted = 'Completed Quantity cannot be negative.';
    } else if (itemsCompleted > orderQuantity) {
      newErrors.itemsCompleted = 'Completed Quantity cannot exceed Order Quantity.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // Scroll to top or first error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      sigiOrderNumber: sigiOrderNumber.trim().toUpperCase(),
      orderDate,
      expectedShippingDate,
      clientCode: clientCode.trim().toUpperCase(),
      clientOrderRef: clientOrderRef.trim(),
      urgent,
      sigiStyleNumber: specs[0]?.sigiStyleNumber.trim().toUpperCase() || '',
      sigiSkuNumber: specs[0]?.sigiSkuNumber.trim().toUpperCase() || '',
      metalType: specs[0]?.metalType || '18K White Gold',
      ringSize: specs[0]?.ringSize || '6.5',
      centerStoneSize: specs[0]?.centerStoneSize.trim() || '',
      centerStoneShape: specs[0]?.centerStoneShape || '',
      stampLaser: specs[0]?.stampLaser.trim() || '',
      centerStoneRequired,
      stylePicture: specs[0]?.stylePicture || '',
      stonePicture: specs[0]?.stonePicture || '',
      productionNotes: specs[0]?.productionNotes?.trim() || '',
      factoryNotes: factoryNotes.trim(),
      factoryOrderNumber: factoryOrderNumber.trim(),
      factorySerialNumber: factorySerialNumber.trim(),
      orderQuantity: Number(orderQuantity),
      itemsCompleted: Number(itemsCompleted),
      remarks: remarks.trim(),
      stoneWeight: stoneWeight.trim(),
      adminReturnSign: adminReturnSign.trim(),
      operatorName,
      operatorRole,
      specs: specs.map(s => ({
        sigiStyleNumber: s.sigiStyleNumber.trim().toUpperCase(),
        sigiSkuNumber: s.sigiSkuNumber.trim().toUpperCase(),
        metalType: s.metalType,
        ringSize: s.ringSize,
        centerStoneSize: s.centerStoneSize.trim(),
        centerStoneShape: s.centerStoneShape,
        stampLaser: s.stampLaser.trim(),
        stylePicture: s.stylePicture || '',
        stonePicture: s.stonePicture || '',
        productionNotes: s.productionNotes?.trim() || ''
      }))
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const createdOrder = await response.json();
        onOrderCreated(createdOrder);
        setShowSuccess(true);
        handleReset();
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        const errData = await response.json();
        setErrors({ submit: errData.message || 'Failed to submit order to server.' });
      }
    } catch (err) {
      console.error(err);
      setErrors({ submit: 'Network error occurred while creating order.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSigiOrderNumber('');
    setOrderDate(getTodayDateStr());
    setExpectedShippingDate('');
    setClientCode('');
    setClientOrderRef('');
    setUrgent(false);
    setSpecs([
      {
        sigiStyleNumber: '',
        sigiSkuNumber: '',
        metalType: '18K White Gold',
        ringSize: '6.5',
        centerStoneSize: '',
        centerStoneShape: '',
        stampLaser: '',
        stylePicture: '',
        stonePicture: '',
        productionNotes: ''
      }
    ]);
    setCenterStoneRequired(false);
    setFactoryNotes('');
    setFactoryOrderNumber('');
    setFactorySerialNumber('');
    setOrderQuantity(1);
    setItemsCompleted(0);
    setRemarks('');
    setStoneWeight('');
    setAdminReturnSign('');
    setErrors({});
  };

  return (
    <div className="p-6 overflow-y-auto h-screen w-full bg-[#f0f4f9] dark:bg-gray-950 transition-colors duration-200">
      
      {/* Decorative Form Top Banner */}
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-md overflow-hidden mb-6 border border-gray-200 dark:border-gray-800">
        
        {/* Google Form Style Colorful Header Strip */}
        <div className="h-3.5 bg-blue-600 dark:bg-blue-500 w-full" />
        
        <div className="p-8 space-y-3">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">SIGI Jewelry Order Receipt</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Submit new manufacturing records directly into the workshop ERP. Fields marked with an asterisk (*) are strictly required.
          </p>
          <div className="text-xs text-red-500 font-bold mt-2">* Required field</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 pb-20">
        {showSuccess && (
          <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-800 dark:bg-green-950/20 dark:text-green-400 text-sm font-semibold rounded-xl shadow-sm flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            Order created successfully and catalogued in the production database!
          </div>
        )}

        {errors.submit && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 dark:bg-red-950/20 dark:text-red-400 text-sm font-semibold rounded-xl shadow-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            {errors.submit}
          </div>
        )}

        {/* SECTION 1: Core Logistics */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800 tracking-wide uppercase">
            1. Administrative & Shipping Info
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* SIGI Order Number */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                SIGI Order Number *
              </label>
              <input
                type="text"
                value={sigiOrderNumber}
                onChange={(e) => setSigiOrderNumber(e.target.value)}
                placeholder="e.g. SIGI-2026-105"
                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white ${
                  errors.sigiOrderNumber ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-800'
                }`}
              />
              {errors.sigiOrderNumber && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.sigiOrderNumber}
                </p>
              )}
            </div>

            {/* Client Code */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                Client Code *
              </label>
              <input
                type="text"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                placeholder="e.g. MYS-01"
                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white ${
                  errors.clientCode ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'
                }`}
              />
              {errors.clientCode && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.clientCode}
                </p>
              )}
            </div>

            {/* Order Date */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                Order Receipt Date *
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white ${
                  errors.orderDate ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'
                }`}
              />
              {errors.orderDate && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.orderDate}
                </p>
              )}
            </div>

            {/* Expected Shipping Date */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                Expected Shipping Date *
              </label>
              <input
                type="date"
                value={expectedShippingDate}
                onChange={(e) => setExpectedShippingDate(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white ${
                  errors.expectedShippingDate ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'
                }`}
              />
              {errors.expectedShippingDate && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.expectedShippingDate}
                </p>
              )}
            </div>

            {/* Client Order Reference */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                Client Order Reference (PO Number)
              </label>
              <input
                type="text"
                value={clientOrderRef}
                onChange={(e) => setClientOrderRef(e.target.value)}
                placeholder="e.g. PO-90812"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white"
              />
            </div>

            {/* Urgent Tag */}
            <div className="flex items-center gap-3 pt-8">
              <input
                type="checkbox"
                id="urgentForm"
                checked={urgent}
                onChange={(e) => setUrgent(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-800 text-blue-600 focus:ring-blue-500 focus:outline-none"
              />
              <label htmlFor="urgentForm" className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                Mark as URGENT (Expedites all workshop stages)
              </label>
            </div>

          </div>
        </div>

        {/* SECTION 2: Jewelry Specifications */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-wide uppercase">
              2. Design & Material Specifications
            </h3>
            <button
              type="button"
              onClick={handleAddSpec}
              className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Specification Row
            </button>
          </div>

          <div className="space-y-10 divide-y divide-gray-200 dark:divide-gray-800">
            {specs.map((spec, index) => (
              <div key={index} className={`space-y-6 ${index > 0 ? 'pt-10' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full uppercase tracking-wider text-[11px]">
                    Specification Item #{index + 1}
                  </span>
                  {specs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(index)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Row
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Style Number */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      SIGI Style Number *
                    </label>
                    <input
                      type="text"
                      value={spec.sigiStyleNumber}
                      onChange={(e) => handleUpdateSpec(index, 'sigiStyleNumber', e.target.value)}
                      placeholder="e.g. RG-1082"
                      className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white ${
                        errors[`spec_${index}_style`] ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-800'
                      }`}
                    />
                    {errors[`spec_${index}_style`] && (
                      <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors[`spec_${index}_style`]}
                      </p>
                    )}
                  </div>

                  {/* SKU Number */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      SIGI SKU Number *
                    </label>
                    <input
                      type="text"
                      value={spec.sigiSkuNumber}
                      onChange={(e) => handleUpdateSpec(index, 'sigiSkuNumber', e.target.value)}
                      placeholder="e.g. RG-1082-Y18"
                      className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white ${
                        errors[`spec_${index}_sku`] ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-800'
                      }`}
                    />
                    {errors[`spec_${index}_sku`] && (
                      <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {errors[`spec_${index}_sku`]}
                      </p>
                    )}
                  </div>

                  {/* Metal Type */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      Precious Metal Type *
                    </label>
                    <select
                      value={spec.metalType}
                      onChange={(e) => handleUpdateSpec(index, 'metalType', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white"
                    >
                      {metalTypesList.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ring Size */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      Ring Size
                    </label>
                    <input
                      type="text"
                      value={spec.ringSize}
                      onChange={(e) => handleUpdateSpec(index, 'ringSize', e.target.value)}
                      placeholder="e.g. 6.5 (Write N/A if pendant/earrings)"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white"
                    />
                  </div>

                  {/* Center Stone Size */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      Center Stone Carat Size
                    </label>
                    <input
                      type="text"
                      value={spec.centerStoneSize}
                      onChange={(e) => handleUpdateSpec(index, 'centerStoneSize', e.target.value)}
                      placeholder="e.g. 1.50 ct"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white"
                    />
                  </div>

                  {/* Center Stone Shape */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      Center Stone Shape
                    </label>
                    <select
                      value={spec.centerStoneShape}
                      onChange={(e) => handleUpdateSpec(index, 'centerStoneShape', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white"
                    >
                      <option value="">Select shape...</option>
                      {centerStoneShapesList.map((shape) => (
                        <option key={shape} value={shape}>{shape}</option>
                      ))}
                    </select>
                  </div>

                  {/* Stamp Laser text */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      Laser / Stamp Logo text
                    </label>
                    <input
                      type="text"
                      value={spec.stampLaser}
                      onChange={(e) => handleUpdateSpec(index, 'stampLaser', e.target.value)}
                      placeholder="e.g. '18K & SIGI' / 'PLAT950'"
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white"
                    />
                  </div>

                  {/* Production Notes */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      Notes for Factory
                    </label>
                    <textarea
                      rows={2}
                      value={spec.productionNotes || ''}
                      onChange={(e) => handleUpdateSpec(index, 'productionNotes', e.target.value)}
                      placeholder="Production details: e.g. halo width, prong thickness, diamond quality, side stones specs..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Individual Photographic Reference Uploads */}
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                    Photographic Reference Uploads (Item #{index + 1})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Style Picture Upload */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400">Style Picture Reference</label>
                      <div 
                        onDragOver={(e) => { 
                          e.preventDefault(); 
                          setStyleDragOver(prev => ({ ...prev, [index]: true })); 
                        }}
                        onDragLeave={() => {
                          setStyleDragOver(prev => ({ ...prev, [index]: false })); 
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setStyleDragOver(prev => ({ ...prev, [index]: false })); 
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            const base64 = await fileToBase64(e.dataTransfer.files[0]);
                            handleUpdateSpec(index, 'stylePicture', base64);
                          }
                        }}
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition flex flex-col items-center justify-center min-h-[160px] cursor-pointer ${
                          styleDragOver[index] ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-800'
                        }`}
                        onClick={() => document.getElementById(`styleFileSelector_${index}`)?.click()}
                      >
                        <input 
                          type="file" 
                          id={`styleFileSelector_${index}`} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const base64 = await fileToBase64(e.target.files[0]);
                              handleUpdateSpec(index, 'stylePicture', base64);
                            }
                          }} 
                        />
                        
                        {spec.stylePicture ? (
                          <div className="relative group w-full">
                            <img src={spec.stylePicture} className="max-h-32 mx-auto rounded-lg object-contain bg-gray-50 p-2 border border-gray-100" referrerPolicy="no-referrer" />
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); handleUpdateSpec(index, 'stylePicture', ''); }}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs hover:bg-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 text-gray-400">
                            <Upload className="w-8 h-8 mx-auto text-blue-500" />
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Drag & Drop Style Image or Click</p>
                            <p className="text-[10px] text-gray-400">PNG, JPG, JPEG formats</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stone Picture Upload */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-400">Stone Picture Reference</label>
                      <div 
                        onDragOver={(e) => { 
                          e.preventDefault(); 
                          setStoneDragOver(prev => ({ ...prev, [index]: true })); 
                        }}
                        onDragLeave={() => {
                          setStoneDragOver(prev => ({ ...prev, [index]: false })); 
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setStoneDragOver(prev => ({ ...prev, [index]: false })); 
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            const base64 = await fileToBase64(e.dataTransfer.files[0]);
                            handleUpdateSpec(index, 'stonePicture', base64);
                          }
                        }}
                        className={`border-2 border-dashed rounded-xl p-4 text-center transition flex flex-col items-center justify-center min-h-[160px] cursor-pointer ${
                          stoneDragOver[index] ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-800'
                        }`}
                        onClick={() => document.getElementById(`stoneFileSelector_${index}`)?.click()}
                      >
                        <input 
                          type="file" 
                          id={`stoneFileSelector_${index}`} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const base64 = await fileToBase64(e.target.files[0]);
                              handleUpdateSpec(index, 'stonePicture', base64);
                            }
                          }} 
                        />
                        
                        {spec.stonePicture ? (
                          <div className="relative group w-full">
                            <img src={spec.stonePicture} className="max-h-32 mx-auto rounded-lg object-contain bg-gray-50 p-2 border border-gray-100" referrerPolicy="no-referrer" />
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); handleUpdateSpec(index, 'stonePicture', ''); }}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs hover:bg-red-700"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 text-gray-400">
                            <Upload className="w-8 h-8 mx-auto text-blue-500" />
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Drag & Drop Stone Image or Click</p>
                            <p className="text-[10px] text-gray-400">PNG, JPG, JPEG formats</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleAddSpec}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Another Specification Item
            </button>

            {/* Center Stone Required Tag */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="stoneRequiredForm"
                checked={centerStoneRequired}
                onChange={(e) => setCenterStoneRequired(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 dark:border-gray-800 text-blue-600 focus:ring-blue-500 focus:outline-none"
              />
              <label htmlFor="stoneRequiredForm" className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                Center Stone is Required (Factory must supply)
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 3: Factory Assignment & Volumes */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800 tracking-wide uppercase">
            3. Factory Scheduling & Quantities
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Factory Order Number */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                Factory Order Number
              </label>
              <input
                type="text"
                value={factoryOrderNumber}
                onChange={(e) => setFactoryOrderNumber(e.target.value)}
                placeholder="e.g. FAC-9081"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white"
              />
            </div>

            {/* Factory Serial Number */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                Factory Serial Number
              </label>
              <input
                type="text"
                value={factorySerialNumber}
                onChange={(e) => setFactorySerialNumber(e.target.value)}
                placeholder="e.g. SN-77610"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white"
              />
            </div>

            {/* Order Quantity */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                Order Quantity (Total pieces required) *
              </label>
              <input
                type="number"
                min="1"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(Number(e.target.value))}
                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white ${
                  errors.orderQuantity ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'
                }`}
              />
              {errors.orderQuantity && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.orderQuantity}
                </p>
              )}
            </div>

            {/* Items Completed */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                Items Completed (Completed pieces)
              </label>
              <input
                type="number"
                min="0"
                value={itemsCompleted}
                onChange={(e) => setItemsCompleted(Number(e.target.value))}
                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white ${
                  errors.itemsCompleted ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'
                }`}
              />
              {errors.itemsCompleted && (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> {errors.itemsCompleted}
                </p>
              )}
              {orderQuantity - itemsCompleted >= 0 && (
                <p className="text-xs text-gray-500 font-medium">
                  Dynamic balance to manufacture: <strong className="text-blue-600 dark:text-blue-400">{orderQuantity - itemsCompleted} pcs</strong>
                </p>
              )}
            </div>

          </div>
        </div>

        {/* SECTION 4: Notes & Remarks */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-800 tracking-wide uppercase">
            4. Remarks & Factory Instructions
          </h3>

          <div className="space-y-4">
            
            {/* Factory Notes */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                Factory Instructions Notes (Internal)
              </label>
              <textarea
                value={factoryNotes}
                onChange={(e) => setFactoryNotes(e.target.value)}
                rows={3}
                placeholder="Write specific metal crafting notes or center stone matching specs..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white resize-none"
              />
            </div>

            {/* General Remarks */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                General Remarks / Delivery Notes
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                placeholder="Enter client shipping preferences, courier accounts, or stage warnings..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white resize-none"
              />
            </div>

            {/* Custom fields: Stone Weight & Admin Return Sign */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  Stone Weight
                </label>
                <input
                  type="text"
                  value={stoneWeight}
                  onChange={(e) => setStoneWeight(e.target.value)}
                  placeholder="e.g. 1.25 ct, 0.45 g"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  Admin Return Sign
                </label>
                <input
                  type="text"
                  value={adminReturnSign}
                  onChange={(e) => setAdminReturnSign(e.target.value)}
                  placeholder="e.g. SJ (Approved)"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:text-white text-sm"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Form Controls Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 border border-gray-300 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-950 transition duration-150 cursor-pointer"
          >
            Reset Form
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition duration-150 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Submitting Record...' : 'Submit Jewelry Record'}
          </button>
        </div>

      </form>
    </div>
  );
}
