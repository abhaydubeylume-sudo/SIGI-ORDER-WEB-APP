import React, { useState, useEffect } from 'react';
import { Order, StageName, ProductionStage, User, OrderAttachment, ActivityLog } from '../types';
import { getExpandedEntries, getTodayDateStr, ExpandedEntry } from '../utils';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit3, 
  Flame, 
  X, 
  Upload, 
  Plus, 
  Minus,
  Check,
  RefreshCw,
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Paperclip, 
  FileText, 
  TrendingUp, 
  ChevronRight, 
  Settings,
  HelpCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';

const DEFAULT_STYLE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none"><circle cx="50" cy="65" r="22" stroke="%2364748b" stroke-width="4"/><path d="M50 43 L40 33 L50 23 L60 33 Z" fill="%2393c5fd" stroke="%232563eb" stroke-width="2"/><circle cx="50" cy="33" r="3" fill="%23ffffff" stroke="%232563eb"/><path d="M43 43 L57 43" stroke="%232563eb" stroke-width="2"/></svg>`;
const DEFAULT_STONE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none"><path d="M20 35 L35 15 L65 15 L80 35 L50 85 Z" fill="%23dbeafe" stroke="%232563eb" stroke-width="2"/><path d="M35 15 L50 35 M65 15 L50 35 M20 35 L50 35 M80 35 L50 35 M35 15 L65 15 M50 35 L50 85 M20 35 L50 85 M80 35 L50 85" stroke="%233b82f6" stroke-width="1"/></svg>`;

interface OrderTableViewProps {
  orders: Order[];
  onOrderUpdated: (updatedOrder: Order) => void;
  onOrderDeleted: (sigiOrderNumber: string) => void;
  currentUser: User;
  initialFilters?: {
    status?: string;
    stage?: string;
    urgent?: string;
    shippingDate?: string;
  };
}

