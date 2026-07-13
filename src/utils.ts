import { Order, StageName } from './types';

export const getTodayDateStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface ExpandedEntry {
  key: string;
  sigiOrderNumber: string;
  orderDate: string;
  expectedShippingDate: string;
  clientCode: string;
  clientOrderRef: string;
  urgent: boolean;
  centerStoneRequired: boolean;
  stylePicture?: string;
  stonePicture?: string;
  factoryNotes: string;
  factoryOrderNumber: string;
  factorySerialNumber: string;
  remarks: string;
  stoneWeight?: string;
  adminReturnSign?: string;
  stages: any;
  attachments: any[];
  
  // Specific spec properties
  sigiStyleNumber: string;
  sigiSkuNumber: string;
  metalType: string;
  ringSize: string;
  centerStoneSize: string;
  centerStoneShape: string;
  stampLaser: string;
  productionNotes?: string;
  
  // Flattened quantities
  orderQuantity: number;
  itemsCompleted: number;
  balanceQuantity: number;
  productionPercentage: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Past Due' | 'Due Soon' | 'On Track';
  currentStage: StageName | 'None';
  parentOrder: Order;
  indexInOrder: number;
}

export function getExpandedEntries(orders: Order[]): ExpandedEntry[] {
  const entries: ExpandedEntry[] = [];
  
  orders.forEach(o => {
    // Get specs list, or fallback to parent order details if specs is empty
    const specsList = o.specs && o.specs.length > 0 ? o.specs : [{
      sigiStyleNumber: o.sigiStyleNumber || '',
      sigiSkuNumber: o.sigiSkuNumber || '',
      metalType: o.metalType || '18K White Gold',
      ringSize: o.ringSize || '6.5',
      centerStoneSize: o.centerStoneSize || '',
      centerStoneShape: o.centerStoneShape || '',
      stampLaser: o.stampLaser || '',
      productionNotes: o.productionNotes || ''
    }];

    // Determine the total quantity for this order. 
    // It should be the max of the parent's orderQuantity and the specs count.
    const totalQty = Math.max(o.orderQuantity || 1, specsList.length);

    for (let index = 0; index < totalQty; index++) {
      // Pick the spec from the specs list. Wrap around if totalQty is larger than specsList.length
      const spec = specsList[index % specsList.length];
      
      // Determine if this specific item is completed individually out of sequence
      const isItemCompleted = o.completedItems && Array.isArray(o.completedItems) && o.completedItems.length > index
        ? !!o.completedItems[index]
        : index < o.itemsCompleted;
      
      // Inherit or calculate item-level values
      const itemCompletedQty = isItemCompleted ? 1 : 0;
      const itemBalanceQty = isItemCompleted ? 0 : 1;
      
      // Item progress status and stage
      let itemStatus = o.status;
      let itemStage = o.currentStage;
      if (isItemCompleted) {
        itemStatus = 'Completed';
        itemStage = 'Shipping'; // Completed items are at the final stage
      } else {
        // If parent is marked completed but this item is somehow not (shouldn't happen, but safeguard)
        if (o.status === 'Completed') {
          itemStatus = 'In Progress';
        }
      }

      entries.push({
        key: `${o.sigiOrderNumber}_${index}`,
        
        // Parent fields
        sigiOrderNumber: o.sigiOrderNumber,
        orderDate: o.orderDate,
        expectedShippingDate: o.expectedShippingDate,
        clientCode: o.clientCode,
        clientOrderRef: o.clientOrderRef,
        urgent: o.urgent,
        centerStoneRequired: o.centerStoneRequired,
        stylePicture: spec.stylePicture || o.stylePicture,
        stonePicture: spec.stonePicture || o.stonePicture,
        factoryNotes: o.factoryNotes,
        factoryOrderNumber: o.factoryOrderNumber,
        factorySerialNumber: o.factorySerialNumber,
        remarks: o.remarks,
        stoneWeight: o.stoneWeight,
        adminReturnSign: o.adminReturnSign,
        stages: o.stages,
        attachments: o.attachments,
        
        // Spec fields (specific to this style number)
        sigiStyleNumber: spec.sigiStyleNumber || o.sigiStyleNumber || '—',
        sigiSkuNumber: spec.sigiSkuNumber || o.sigiSkuNumber || '—',
        metalType: spec.metalType || o.metalType || '—',
        ringSize: spec.ringSize || o.ringSize || '—',
        centerStoneSize: spec.centerStoneSize || o.centerStoneSize || '—',
        centerStoneShape: spec.centerStoneShape || o.centerStoneShape || '—',
        stampLaser: spec.stampLaser || o.stampLaser || '—',
        productionNotes: spec.productionNotes || o.productionNotes || '—',
        
        // Flattened item-level quantities
        orderQuantity: 1,
        itemsCompleted: itemCompletedQty,
        balanceQuantity: itemBalanceQty,
        productionPercentage: itemCompletedQty * 100,
        status: itemStatus,
        currentStage: itemStage,
        
        // Keep a reference to the actual parent order
        parentOrder: o,
        indexInOrder: index
      });
    }
  });

  return entries;
}
