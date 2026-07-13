export type UserRole = 'Admin' | 'Sales';

export interface User {
  username: string;
  name: string;
  role: UserRole;
  password?: string; // used for simple auth check
}

export type StageName = 'CAD' | 'Casting' | 'Filing' | 'Selection' | 'Setting' | 'QC' | 'Packing' | 'Shipping';

export interface ProductionStage {
  status: 'Not Started' | 'In Progress' | 'Completed';
  startedDate: string; // YYYY-MM-DD or empty
  completedDate: string; // YYYY-MM-DD or empty
  completedQuantity: number;
  updatedBy: string;
  remarks: string;
}

export interface OrderAttachment {
  id: string;
  name: string;
  type: string; // 'Style Picture' | 'Stone Picture' | 'CAD File' | 'QC Image' | 'Shipping Document' | 'Invoice' | 'Other'
  fileName: string;
  fileData: string; // Base64 encoded file data
  uploadedAt: string;
  uploadedBy: string;
}

export interface OrderItemSpec {
  sigiStyleNumber: string;
  sigiSkuNumber: string;
  metalType: string;
  ringSize: string;
  centerStoneSize: string;
  centerStoneShape: string;
  stampLaser: string;
  stylePicture?: string;
  stonePicture?: string;
  productionNotes?: string;
}

export interface Order {
  sigiOrderNumber: string; // Unique primary key
  orderDate: string; // YYYY-MM-DD
  expectedShippingDate: string; // YYYY-MM-DD
  clientCode: string;
  clientOrderRef: string;
  urgent: boolean;
  sigiStyleNumber: string;
  sigiSkuNumber: string;
  metalType: string;
  ringSize: string;
  centerStoneSize: string;
  centerStoneShape: string;
  centerStoneRequired: boolean;
  stylePicture?: string; // Base64
  stonePicture?: string; // Base64
  productionNotes?: string;
  factoryNotes: string;
  stampLaser: string;
  factoryOrderNumber: string;
  factorySerialNumber: string;
  orderQuantity: number;
  itemsCompleted: number;
  remarks: string;
  stoneWeight?: string;
  adminReturnSign?: string;
  specs?: OrderItemSpec[]; // Support unlimited specifications
  
  // Calculated (can be generated on load / updated)
  balanceQuantity: number;
  productionPercentage: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Past Due' | 'Due Soon' | 'On Track';
  currentStage: StageName | 'None';

  // Workflows
  stages: Record<StageName, ProductionStage>;
  
  // Attachments
  attachments: OrderAttachment[];
  completedItems?: boolean[];
}

export interface ActivityLog {
  id: string;
  username: string;
  userRole: UserRole;
  timestamp: string; // ISO String
  action: string; // 'CREATE_ORDER' | 'UPDATE_ORDER' | 'UPDATE_STAGE' | 'ADD_ATTACHMENT' | 'DELETE_ATTACHMENT' | 'DELETE_ORDER'
  orderNumber: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}