export default function OrderTableView({
  orders,
  onOrderUpdated,
  onOrderDeleted,
  currentUser,
  initialFilters
}: OrderTableViewProps) {
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedMetal, setSelectedMetal] = useState('');
  const [selectedUrgent, setSelectedUrgent] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Drawer details active order
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [activeTabInDrawer, setActiveTabInDrawer] = useState<'details' | 'stages' | 'attachments' | 'history'>('details');

  const [localCompletedQty, setLocalCompletedQty] = useState<string>('');
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; title: string } | null>(null);

  // Temporary states for inline editing of production notes
  const [tempNotes, setTempNotes] = useState<string | null>(null);

  // Sync / Reset notes when active item focus changes
  useEffect(() => {
    setTempNotes(null);
  }, [selectedItemIndex, selectedOrder]);

  const getBaseOrderNumber = (num: string) => num.replace(/-\d+$/, '');
  const getSuffixNumber = (num: string) => {
    const match = num.match(/-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const drawerSiblings = React.useMemo(() => {
    if (!selectedOrder) return [];
    const baseNum = getBaseOrderNumber(selectedOrder.sigiOrderNumber);
    const siblings = orders.filter(o => getBaseOrderNumber(o.sigiOrderNumber) === baseNum);
    return [...siblings].sort((a, b) => getSuffixNumber(a.sigiOrderNumber) - getSuffixNumber(b.sigiOrderNumber));
  }, [selectedOrder?.sigiOrderNumber, orders]);

  const displayItems = React.useMemo(() => {
    if (!selectedOrder) return [];
    
    // If it's a split order with siblings, map each sibling as an item
    if (drawerSiblings.length > 1) {
      return drawerSiblings.map((sibling, idx) => ({
        type: 'sibling' as const,
        id: sibling.sigiOrderNumber,
        label: `Item #${idx + 1} (${sibling.sigiOrderNumber})`,
        status: sibling.status,
        currentStage: sibling.currentStage,
        sigiStyleNumber: sibling.sigiStyleNumber || '—',
        sigiSkuNumber: sibling.sigiSkuNumber || '—',
        metalType: sibling.metalType || '—',
        ringSize: sibling.ringSize || '—',
        centerStoneSize: sibling.centerStoneSize || '—',
        centerStoneShape: sibling.centerStoneShape || '—',
        stampLaser: sibling.stampLaser || '—',
        stylePicture: sibling.stylePicture,
        stonePicture: sibling.stonePicture,
        productionNotes: sibling.productionNotes || '—',
        order: sibling, // Reference to actual Order object
        index: idx
      }));
    }
    
    // Otherwise, if the order itself has explicit specs array
    if (selectedOrder.specs && selectedOrder.specs.length > 0) {
      return selectedOrder.specs.map((spec, idx) => ({
        type: 'spec' as const,
        id: `${selectedOrder.sigiOrderNumber}-spec-${idx}`,
        label: `Item #${idx + 1}`,
        status: idx < selectedOrder.itemsCompleted ? 'Completed' : 'Pending',
        currentStage: idx < selectedOrder.itemsCompleted ? 'Shipping' : 'None',
        sigiStyleNumber: spec.sigiStyleNumber || selectedOrder.sigiStyleNumber || '—',
        sigiSkuNumber: spec.sigiSkuNumber || selectedOrder.sigiSkuNumber || '—',
        metalType: spec.metalType || selectedOrder.metalType || '—',
        ringSize: spec.ringSize || selectedOrder.ringSize || '—',
        centerStoneSize: spec.centerStoneSize || selectedOrder.centerStoneSize || '—',
        centerStoneShape: spec.centerStoneShape || selectedOrder.centerStoneShape || '—',
        stampLaser: spec.stampLaser || selectedOrder.stampLaser || '—',
        stylePicture: spec.stylePicture || selectedOrder.stylePicture,
        stonePicture: spec.stonePicture || selectedOrder.stonePicture,
        productionNotes: spec.productionNotes || selectedOrder.productionNotes || '—',
        order: selectedOrder,
        index: idx
      }));
    }
    
    // Otherwise, just the single order details as a single item
    return [{
      type: 'single' as const,
      id: selectedOrder.sigiOrderNumber,
      label: `Item #1 (${selectedOrder.sigiOrderNumber})`,
      status: selectedOrder.status,
      currentStage: selectedOrder.currentStage,
      sigiStyleNumber: selectedOrder.sigiStyleNumber || '—',
      sigiSkuNumber: selectedOrder.sigiSkuNumber || '—',
      metalType: selectedOrder.metalType || '—',
      ringSize: selectedOrder.ringSize || '—',
      centerStoneSize: selectedOrder.centerStoneSize || '—',
      centerStoneShape: selectedOrder.centerStoneShape || '—',
      stampLaser: selectedOrder.stampLaser || '—',
      stylePicture: selectedOrder.stylePicture,
      stonePicture: selectedOrder.stonePicture,
      productionNotes: selectedOrder.productionNotes || '—',
      order: selectedOrder,
      index: 0
    }];
  }, [selectedOrder, drawerSiblings]);

  // Sync with selectedOrder when it changes
  useEffect(() => {
    if (selectedOrder) {
      setLocalCompletedQty(String(selectedOrder.itemsCompleted));
      
      const maxQty = drawerSiblings.length > 1 ? drawerSiblings.length : (selectedOrder.orderQuantity || 1);
      if (selectedItemIndex === null || selectedItemIndex >= maxQty) {
        // Find focused sibling index
        const focusedIdx = drawerSiblings.length > 1 
          ? drawerSiblings.findIndex(o => o.sigiOrderNumber === selectedOrder.sigiOrderNumber) 
          : 0;
        setSelectedItemIndex(focusedIdx >= 0 ? focusedIdx : 0);
      }
    }
  }, [selectedOrder?.sigiOrderNumber, selectedOrder?.itemsCompleted, drawerSiblings]);

  // Sync with initialFilters prop
  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.status !== undefined) setSelectedStatus(initialFilters.status);
      else setSelectedStatus('');
      
      if (initialFilters.stage !== undefined) setSelectedStage(initialFilters.stage);
      else setSelectedStage('');
      
      if (initialFilters.urgent !== undefined) setSelectedUrgent(initialFilters.urgent);
      else setSelectedUrgent('');
      
      if (initialFilters.shippingDate !== undefined) setSearchTerm(initialFilters.shippingDate);
      else setSearchTerm('');
      
      setShowFilters(true);
    }
  }, [initialFilters]);

  // Attachment upload helper state
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentType, setAttachmentType] = useState('CAD File');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDeletionKeys, setSelectedDeletionKeys] = useState<string[]>([]);

  // Photo upload helper states
  const [styleDragOver, setStyleDragOver] = useState(false);
  const [stoneDragOver, setStoneDragOver] = useState(false);

  // Custom dialog state for blocking-free confirms/alerts in iframe environments
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  const customAlert = (message: string, title: string = "Notice / Restriction Warning") => {
    setAlertDialog({
      isOpen: true,
      title,
      message
    });
  };

  const fileToBase64Helper = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = err => reject(err);
    });
  };

  const handlePictureUpdate = async (field: 'stylePicture' | 'stonePicture', base64Data: string) => {
    if (!selectedOrder) return;

    const updatedOrderPayload = {
      ...selectedOrder,
      [field]: base64Data || (field === 'stylePicture' ? DEFAULT_STYLE_SVG : DEFAULT_STONE_SVG),
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
    };

    try {
      const response = await fetch(`/api/orders/${selectedOrder.sigiOrderNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrderPayload)
      });

      if (response.ok) {
        const resultOrder = await response.json();
        onOrderUpdated(resultOrder);
        setSelectedOrder(resultOrder);
      }
    } catch (err) {
      console.error("Failed to update picture reference:", err);
    }
  };

  const handleSpecPictureUpdate = async (specIdx: number, field: 'stylePicture' | 'stonePicture', base64Data: string) => {
    if (!selectedOrder) return;

    const updatedSpecs = selectedOrder.specs ? [...selectedOrder.specs] : [];
    if (updatedSpecs[specIdx]) {
      updatedSpecs[specIdx] = {
        ...updatedSpecs[specIdx],
        [field]: base64Data
      };
    }

    const updatedOrderPayload = {
      ...selectedOrder,
      specs: updatedSpecs,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
    };

    try {
      const response = await fetch(`/api/orders/${selectedOrder.sigiOrderNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrderPayload)
      });

      if (response.ok) {
        const resultOrder = await response.json();
        onOrderUpdated(resultOrder);
        setSelectedOrder(resultOrder);
      }
    } catch (err) {
      console.error("Failed to update spec picture reference:", err);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'stylePicture' | 'stonePicture') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64Helper(file);
        await handlePictureUpdate(field, base64);
      } catch (err) {
        console.error("Failed to upload image", err);
      }
    }
  };

  const handleSiblingPictureUpdate = async (siblingOrder: Order, field: 'stylePicture' | 'stonePicture', base64Data: string) => {
    const updatedOrderPayload = {
      ...siblingOrder,
      [field]: base64Data,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
    };
    try {
      const response = await fetch(`/api/orders/${siblingOrder.sigiOrderNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrderPayload)
      });
      if (response.ok) {
        const resultOrder = await response.json();
        onOrderUpdated(resultOrder);
        // If the updated sibling order is the one currently open, sync selectedOrder as well!
        if (selectedOrder && selectedOrder.sigiOrderNumber === siblingOrder.sigiOrderNumber) {
          setSelectedOrder(resultOrder);
        }
      }
    } catch (err) {
      console.error("Failed to upload sibling image", err);
    }
  };

  const onDisplayItemFileChange = async (e: React.ChangeEvent<HTMLInputElement>, item: any, field: 'stylePicture' | 'stonePicture') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64Helper(file);
        if (item.type === 'sibling') {
          await handleSiblingPictureUpdate(item.order, field, base64);
        } else {
          await handleSpecPictureUpdate(item.index, field, base64);
        }
      } catch (err) {
        console.error("Failed to upload display item image", err);
      }
    }
  };

  // Unique clients and metals list for filters
  const expandedEntries = getExpandedEntries(orders);
  const clientsList = Array.from(new Set(expandedEntries.map(e => e.clientCode).filter(Boolean)));
  const metalsList = Array.from(new Set(expandedEntries.map(e => e.metalType).filter(Boolean)));
  const stagesList: StageName[] = ['CAD', 'Casting', 'Filing', 'Selection', 'Setting', 'QC', 'Packing', 'Shipping'];
  
  // Clean state helper for filters reset
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedClient('');
    setSelectedMetal('');
    setSelectedUrgent('');
    setSelectedStage('');
    setSelectedStatus('');
    setSelectedMonth('');
    setSelectedYear('');
  };

  // Filter & Search Logic
  const filteredEntries = expandedEntries.filter((e) => {
    // 1. Search Bar
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      const matchNumber = (e.sigiOrderNumber || '').toLowerCase().includes(s);
      const matchClient = (e.clientCode || '').toLowerCase().includes(s);
      const matchSku = (e.sigiSkuNumber || '').toLowerCase().includes(s);
      const matchStyle = (e.sigiStyleNumber || '').toLowerCase().includes(s);
      const matchFacOrd = (e.factoryOrderNumber || '').toLowerCase().includes(s);
      const matchFacSer = (e.factorySerialNumber || '').toLowerCase().includes(s);
      const matchClientRef = (e.clientOrderRef || '').toLowerCase().includes(s);
      const matchNotes = (e.productionNotes || '').toLowerCase().includes(s) || (e.factoryNotes || '').toLowerCase().includes(s);
      const matchRemarks = (e.remarks || '').toLowerCase().includes(s);
      if (!matchNumber && !matchClient && !matchSku && !matchStyle && !matchFacOrd && !matchFacSer && !matchClientRef && !matchNotes && !matchRemarks) {
        return false;
      }
    }

    // 2. Client Code
    if (selectedClient && e.clientCode !== selectedClient) return false;

    // 3. Metal Type
    if (selectedMetal && e.metalType !== selectedMetal) return false;

    // 4. Urgent
    if (selectedUrgent) {
      const isUrgent = selectedUrgent === 'Yes';
      if (e.urgent !== isUrgent) return false;
    }

    // 5. Stage
    if (selectedStage) {
      if (e.currentStage !== selectedStage) return false;
    }

    // 6. Status
    if (selectedStatus && e.status !== selectedStatus) return false;

    // 7. Month & Year on expectedShippingDate
    if (e.expectedShippingDate) {
      const date = new Date(e.expectedShippingDate);
      const month = (date.getMonth() + 1).toString();
      const year = date.getFullYear().toString();

      if (selectedMonth && month !== selectedMonth) return false;
      if (selectedYear && year !== selectedYear) return false;
    }

    return true;
  });

  // Find all selected entries for deletion via table checkboxes
  const selectedEntriesForDeletion = expandedEntries.filter(e => selectedDeletionKeys.includes(e.key));

  // Calculate days remaining
  const getDaysRemainingStr = (shippingDate: string, orderStatus: string) => {
    if (orderStatus === 'Completed') return 'Completed';
    if (!shippingDate) return 'N/A';
    
    const today = new Date(getTodayDateStr());
    const target = new Date(shippingDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} Days Overdue`;
    } else if (diffDays === 0) {
      return 'Due Today';
    } else {
      return `${diffDays} Days Left`;
    }
  };

  // Progress Bar styling (Green, Yellow, Red)
  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage > 40) return 'bg-blue-500';
    if (percentage > 0) return 'bg-yellow-500';
    return 'bg-gray-200';
  };

  // Dynamic Status Badge Theme
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-900/30';
      case 'Past Due':
        return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/30';
      case 'Due Soon':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900/30';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }
  };

  // Handle stage status and meta updates
  const handleStageUpdate = async (stage: StageName, field: keyof ProductionStage, value: any) => {
    if (!selectedOrder) return;

    const updatedStages = {
      ...selectedOrder.stages,
      [stage]: {
        ...selectedOrder.stages[stage],
        [field]: value,
        updatedBy: currentUser.name,
      }
    };

    // If a stage completedDate is blank but status is set to Completed, prefill with ERP Today
    if (field === 'status' && value === 'Completed' && !updatedStages[stage].completedDate) {
      updatedStages[stage].completedDate = getTodayDateStr();
    }
    // If a stage startedDate is blank but status is In Progress, prefill
    if (field === 'status' && value === 'In Progress' && !updatedStages[stage].startedDate) {
      updatedStages[stage].startedDate = getTodayDateStr();
    }

    const updatedOrderPayload = {
      ...selectedOrder,
      stages: updatedStages,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
    };

    try {
      const response = await fetch(`/api/orders/${selectedOrder.sigiOrderNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrderPayload)
      });

      if (response.ok) {
        const resultOrder = await response.json();
        onOrderUpdated(resultOrder);
        setSelectedOrder(resultOrder);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle completion of a specific item by index
  const handleToggleItemCompletion = async (itemIndex: number, isCompleted: boolean) => {
    if (!selectedOrder) return;

    const qty = selectedOrder.orderQuantity || 1;
    const currentCompletions = selectedOrder.completedItems && Array.isArray(selectedOrder.completedItems)
      ? [...selectedOrder.completedItems]
      : Array.from({ length: qty }, (_, i) => i < selectedOrder.itemsCompleted);

    while (currentCompletions.length < qty) {
      currentCompletions.push(false);
    }

    currentCompletions[itemIndex] = isCompleted;
    const newItemsCompleted = currentCompletions.filter(Boolean).length;

    const updatedOrderPayload = {
      ...selectedOrder,
      completedItems: currentCompletions,
      itemsCompleted: newItemsCompleted,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
    };

    try {
      const response = await fetch(`/api/orders/${selectedOrder.sigiOrderNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrderPayload)
      });

      if (response.ok) {
        const resultOrder = await response.json();
        onOrderUpdated(resultOrder);
        setSelectedOrder(resultOrder);
      }
    } catch (err) {
      console.error("Failed to toggle item completion:", err);
    }
  };

  const handleToggleSiblingCompletion = async (siblingOrder: Order, isCompleted: boolean) => {
    const updatedOrderPayload = {
      ...siblingOrder,
      status: isCompleted ? 'Completed' : 'In Progress',
      itemsCompleted: isCompleted ? 1 : 0,
      balanceQuantity: isCompleted ? 0 : 1,
      productionPercentage: isCompleted ? 100 : 0,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
    };
    try {
      const response = await fetch(`/api/orders/${siblingOrder.sigiOrderNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrderPayload)
      });
      if (response.ok) {
        const resultOrder = await response.json();
        onOrderUpdated(resultOrder);
        setSelectedOrder(resultOrder);
      }
    } catch (err) {
      console.error("Failed to toggle sibling completion:", err);
    }
  };

  // Quick edit items completed (directly update balance)
  const handleItemsCompletedUpdate = async (completedQty: number) => {
    if (!selectedOrder) return;

    if (completedQty < 0 || completedQty > selectedOrder.orderQuantity) {
      customAlert('Items completed cannot be negative or exceed order quantity.', 'Validation Error');
      return;
    }

    const qty = selectedOrder.orderQuantity || 1;
    let currentCompletions = selectedOrder.completedItems && Array.isArray(selectedOrder.completedItems)
      ? [...selectedOrder.completedItems]
      : Array.from({ length: qty }, (_, i) => i < selectedOrder.itemsCompleted);

    while (currentCompletions.length < qty) {
      currentCompletions.push(false);
    }

    const currentTrueCount = currentCompletions.filter(Boolean).length;

    if (completedQty > currentTrueCount) {
      // Prioritize completing the currently focused selectedItemIndex if it is not completed yet
      if (selectedItemIndex !== null && selectedItemIndex < qty && !currentCompletions[selectedItemIndex]) {
        currentCompletions[selectedItemIndex] = true;
      }
      let needed = completedQty - currentCompletions.filter(Boolean).length;
      for (let i = 0; i < qty && needed > 0; i++) {
        if (!currentCompletions[i]) {
          currentCompletions[i] = true;
          needed--;
        }
      }
    } else if (completedQty < currentTrueCount) {
      // Prioritize setting the currently focused selectedItemIndex to In Progress if it is completed
      if (selectedItemIndex !== null && selectedItemIndex < qty && currentCompletions[selectedItemIndex]) {
        currentCompletions[selectedItemIndex] = false;
      }
      let toRemove = currentCompletions.filter(Boolean).length - completedQty;
      for (let i = qty - 1; i >= 0 && toRemove > 0; i--) {
        if (currentCompletions[i]) {
          currentCompletions[i] = false;
          toRemove--;
        }
      }
    }

    const finalCompletedQty = currentCompletions.filter(Boolean).length;

    const updatedOrderPayload = {
      ...selectedOrder,
      itemsCompleted: finalCompletedQty,
      completedItems: currentCompletions,
      operatorName: currentUser.name,
      operatorRole: currentUser.role,
    };

    try {
      const response = await fetch(`/api/orders/${selectedOrder.sigiOrderNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrderPayload)
      });

      if (response.ok) {
        const resultOrder = await response.json();
        onOrderUpdated(resultOrder);
        setSelectedOrder(resultOrder);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save updated production notes for specific focused items
  const handleSaveProductionNotes = async (item: any) => {
    if (!selectedOrder) return;
    
    const prodNotes = tempNotes !== null ? tempNotes : (item.productionNotes || '');

    let updatedPayload: any = { ...selectedOrder };

    if (item.type === 'spec') {
      const updatedSpecs = selectedOrder.specs ? [...selectedOrder.specs] : [];
      if (updatedSpecs[item.index]) {
        updatedSpecs[item.index] = {
          ...updatedSpecs[item.index],
          productionNotes: prodNotes
        };
      }
      updatedPayload.specs = updatedSpecs;
      if (item.index === 0) {
        updatedPayload.productionNotes = prodNotes;
      }
    } else if (item.type === 'sibling') {
      const siblingOrder = item.order;
      try {
        const response = await fetch(`/api/orders/${siblingOrder.sigiOrderNumber}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...siblingOrder,
            productionNotes: prodNotes,
            operatorName: currentUser.name,
            operatorRole: currentUser.role
          })
        });
        if (response.ok) {
          const resultSibling = await response.json();
          onOrderUpdated(resultSibling);
          const freshOrders = await fetch('/api/orders').then(r => r.json());
          const freshParent = freshOrders.find((o: any) => o.sigiOrderNumber === selectedOrder.sigiOrderNumber);
          if (freshParent) {
            setSelectedOrder(freshParent);
          }
          setTempNotes(null);
        }
      } catch (err) {
        console.error(err);
      }
      return;
    } else {
      updatedPayload.productionNotes = prodNotes;
      if (updatedPayload.specs && updatedPayload.specs.length > 0) {
        updatedPayload.specs[0] = {
          ...updatedPayload.specs[0],
          productionNotes: prodNotes
        };
      }
    }

    updatedPayload.operatorName = currentUser.name;
    updatedPayload.operatorRole = currentUser.role;

    try {
      const response = await fetch(`/api/orders/${selectedOrder.sigiOrderNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });

      if (response.ok) {
        const resultOrder = await response.json();
        onOrderUpdated(resultOrder);
        setSelectedOrder(resultOrder);
        setTempNotes(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Attachment uploading
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedOrder) return;
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      const file = e.target.files[0];
      
      const fileToBase64 = (f: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(f);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = err => reject(err);
        });
      };

      try {
        const base64Data = await fileToBase64(file);
        const payload = {
          name: attachmentName.trim() || file.name,
          type: attachmentType,
          fileName: file.name,
          fileData: base64Data,
          operatorName: currentUser.name,
          operatorRole: currentUser.role
        };

        const response = await fetch(`/api/orders/${selectedOrder.sigiOrderNumber}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resultOrder = await response.json();
          onOrderUpdated(resultOrder);
          setSelectedOrder(resultOrder);
          setAttachmentName('');
        }
      } catch (err) {
        console.error("Failed to upload attachment", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Attachment deleting
  const handleAttachmentDelete = async (attachmentId: string) => {
    if (!selectedOrder) return;

    setConfirmDialog({
      isOpen: true,
      title: "Delete Attachment",
      message: "Are you sure you want to delete this attachment? This cannot be undone.",
      onConfirm: async () => {
        try {
          const response = await fetch(
            `/api/orders/${encodeURIComponent(selectedOrder.sigiOrderNumber)}/attachments/${encodeURIComponent(attachmentId)}?operatorName=${encodeURIComponent(currentUser.name)}&operatorRole=${encodeURIComponent(currentUser.role)}`,
            { method: 'DELETE' }
          );

          if (response.ok) {
            const resultOrder = await response.json();
            onOrderUpdated(resultOrder);
            setSelectedOrder(resultOrder);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Order or Entry Deleting (Only Admin)
  const handleDeleteEntry = async (entry: ExpandedEntry) => {
    if (currentUser.role !== 'Admin') {
      customAlert('Only Admin users can delete records.', 'Access Restricted');
      return;
    }

    const order = entry.parentOrder;
    const indexInOrder = entry.indexInOrder;

    // Determine if we are deleting the whole order or just one item/spec of a multi-item order
    const totalItems = order.orderQuantity || 1;
    const isMultiItem = totalItems > 1;

    if (!isMultiItem) {
      // Single item order - delete the whole order
      setConfirmDialog({
        isOpen: true,
        title: "CRITICAL DELETION WARNING",
        message: `Are you absolutely sure you want to delete Order '${entry.sigiOrderNumber}'? This removes it permanently from the ERP.`,
        onConfirm: async () => {
          try {
            const response = await fetch(`/api/orders/${encodeURIComponent(entry.sigiOrderNumber)}?operatorName=${encodeURIComponent(currentUser.name)}&operatorRole=${encodeURIComponent(currentUser.role)}`, {
              method: 'DELETE'
            });

            if (response.ok) {
              onOrderDeleted(entry.sigiOrderNumber);
              setSelectedOrder(null);
              setSelectedItemIndex(null);
              setSelectedDeletionKeys(prev => prev.filter(k => k !== entry.key));
            }
          } catch (err) {
            console.error(err);
          }
        }
      });
    } else {
      // Multi-item order - delete ONLY the chosen single item entry
      setConfirmDialog({
        isOpen: true,
        title: "DELETE SINGLE ENTRY WARNING",
        message: `Are you sure you want to delete this specific item entry (Index #${indexInOrder + 1}) from Order '${entry.sigiOrderNumber}'? The order quantity will be reduced to ${totalItems - 1}.`,
        onConfirm: async () => {
          try {
            // Reconstruct the updated order with this specific entry deleted
            const newOrderQuantity = Math.max(1, totalItems - 1);
            
            const currentSpecs = order.specs || [];
            const newSpecs = currentSpecs.filter((_, idx) => idx !== indexInOrder);

            const currentCompletedItems = order.completedItems && Array.isArray(order.completedItems)
              ? order.completedItems
              : Array.from({ length: totalItems }, (_, i) => i < order.itemsCompleted);
            
            const newCompletedItems = currentCompletedItems.filter((_, idx) => idx !== indexInOrder);
            const newItemsCompleted = newCompletedItems.filter(Boolean).length;

            const updatedOrder: any = {
              orderQuantity: newOrderQuantity,
              specs: newSpecs,
              completedItems: newCompletedItems,
              itemsCompleted: newItemsCompleted,
              operatorName: currentUser.name,
              operatorRole: currentUser.role
            };

            const response = await fetch(`/api/orders/${encodeURIComponent(entry.sigiOrderNumber)}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updatedOrder)
            });

            if (response.ok) {
              const savedOrder = await response.json();
              onOrderUpdated(savedOrder);
              setSelectedOrder(null);
              setSelectedItemIndex(null);
              setSelectedDeletionKeys(prev => prev.filter(k => k !== entry.key));
            }
          } catch (err) {
            console.error(err);
          }
        }
      });
    }
  };

  // Bulk delete selected entries
  const handleBulkDeleteEntries = async (entriesToDelete: ExpandedEntry[]) => {
    if (currentUser.role !== 'Admin') {
      customAlert('Only Admin users can delete records.', 'Access Restricted');
      return;
    }

    if (entriesToDelete.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: "BULK DELETION WARNING",
      message: `Are you absolutely sure you want to delete all ${entriesToDelete.length} selected entries? This will permanently remove them from the ERP.`,
      onConfirm: async () => {
        try {
          // Group entries by parent order (sigiOrderNumber) so we can delete or update safely
          const entriesByOrder: Record<string, ExpandedEntry[]> = {};
          entriesToDelete.forEach(entry => {
            const num = entry.parentOrder.sigiOrderNumber;
            if (!entriesByOrder[num]) {
              entriesByOrder[num] = [];
            }
            entriesByOrder[num].push(entry);
          });

          // Process each parent order sequentially to avoid write race conditions
          for (const [orderNumber, orderEntries] of Object.entries(entriesByOrder)) {
            const firstEntry = orderEntries[0];
            const parentOrder = firstEntry.parentOrder;
            const totalItemsInParent = parentOrder.orderQuantity || 1;

            if (orderEntries.length >= totalItemsInParent) {
              // Deleting ALL items of this parent order -> delete the entire order
              const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}?operatorName=${encodeURIComponent(currentUser.name)}&operatorRole=${encodeURIComponent(currentUser.role)}`, {
                method: 'DELETE'
              });
              if (response.ok) {
                onOrderDeleted(orderNumber);
              }
            } else {
              // Deleting SOME items of this parent order -> update with items removed
              const indicesToDelete = orderEntries.map(e => e.indexInOrder);
              
              const currentSpecs = parentOrder.specs || [];
              const newSpecs = currentSpecs.filter((_, idx) => !indicesToDelete.includes(idx));

              const currentCompletedItems = parentOrder.completedItems && Array.isArray(parentOrder.completedItems)
                ? parentOrder.completedItems
                : Array.from({ length: totalItemsInParent }, (_, i) => i < parentOrder.itemsCompleted);
              
              const newCompletedItems = currentCompletedItems.filter((_, idx) => !indicesToDelete.includes(idx));
              const newItemsCompleted = newCompletedItems.filter(Boolean).length;
              const newOrderQuantity = Math.max(1, totalItemsInParent - orderEntries.length);

              const updatedOrder: any = {
                orderQuantity: newOrderQuantity,
                specs: newSpecs,
                completedItems: newCompletedItems,
                itemsCompleted: newItemsCompleted,
                operatorName: currentUser.name,
                operatorRole: currentUser.role
              };

              const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedOrder)
              });

              if (response.ok) {
                const savedOrder = await response.json();
                onOrderUpdated(savedOrder);
              }
            }
          }

          // Clear selection & reset detail views
          setSelectedDeletionKeys([]);
          setSelectedOrder(null);
          setSelectedItemIndex(null);
        } catch (err) {
          console.error("Failed bulk deletion:", err);
          customAlert("An error occurred during bulk deletion.", "Deletion Error");
        }
      }
    });
  };

  return (
    <div className="flex flex-1 overflow-hidden h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      
      {/* Central Interactive Grid */}
      <div className={`flex flex-col overflow-hidden transition-all duration-200 ${
        isEnlarged 
          ? 'fixed inset-0 z-40 bg-white dark:bg-gray-950 p-8 h-screen w-screen' 
          : 'flex-1 p-6 space-y-6'
      }`}>
        
        {/* Top Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              SIGI Order Master
              {isEnlarged && (
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded-full">
                  Enlarged View
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Search and filter active jewelry casting pipelines and dispatch metrics.</p>
          </div>

          <div className="flex items-center gap-2">
            {selectedEntriesForDeletion.length > 0 && currentUser.role === 'Admin' && (
              <button
                onClick={() => handleBulkDeleteEntries(selectedEntriesForDeletion)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white border border-red-600 hover:border-red-700 shadow-sm transition duration-150 cursor-pointer flex items-center gap-1.5 animate-fadeIn"
                title={`Delete ${selectedEntriesForDeletion.length} selected entries`}
              >
                <Trash2 className="w-4 h-4" />
                {selectedEntriesForDeletion.length === 1 ? (
                  <>
                    Delete Chosen Entry: <span className="font-mono bg-red-700 px-1.5 py-0.5 rounded ml-0.5">{selectedEntriesForDeletion[0].sigiOrderNumber}</span> (Index #{selectedEntriesForDeletion[0].indexInOrder + 1})
                  </>
                ) : (
                  <>
                    Delete Selected ({selectedEntriesForDeletion.length} entries)
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setIsEnlarged(!isEnlarged)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950 transition duration-150 cursor-pointer flex items-center gap-1.5"
              title={isEnlarged ? "Shrink View" : "Enlarge View"}
            >
              {isEnlarged ? (
                <>
                  <Minimize2 className="w-4 h-4 text-amber-600" />
                  Shrink View
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-blue-600" />
                  Enlarge View
                </>
              )}
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                showFilters 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-950'
              }`}
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filter Panel' : 'Show Advanced Filters'}
            </button>

            <button
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950 transition duration-150 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Live Search Input Panel */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Live search by Order #, Client code, SKU, Style, Factory Serial or Order Reference..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm shadow-sm transition duration-150"
          />
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 animate-fadeIn">
            
            {/* Client Code */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Client</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">All Clients</option>
                {clientsList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Metal Type */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Metal</label>
              <select
                value={selectedMetal}
                onChange={(e) => setSelectedMetal(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">All Metals</option>
                {metalsList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Casting Stage</label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">All Stages</option>
                {stagesList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">ERP Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Past Due">Past Due</option>
                <option value="Due Soon">Due Soon</option>
                <option value="On Track">On Track</option>
              </select>
            </div>

            {/* Urgent */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Urgent</label>
              <select
                value={selectedUrgent}
                onChange={(e) => setSelectedUrgent(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">All Priorities</option>
                <option value="Yes">Urgent Only</option>
                <option value="No">Standard Only</option>
              </select>
            </div>

            {/* Month */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Ship Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Ship Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">All Years</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>

          </div>
        )}

        {/* Master Data Grid Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[4200px]">
              
              <thead className="bg-gray-50 dark:bg-gray-950 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest sticky top-0 border-b border-gray-100 dark:border-gray-800 z-10">
                <tr>
                  <th className="px-4 py-3 text-center sticky left-0 bg-gray-50 dark:bg-gray-950 z-20 border-r border-gray-100 dark:border-gray-800 w-16">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500">All</span>
                      <input
                        type="checkbox"
                        checked={filteredEntries.length > 0 && filteredEntries.every(entry => selectedDeletionKeys.includes(entry.key))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            // Select all currently filtered entries
                            const newKeys = Array.from(new Set([...selectedDeletionKeys, ...filteredEntries.map(entry => entry.key)]));
                            setSelectedDeletionKeys(newKeys);
                          } else {
                            // Deselect all currently filtered entries
                            const filteredKeys = filteredEntries.map(entry => entry.key);
                            setSelectedDeletionKeys(selectedDeletionKeys.filter(k => !filteredKeys.includes(k)));
                          }
                        }}
                        className="w-3.5 h-3.5 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 cursor-pointer"
                        title="Select or deselect all filtered rows"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-4">Order Date</th>
                  <th className="px-4 py-4">Expected Shipping Date</th>
                  <th className="px-4 py-4">SIGI ORDER #</th>
                  <th className="px-4 py-4">Client Code</th>
                  <th className="px-4 py-4 text-center">Urgent</th>
                  <th className="px-4 py-4">SIGI Style #</th>
                  <th className="px-4 py-4">SIGI SKU #</th>
                  <th className="px-4 py-4">Metal Type</th>
                  <th className="px-4 py-4 text-center">Style Pictures</th>
                  <th className="px-4 py-4">Ring Size</th>
                  <th className="px-4 py-4">Center Stone Size & Shape</th>
                  <th className="px-4 py-4 text-center">Stone Picture</th>
                  <th className="px-4 py-4 text-center">Center Stone To Set?</th>
                  <th className="px-4 py-4">Notes For Factory</th>
                  <th className="px-4 py-4">Stamp / Laser</th>
                  <th className="px-4 py-4">Order Shipped On</th>
                  <th className="px-4 py-4">Client Order Ref. #</th>
                  <th className="px-4 py-4 text-center">Factory Order</th>
                  <th className="px-4 py-4">Factory Order #</th>
                  <th className="px-4 py-4">Factory Serial Number</th>
                  <th className="px-4 py-4 text-center">Order Qty</th>
                  <th className="px-4 py-4 text-center">Items Completed</th>
                  <th className="px-4 py-4 text-center">Balance Qty</th>
                  <th className="px-4 py-4">Stone Issued To QC On Date</th>
                  <th className="px-4 py-4">Stone Weight</th>
                  <th className="px-4 py-4">QC Sign</th>
                  <th className="px-4 py-4">Admin Return Sign</th>
                  <th className="px-4 py-4">CAD OK</th>
                  <th className="px-4 py-4">Casting OK</th>
                  <th className="px-4 py-4">Filing OK</th>
                  <th className="px-4 py-4">Selection OK</th>
                  <th className="px-4 py-4">Setting OK</th>
                  <th className="px-4 py-4">Remarks</th>
                  <th className="px-4 py-4">Progress Status</th>
                  <th className="px-6 py-4 text-center sticky right-0 bg-gray-50 dark:bg-gray-950 border-l border-gray-100 dark:border-gray-800 shadow-[-4px_0_12px_rgba(0,0,0,0.03)] z-10">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm font-semibold text-gray-800 dark:text-gray-300">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={36} className="text-center py-20 text-gray-400 dark:text-gray-500 font-medium">
                      No matching order records found in current database views.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr 
                      key={entry.key}
                      className={`hover:bg-gray-50/50 dark:hover:bg-gray-950/20 transition duration-150 group ${
                        selectedDeletionKeys.includes(entry.key) 
                          ? 'bg-red-50/50 dark:bg-red-950/20' 
                          : ''
                      }`}
                    >
                      {/* Select Column (Sticky left) */}
                      <td className={`px-4 py-3 text-center sticky left-0 z-20 border-r border-gray-100 dark:border-gray-800 transition-colors duration-150 ${
                        selectedDeletionKeys.includes(entry.key) 
                          ? 'bg-red-50 dark:bg-red-950/40' 
                          : 'bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-950/40'
                      }`} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedDeletionKeys.includes(entry.key)}
                          onChange={() => {
                            if (selectedDeletionKeys.includes(entry.key)) {
                              setSelectedDeletionKeys(selectedDeletionKeys.filter(k => k !== entry.key));
                            } else {
                              setSelectedDeletionKeys([...selectedDeletionKeys, entry.key]);
                            }
                          }}
                          className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                        />
                      </td>

                      {/* 1. Order Date */}
                      <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.orderDate}
                      </td>

                      {/* 2. Expected Shipping Date */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-900 dark:text-white block">{entry.expectedShippingDate}</span>
                        <span className={`text-[10px] block mt-0.5 font-bold ${
                          entry.status === 'Past Due' ? 'text-red-600' : 'text-gray-400'
                        }`}>
                          {getDaysRemainingStr(entry.expectedShippingDate, entry.status)}
                        </span>
                      </td>

                      {/* 3. SIGI ORDER # */}
                      <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(entry.parentOrder);
                            setSelectedItemIndex(entry.indexInOrder);
                            setActiveTabInDrawer('details');
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 font-bold focus:outline-none cursor-pointer text-left"
                          title="Click to inspect order details"
                        >
                          {entry.sigiOrderNumber}
                        </button>
                      </td>

                      {/* 4. Client Code */}
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.clientCode || '—'}
                      </td>

                      {/* 5. Urgent */}
                      <td className="px-4 py-3 text-center">
                        {entry.urgent ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[10px] font-extrabold rounded-full border border-red-200 dark:border-red-900/30 uppercase tracking-wider animate-pulse">
                            YES
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">NO</span>
                        )}
                      </td>

                      {/* 6. SIGI Style # */}
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.sigiStyleNumber || '—'}
                      </td>

                      {/* 7. SIGI SKU # */}
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {entry.sigiSkuNumber || '—'}
                      </td>

                      {/* 8. Metal Type */}
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {entry.metalType || '—'}
                      </td>

                      {/* 9. Style Pictures */}
                      <td className="px-4 py-3 text-center">
                        {entry.stylePicture ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEnlargedImage({ src: entry.stylePicture || '', title: `Style Reference - Order ${entry.sigiOrderNumber}` });
                            }}
                            className="w-10 h-10 mx-auto flex items-center justify-center bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden shrink-0 hover:scale-110 cursor-zoom-in transition-all duration-200"
                            title="Click to enlarge Style Picture"
                          >
                            <img src={entry.stylePicture} alt="Style" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px]">No Image</span>
                        )}
                      </td>

                      {/* 10. Ring Size */}
                      <td className="px-4 py-3 text-xs text-gray-900 dark:text-white">
                        {entry.ringSize || '—'}
                      </td>

                      {/* 11. Center Stone Size & Shape */}
                      <td className="px-4 py-3 text-xs text-gray-900 dark:text-white whitespace-nowrap">
                        {[entry.centerStoneSize, entry.centerStoneShape].filter(Boolean).join(' - ') || '—'}
                      </td>

                      {/* 12. Stone Picture */}
                      <td className="px-4 py-3 text-center">
                        {entry.stonePicture ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEnlargedImage({ src: entry.stonePicture || '', title: `Stone Reference - Order ${entry.sigiOrderNumber}` });
                            }}
                            className="w-10 h-10 mx-auto flex items-center justify-center bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden shrink-0 hover:scale-110 cursor-zoom-in transition-all duration-200"
                            title="Click to enlarge Stone Picture"
                          >
                            <img src={entry.stonePicture} alt="Stone" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px]">No Image</span>
                        )}
                      </td>

                      {/* 13. Center Stone To Set? */}
                      <td className="px-4 py-3 text-xs text-center font-bold">
                        {entry.centerStoneRequired ? 'YES' : 'NO'}
                      </td>

                      {/* 14. Notes For Factory */}
                      <td className="px-4 py-3 text-xs max-w-xs truncate text-indigo-600 dark:text-indigo-400 font-semibold" title={entry.productionNotes}>
                        {entry.productionNotes || '—'}
                      </td>

                      {/* 15. Stamp / Laser */}
                      <td className="px-4 py-3 text-xs font-mono text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.stampLaser || '—'}
                      </td>

                      {/* 16. Order Shipped On */}
                      <td className="px-4 py-3 text-xs font-mono text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.stages?.Shipping?.completedDate || '—'}
                      </td>

                      {/* 17. Client Order Ref. # */}
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                        {entry.clientOrderRef || '—'}
                      </td>

                      {/* 18. Factory Order */}
                      <td className="px-4 py-3 text-xs font-bold text-center">
                        {entry.factoryOrderNumber ? 'YES' : 'NO'}
                      </td>

                      {/* 19. Factory Order # */}
                      <td className="px-4 py-3 text-xs font-mono text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.factoryOrderNumber || '—'}
                      </td>

                      {/* 20. Factory Serial Number */}
                      <td className="px-4 py-3 text-xs font-mono text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.factorySerialNumber || '—'}
                      </td>

                      {/* 21. Order Qty */}
                      <td className="px-4 py-3 text-xs font-mono text-center font-bold text-gray-900 dark:text-white">
                        {entry.orderQuantity}
                      </td>

                      {/* 22. Items Completed */}
                      <td className="px-4 py-3 text-xs font-mono text-center select-none" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            disabled={entry.itemsCompleted <= 0}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const parent = entry.parentOrder;
                              const qty = parent.orderQuantity || 1;
                              const currentCompletions = parent.completedItems && Array.isArray(parent.completedItems)
                                ? [...parent.completedItems]
                                : Array.from({ length: qty }, (_, i) => i < parent.itemsCompleted);
                              
                              // Set this index to false (In Progress)
                              currentCompletions[entry.indexInOrder] = false;
                              const newItemsCompleted = currentCompletions.filter(Boolean).length;

                              const updatedPayload = {
                                ...parent,
                                completedItems: currentCompletions,
                                itemsCompleted: newItemsCompleted,
                                operatorName: currentUser.name,
                                operatorRole: currentUser.role,
                              };
                              try {
                                const response = await fetch(`/api/orders/${entry.sigiOrderNumber}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatedPayload)
                                });
                                if (response.ok) {
                                  const resultOrder = await response.json();
                                  onOrderUpdated(resultOrder);
                                  if (selectedOrder?.sigiOrderNumber === entry.sigiOrderNumber) {
                                    setSelectedOrder(resultOrder);
                                  }
                                }
                              } catch (err) {
                                console.error("Failed to decrement item completed", err);
                              }
                            }}
                            className="w-5 h-5 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-40 cursor-pointer text-xs font-bold transition border border-gray-200 dark:border-gray-700 active:scale-95"
                            title="Set item status to In Progress"
                          >
                            -
                          </button>
                          <span className="font-bold text-green-600 dark:text-green-400 min-w-5 text-center">{entry.itemsCompleted}</span>
                          <button
                            type="button"
                            disabled={entry.itemsCompleted >= entry.orderQuantity}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const parent = entry.parentOrder;
                              const qty = parent.orderQuantity || 1;
                              const currentCompletions = parent.completedItems && Array.isArray(parent.completedItems)
                                ? [...parent.completedItems]
                                : Array.from({ length: qty }, (_, i) => i < parent.itemsCompleted);
                              
                              // Set this index to true (Completed)
                              currentCompletions[entry.indexInOrder] = true;
                              const newItemsCompleted = currentCompletions.filter(Boolean).length;

                              const updatedPayload = {
                                ...parent,
                                completedItems: currentCompletions,
                                itemsCompleted: newItemsCompleted,
                                operatorName: currentUser.name,
                                operatorRole: currentUser.role,
                              };
                              try {
                                const response = await fetch(`/api/orders/${entry.sigiOrderNumber}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatedPayload)
                                });
                                if (response.ok) {
                                  const resultOrder = await response.json();
                                  onOrderUpdated(resultOrder);
                                  if (selectedOrder?.sigiOrderNumber === entry.sigiOrderNumber) {
                                    setSelectedOrder(resultOrder);
                                  }
                                }
                              } catch (err) {
                                console.error("Failed to increment item completed", err);
                              }
                            }}
                            className="w-5 h-5 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-40 cursor-pointer text-xs font-bold transition border border-gray-200 dark:border-gray-700 active:scale-95"
                            title="Set item status to Completed"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* 23. Balance Qty */}
                      <td className="px-4 py-3 text-xs font-mono text-center font-black text-amber-600 dark:text-amber-500">
                        {entry.balanceQuantity}
                      </td>

                      {/* 24. Stone Issued To QC On Date */}
                      <td className="px-4 py-3 text-xs font-mono text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.stages?.QC?.startedDate || '—'}
                      </td>

                      {/* 25. Stone Weight */}
                      <td className="px-4 py-3 text-xs font-mono text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.stoneWeight || '—'}
                      </td>

                      {/* 26. QC Sign */}
                      <td className="px-4 py-3 text-xs text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.stages?.QC?.updatedBy || '—'}
                      </td>

                      {/* 27. Admin Return Sign */}
                      <td className="px-4 py-3 text-xs text-gray-900 dark:text-white whitespace-nowrap">
                        {entry.adminReturnSign || '—'}
                      </td>

                      {/* 28. CAD OK */}
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.stages?.CAD?.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' :
                          entry.stages?.CAD?.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {entry.stages?.CAD?.status || 'Not Started'}
                        </span>
                      </td>

                      {/* 29. Casting OK */}
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.stages?.Casting?.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' :
                          entry.stages?.Casting?.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {entry.stages?.Casting?.status || 'Not Started'}
                        </span>
                      </td>

                      {/* 30. Filing OK */}
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.stages?.Filing?.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' :
                          entry.stages?.Filing?.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {entry.stages?.Filing?.status || 'Not Started'}
                        </span>
                      </td>

                      {/* 31. Selection OK */}
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.stages?.Selection?.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' :
                          entry.stages?.Selection?.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {entry.stages?.Selection?.status || 'Not Started'}
                        </span>
                      </td>

                      {/* 32. Setting OK */}
                      <td className="px-4 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.stages?.Setting?.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' :
                          entry.stages?.Setting?.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {entry.stages?.Setting?.status || 'Not Started'}
                        </span>
                      </td>

                      {/* 33. Remarks */}
                      <td className="px-4 py-3 text-xs max-w-xs truncate text-gray-600 dark:text-gray-400 font-medium" title={entry.remarks}>
                        {entry.remarks || '—'}
                      </td>

                      {/* 34. Progress Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-black rounded-lg border ${getStatusBadgeClass(entry.status)}`}>
                          {entry.status}
                        </span>
                      </td>

                      {/* 35. Actions Column (Sticky to the right) */}
                      <td className="px-6 py-4 text-center sticky right-0 bg-white dark:bg-gray-900 group-hover:bg-gray-50/80 dark:group-hover:bg-gray-950 border-l border-gray-100 dark:border-gray-800 shadow-[-4px_0_12px_rgba(0,0,0,0.03)] z-10" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(entry.parentOrder);
                              setSelectedItemIndex(entry.indexInOrder);
                              setActiveTabInDrawer('details');
                            }}
                            className="p-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 rounded-lg text-gray-500 transition cursor-pointer"
                            title="Inspect Details"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                          {currentUser.role === 'Admin' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry); }}
                              className="p-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 rounded-lg text-gray-400 transition cursor-pointer"
                              title="Delete Order Entry"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider">
            <span>SHOWING {filteredEntries.length} OF {expandedEntries.length} ACTIVE JEWELRY RECORDS</span>
            <span>SIGI LOGISTICS TRACKER SYSTEM V1.0</span>
          </div>
        </div>

      </div>

      {/* RIGHT SIDE DRAWER PANEL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
          
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 h-full flex flex-col shadow-2xl border-l border-gray-200 dark:border-gray-800 animate-slideOver">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-950">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest block">ORDER DISPATCH INSPECTOR</span>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-gray-950 dark:text-white font-mono">{selectedOrder.sigiOrderNumber}</h3>
                  {selectedOrder.urgent && (
                    <span className="px-2 py-0.5 text-[9px] font-extrabold bg-red-100 text-red-700 rounded-md tracking-wider uppercase animate-pulse">URGENT</span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => { setSelectedOrder(null); setSelectedItemIndex(null); }}
                className="w-8 h-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB SELECTORS */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 text-xs font-bold px-4 bg-gray-50 dark:bg-gray-950">
              <button
                onClick={() => setActiveTabInDrawer('details')}
                className={`px-4 py-3 cursor-pointer border-b-2 transition ${
                  activeTabInDrawer === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Order Details
              </button>
              <button
                onClick={() => setActiveTabInDrawer('stages')}
                className={`px-4 py-3 cursor-pointer border-b-2 transition ${
                  activeTabInDrawer === 'stages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Production Workflow ({stagesList.filter(s => selectedOrder.stages[s] && selectedOrder.stages[s].status === 'Completed').length}/8)
              </button>
              <button
                onClick={() => setActiveTabInDrawer('attachments')}
                className={`px-4 py-3 cursor-pointer border-b-2 transition ${
                  activeTabInDrawer === 'attachments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Attachments ({selectedOrder.attachments ? selectedOrder.attachments.length : 0})
              </button>
            </div>

            {/* DRAWER CONTENT CONTAINER */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* --- TAB 1: DETAILS PANEL --- */}
              {activeTabInDrawer === 'details' && (
                <div className="space-y-6">
                  
                  {/* Core Logistics Specification Grid */}
                  <div className="bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Specifications Grid</h4>
                    
                    <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs border-b border-gray-100 dark:border-gray-800 pb-4">
                      <div>
                        <span className="text-gray-400 block font-bold">Client Code:</span>
                        <span className="text-gray-900 dark:text-white font-black">{selectedOrder.clientCode}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold">PO Reference:</span>
                        <span className="text-gray-900 dark:text-white font-black font-mono">{selectedOrder.clientOrderRef || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold">Factory ID / Serial:</span>
                        <span className="text-gray-900 dark:text-white font-black font-mono">{selectedOrder.factoryOrderNumber || 'N/A'} / {selectedOrder.factorySerialNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold">Stone Weight:</span>
                        <span className="text-gray-900 dark:text-white font-black font-mono">{selectedOrder.stoneWeight || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold">Admin Return Sign:</span>
                        <span className="text-gray-900 dark:text-white font-black">{selectedOrder.adminReturnSign || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold">Center Stone Requirement:</span>
                        <span className="text-gray-900 dark:text-white font-black">
                          {selectedOrder.centerStoneRequired ? 'Required (Factory must supply)' : 'Not Required'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3.5 gap-x-6 text-xs pt-2">
                      <div>
                        <span className="text-gray-400 block font-bold">Style / SKU Number:</span>
                        <span className="text-gray-900 dark:text-white font-black">{selectedOrder.sigiStyleNumber} / {selectedOrder.sigiSkuNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold">Precious Metal:</span>
                        <span className="text-gray-900 dark:text-white font-black">{selectedOrder.metalType}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold">Ring Size:</span>
                        <span className="text-gray-900 dark:text-white font-black">{selectedOrder.ringSize}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold">Center Stone (Size & Shape):</span>
                        <span className="text-gray-900 dark:text-white font-black">
                          {[selectedOrder.centerStoneSize, selectedOrder.centerStoneShape].filter(Boolean).join(' - ') || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block font-bold">Stamp & Laser:</span>
                        <span className="text-gray-900 dark:text-white font-black font-mono">{selectedOrder.stampLaser || 'N/A'}</span>
                      </div>
                    </div>
                  </div>


                  {/* Active Selected Item Action Focus */}
                  {(() => {
                    const focusedItem = (selectedItemIndex !== null && selectedItemIndex < displayItems.length)
                      ? displayItems[selectedItemIndex]
                      : displayItems[0];

                    if (!focusedItem) return null;
                    const isFocusedItemCompleted = focusedItem.status === 'Completed';
                    const maxQuantity = displayItems.length;

                    return (
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <h5 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                              Active Item Focus: {focusedItem.label} of {maxQuantity}
                            </h5>
                          </div>
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-900/40 uppercase tracking-wider">
                            Targeted Update
                          </span>
                        </div>

                        {/* Details of opened item spec if exists */}
                        <div className="bg-white/80 dark:bg-gray-950/60 p-3 rounded-xl border border-blue-100/60 dark:border-blue-900/10 text-xs grid grid-cols-2 gap-y-2 gap-x-4">
                          <div>
                            <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wider">Style # / SKU:</span>
                            <span className="text-gray-900 dark:text-white font-bold">
                              {focusedItem.sigiStyleNumber || '—'} / {focusedItem.sigiSkuNumber || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wider">Precious Metal:</span>
                            <span className="text-gray-900 dark:text-white font-bold">{focusedItem.metalType || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wider">Ring Size:</span>
                            <span className="text-gray-900 dark:text-white font-bold">{focusedItem.ringSize || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wider">Laser Logo:</span>
                            <span className="text-gray-900 dark:text-white font-mono font-bold">{focusedItem.stampLaser || '—'}</span>
                          </div>
                        </div>

                        {/* Notes for Factory */}
                        <div className="bg-white/80 dark:bg-gray-950/60 p-3.5 rounded-xl border border-blue-100/60 dark:border-blue-900/10 text-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-[10px] font-extrabold uppercase tracking-wider block">Notes for Factory</span>
                            {tempNotes !== null && (
                              <span className="text-[10px] text-blue-600 font-bold animate-pulse">Unsaved changes</span>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <textarea
                              rows={3}
                              value={tempNotes !== null ? tempNotes : (focusedItem.productionNotes === '—' ? '' : focusedItem.productionNotes || '')}
                              onChange={(e) => setTempNotes(e.target.value)}
                              className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-gray-800 dark:text-gray-200"
                              placeholder="Enter specific production details, design, or material instructions..."
                            />
                          </div>
                          
                          {tempNotes !== null && (
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setTempNotes(null);
                                }}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-800 dark:text-white rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveProductionNotes(focusedItem)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3 h-3" /> Save Notes for Factory
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-150 dark:border-gray-800/80">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Current Tracking Status</span>
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black uppercase border ${
                              isFocusedItemCompleted
                                ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/30'
                                : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30'
                            }`}>
                              {isFocusedItemCompleted ? 'Completed' : 'In Progress'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const isCurrentlyCompleted = focusedItem.status === 'Completed';
                              if (focusedItem.type === 'sibling') {
                                handleToggleSiblingCompletion(focusedItem.order, !isCurrentlyCompleted);
                              } else {
                                handleToggleItemCompletion(focusedItem.index, !isCurrentlyCompleted);
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                              isFocusedItemCompleted
                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                                : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 dark:shadow-none'
                            }`}
                          >
                            {isFocusedItemCompleted ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" /> Set In Progress
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" /> Mark as Completed
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Individual Item Tracking Checklist Card */}
                  <div className="bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">Order Items Status Tracking (Non-Sequential)</h4>
                        <span className="text-[10px] text-gray-400 block">Click on any item card below to set it as active focus and update its status above</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {displayItems.map((item) => {
                        const isItemCompleted = item.status === 'Completed';
                        const isItemFocused = item.type === 'sibling'
                          ? item.order.sigiOrderNumber === selectedOrder.sigiOrderNumber
                          : selectedItemIndex === item.index;

                        return (
                          <div 
                            key={item.id}
                            onClick={() => {
                              if (item.type === 'sibling') {
                                setSelectedOrder(item.order);
                                setSelectedItemIndex(item.index);
                              } else {
                                setSelectedItemIndex(item.index);
                              }
                            }}
                            className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-2 text-xs cursor-pointer select-none ${
                              isItemFocused 
                                ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-400 dark:border-blue-800 ring-2 ring-blue-100 dark:ring-blue-950/50 scale-[1.01] shadow-sm' 
                                : isItemCompleted 
                                  ? 'bg-green-50/15 dark:bg-green-950/5 border-green-150 dark:border-green-950/60 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-gray-100/30'
                                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-gray-50/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-0.5">
                                <span className="font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5 font-mono">
                                  {item.label}
                                  {isItemFocused && (
                                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">Active Focus</span>
                                  )}
                                </span>
                                <div className="text-[10px] text-gray-500 font-medium font-mono">
                                  Style: {item.sigiStyleNumber} ({item.ringSize})
                                </div>
                              </div>

                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                isItemCompleted
                                  ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/30'
                                  : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30'
                              }`}>
                                {isItemCompleted ? 'Completed' : 'In Progress'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Volume Completion Slider (Role-gated) */}
                  <div className="p-6 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-blue-100/60 dark:border-blue-900/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">Fast Volume Update Engine</h4>
                      <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">Role: {currentUser.role}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center items-center">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Ordered Qty</span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">{selectedOrder.orderQuantity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Completed Qty</span>
                        <div className="flex items-center justify-center gap-1.5 mx-auto">
                          {/* Minus Button */}
                          <button
                            type="button"
                            disabled={selectedOrder.itemsCompleted <= 0}
                            onClick={() => {
                              const val = Math.max(0, selectedOrder.itemsCompleted - 1);
                              setLocalCompletedQty(String(val));
                              handleItemsCompletedUpdate(val);
                            }}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="Decrement completed quantity"
                          >
                            <Minus className="w-3.5 h-3.5 font-bold" />
                          </button>

                          {/* Number Input with local state */}
                          <div className="relative flex items-center">
                            <input 
                              type="number" 
                              min="0" 
                              max={selectedOrder.orderQuantity} 
                              value={localCompletedQty}
                              onChange={(e) => setLocalCompletedQty(e.target.value)}
                              onBlur={() => {
                                const parsed = Math.min(
                                  selectedOrder.orderQuantity,
                                  Math.max(0, parseInt(localCompletedQty) || 0)
                                );
                                setLocalCompletedQty(String(parsed));
                                if (parsed !== selectedOrder.itemsCompleted) {
                                  handleItemsCompletedUpdate(parsed);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const parsed = Math.min(
                                    selectedOrder.orderQuantity,
                                    Math.max(0, parseInt(localCompletedQty) || 0)
                                  );
                                  setLocalCompletedQty(String(parsed));
                                  if (parsed !== selectedOrder.itemsCompleted) {
                                    handleItemsCompletedUpdate(parsed);
                                  }
                                  (e.target as HTMLInputElement).blur();
                                }
                              }}
                              className="w-16 px-1.5 py-1 text-center bg-white dark:bg-gray-950 dark:text-white border border-gray-300 dark:border-gray-800 rounded font-mono text-base font-black focus:outline-none focus:ring-1 focus:ring-blue-500 block"
                            />
                          </div>

                          {/* Plus Button */}
                          <button
                            type="button"
                            disabled={selectedOrder.itemsCompleted >= selectedOrder.orderQuantity}
                            onClick={() => {
                              const val = Math.min(selectedOrder.orderQuantity, selectedOrder.itemsCompleted + 1);
                              setLocalCompletedQty(String(val));
                              handleItemsCompletedUpdate(val);
                            }}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            title="Increment completed quantity"
                          >
                            <Plus className="w-3.5 h-3.5 font-bold" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Balance Qty</span>
                        <span className="text-2xl font-black text-amber-600 font-mono">{selectedOrder.balanceQuantity}</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full" style={{ width: `${selectedOrder.productionPercentage}%` }}></div>
                    </div>
                  </div>

                  {/* Remarks & Factory Notes */}
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Factory Instructions Notes</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-semibold italic">{selectedOrder.factoryNotes || 'No special production notes listed for this casting.'}</p>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">General Office Remarks</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-semibold">{selectedOrder.remarks || 'No remarks provided.'}</p>
                    </div>
                  </div>

                </div>
              )}

              {/* --- TAB 2: PRODUCTION STAGES WORKFLOW (ROLE-GATED) --- */}
              {activeTabInDrawer === 'stages' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 text-amber-900 dark:text-amber-400 text-xs font-semibold">
                    💡 <strong>Permissions Alert:</strong> Both Admin and Sales roles have permission to edit and update production stages.
                  </div>

                  <div className="space-y-3.5">
                    {stagesList.map((stage) => {
                      const sInfo = selectedOrder.stages[stage] || {
                        status: 'Not Started', startedDate: '', completedDate: '', completedQuantity: 0, remarks: '', updatedBy: ''
                      };

                      const isReadOnly = false;

                      return (
                        <div 
                          key={stage} 
                          className={`p-5 rounded-2xl border transition ${
                            sInfo.status === 'Completed'
                              ? 'bg-green-50/40 dark:bg-green-950/15 border-green-100 dark:border-green-900/20'
                              : sInfo.status === 'In Progress'
                                ? 'bg-blue-50/40 dark:bg-blue-950/15 border-blue-100 dark:border-blue-900/20 shadow-xs'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-black flex items-center justify-center text-gray-600 dark:text-gray-300">
                                {stage === 'QC' ? 'QC' : stage.substring(0, 3).toUpperCase()}
                              </span>
                              <div>
                                <h5 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">{stage} Phase</h5>
                                {sInfo.updatedBy && (
                                  <span className="text-[10px] text-gray-400 font-semibold block">Operator: {sInfo.updatedBy}</span>
                                )}
                              </div>
                            </div>

                            {/* Stage status selector */}
                            <select
                              disabled={isReadOnly}
                              value={sInfo.status}
                              onChange={(e) => handleStageUpdate(stage, 'status', e.target.value)}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-white disabled:opacity-60 cursor-pointer"
                            >
                              <option value="Not Started">❌ Not Started</option>
                              <option value="In Progress">⏳ In Progress</option>
                              <option value="Completed">✓ Completed</option>
                            </select>
                          </div>

                          {/* Detail inputs */}
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <label className="text-[10px] font-extrabold text-gray-400 uppercase block mb-1">Started Date</label>
                              <input 
                                type="date"
                                disabled={isReadOnly}
                                value={sInfo.startedDate || ''}
                                onChange={(e) => handleStageUpdate(stage, 'startedDate', e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded disabled:opacity-60"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-extrabold text-gray-400 uppercase block mb-1">Completed Date</label>
                              <input 
                                type="date"
                                disabled={isReadOnly}
                                value={sInfo.completedDate || ''}
                                onChange={(e) => handleStageUpdate(stage, 'completedDate', e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded disabled:opacity-60"
                              />
                            </div>
                          </div>

                          {/* Remarks input */}
                          <div className="mt-4">
                            <label className="text-[10px] font-extrabold text-gray-400 uppercase block mb-1">Process Remarks</label>
                            <input 
                              type="text"
                              disabled={isReadOnly}
                              value={sInfo.remarks || ''}
                              onChange={(e) => handleStageUpdate(stage, 'remarks', e.target.value)}
                              placeholder={`Enter observations for ${stage} stage...`}
                              className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 dark:text-white rounded disabled:opacity-60 placeholder:text-gray-400 font-medium"
                            />
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- TAB 3: ATTACHMENTS (DOCS, INVOICES, CAD FILES) --- */}
              {activeTabInDrawer === 'attachments' && (
                <div className="space-y-6">
                  
                  {/* Upload new box (Role gated) */}
                  <div className="p-5 bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
                    <h5 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Upload New Document Attachment</h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-gray-400 uppercase block">Label Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. Approved CAD rendering"
                          value={attachmentName}
                          onChange={(e) => setAttachmentName(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 dark:text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-gray-400 uppercase block">Document Category</label>
                        <select
                          value={attachmentType}
                          onChange={(e) => setAttachmentType(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 dark:text-white rounded"
                        >
                          <option value="CAD File">CAD File / Draft</option>
                          <option value="QC Image">QC Image Reference</option>
                          <option value="Shipping Document">Shipping Document</option>
                          <option value="Invoice">Invoice</option>
                          <option value="Other">Other / Instructions</option>
                        </select>
                      </div>
                    </div>

                    {/* Actual file trigger */}
                    <div className="pt-2">
                      <label className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm">
                        <Upload className="w-4.5 h-4.5" />
                        {isUploading ? 'Encoding & Transmitting...' : 'Select File to Transmit'}
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={handleAttachmentUpload}
                          disabled={isUploading} 
                        />
                      </label>
                    </div>
                  </div>

                  {/* Attachments List */}
                  <div className="space-y-3.5">
                    <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest block">Active Files Directory</h5>
                    
                    {!selectedOrder.attachments || selectedOrder.attachments.length === 0 ? (
                      <p className="text-center py-10 text-gray-400 dark:text-gray-500 text-xs font-semibold">
                        No active file attachments are catalogued for this order.
                      </p>
                    ) : (
                      selectedOrder.attachments.map((file) => (
                        <div 
                          key={file.id}
                          className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 bg-gray-50 dark:bg-gray-950 text-gray-500 rounded-lg flex items-center justify-center text-xs shrink-0">
                              <Paperclip className="w-4.5 h-4.5 text-blue-500" />
                            </div>
                            <div className="overflow-hidden">
                              <span className="font-bold text-gray-900 dark:text-white text-xs block truncate">{file.name}</span>
                              <span className="text-[10px] text-gray-400 font-semibold block uppercase tracking-wider">{file.type} • {file.fileName}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <a 
                              href={file.fileData} 
                              download={file.fileName}
                              className="px-2.5 py-1 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-950 dark:hover:bg-blue-950/30 text-gray-500 font-bold text-[10px] rounded uppercase tracking-wider transition"
                            >
                              Get File
                            </a>
                            <button 
                              onClick={() => handleAttachmentDelete(file.id)}
                              className="p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/25 rounded-lg text-gray-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

            </div>

            {/* Footer buttons on Drawer */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center justify-end">
              <button
                onClick={() => { setSelectedOrder(null); setSelectedItemIndex(null); }}
                className="px-5 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Confirmation Dialog */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-xl text-red-600 dark:text-red-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">{confirmDialog.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-600/10 transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Dialog */}
      {alertDialog && alertDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">{alertDialog.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{alertDialog.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setAlertDialog(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/10 transition cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Image Zoom Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setEnlargedImage(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 overflow-hidden shadow-2xl flex flex-col items-center cursor-default animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center mb-4">
              <span className="text-xs font-black text-gray-950 dark:text-white uppercase tracking-wider">
                {enlargedImage.title}
              </span>
              <button 
                onClick={() => setEnlargedImage(null)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-850 dark:hover:text-white cursor-pointer transition-all"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center min-h-[250px] md:min-h-[400px] max-w-full">
              <img 
                src={enlargedImage.src} 
                alt={enlargedImage.title} 
                className="max-h-[70vh] max-w-full rounded-xl object-contain bg-gray-50 dark:bg-gray-950 p-2 border border-gray-100 dark:border-gray-800" 
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
