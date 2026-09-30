export type UserRole = 'admin' | 'editor' | 'viewer' | 'driver';

export interface ModulePermissions {
  dashboard: { view: boolean; edit: boolean };
  inventory: { view: boolean; edit: boolean };
  forms: { view: boolean; edit: boolean };
  outlets: { view: boolean; edit: boolean };
  products: { view: boolean; edit: boolean };
  reports: { view: boolean; edit: boolean };
  users: { view: boolean; edit: boolean };
}

export interface UserProfile {
  id: string;
  uid: string;
  username: string; // Staff username for authentication (e.g. 'admin', 'kamal', 'dineth')
  userIdCode?: string; // Custom employee / user ID (e.g. USR-ADM-01)
  email?: string;
  password?: string;
  mustResetPassword?: boolean; // Flag if one-time temporary password was set by admin
  isFirstLogin?: boolean; // True on user's first login until they create their own password
  tempPasswordSetAt?: string;
  status?: 'active' | 'suspended'; // Account access status - suspended users cannot log in
  activeSessionId?: string; // Unique single active session token (terminates older logins upon concurrent sign-in)
  lastLoginAt?: string; // Timestamp of latest session establishment
  displayName: string;
  role: UserRole;
  permissions?: Partial<ModulePermissions>;
  designation?: string;
  department?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryBatch {
  id: string;
  batchNo: string;
  productName: string;
  category: string;
  initialQuantity: number;
  quantity: number;
  prodDate: string; // YYYY-MM-DD
  useByDate: string; // YYYY-MM-DD
  dispatchTemp: number; // in Celsius e.g. 3.5, 4.0
  unit: string; // e.g. 'slices', 'cakes', 'packs'
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BatchLog {
  id: string;
  batchId: string;
  batchNo: string;
  productName?: string;
  action: 'dispatch_deduction' | 'manual_adjustment' | 'batch_created' | 'restock';
  quantityChanged: number; // e.g. -12
  previousQty: number;
  newQty: number;
  referenceId?: string; // Dispatch Log Doc ID
  outletName?: string;
  driverName?: string;
  recordedBy: string;
  timestamp: string;
}

export interface Outlet {
  id: string;
  outletId: string; // e.g. OUT-01, OUT-02
  name: string;
  location?: string;
  phone?: string;
  active: boolean;
}

export interface Product {
  id: string;
  productId: string; // e.g. PRD-01, PRD-02 (system generated, locked/read-only, cannot be changed by any user)
  name: string;
  keyCode?: string; // Short key code for unique batch numbering, e.g. 'BCC', 'BCS', 'DBC', 'RVC', 'MC'
  category: string; // e.g. 'Pastry Kitchen Items', 'Bakery & Pastry', etc.
  dispatchTemp: number; // Default dispatch temperature in Celsius (e.g. 3.5), must be <= 5.0 C
  shelfLifeDays?: number; // Standard shelf life in days
  unit?: string; // Standard unit (e.g. Slices, Cakes, Packs, Cups)
  active: boolean; // Active or Suspended
  createdAt?: string;
  updatedAt?: string;
}

export interface DispatchLineItem {
  id: string;
  productName: string;
  batchNo: string;
  batchId?: string;
  dispatchTime: string; // HH:MM
  prodDate: string;
  useByDate: string;
  dispatchTemp: number;
  quantity: number;
  availableStock?: number;
  isCustom?: boolean; // ONLY custom/new added rows allow search & selection; standard rows are locked
  notes?: string;
}

export interface DispatchLog {
  id: string;
  docNo: string; // "BCL/REC/HACCP/32"
  title: string; // "Central Kitchen Dispatch Log"
  revision: string; // "Rev 01"
  version: string; // "01"
  effectiveDate: string; // "01 January 2025"
  haccpLink: string; // "OPRP-2"
  approvedBy: string; // "QA Executive"
  date: string; // YYYY-MM-DD
  dispatchTime: string; // HH:MM
  outletIds: string[];
  outletNames: string[];
  driverName: string;
  vehicleNo?: string;
  supervisor: string; // Automatically selected logged in username (read-only)
  supervisorId: string;
  supervisorEmail: string;
  items: DispatchLineItem[];
  haccpCompliant: boolean;
  notes?: string;
  status: 'submitted' | 'in_transit' | 'delivered' | 'edited';
  createdAt: string;
  updatedAt?: string;
}

export interface Driver {
  id: string;
  driverId: string;
  name: string;
  vehicleNo: string;
  phone: string;
  active: boolean;
}
