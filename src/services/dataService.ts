import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { InventoryBatch, BatchLog, Outlet, Product, DispatchLog, Driver, UserProfile, UserRole, MonthlyDispatchCycle } from '../types';
import { INITIAL_BATCHES, INITIAL_OUTLETS, INITIAL_DRIVERS, INITIAL_USERS, INITIAL_PRODUCT_CATALOG } from '../data/seedData';
import { getProductKeyCode } from '../utils/batchUtils';

// Collections
const BATCHES_COL = 'inventory';
const LOGS_COL = 'batch_logs';
const OUTLETS_COL = 'outlets';
const PRODUCTS_COL = 'products';
const DISPATCH_COL = 'dispatch_logs';
const DRIVERS_COL = 'drivers';
const USERS_COL = 'users';

/**
 * Deeply strips `undefined` keys and cleans data so Firestore setDoc/updateDoc never errors on unsupported undefined fields.
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Seed Database with initial Barista Central Kitchen items if empty
export async function seedInitialDataIfNeeded(): Promise<boolean> {
  try {
    const metaDoc = await getDoc(doc(db, 'system_metadata', 'init_state'));
    if (metaDoc.exists() && metaDoc.data()?.seeded) {
      return false;
    }

    const snap = await getDocs(collection(db, BATCHES_COL));
    if (snap.empty) {
      console.log('Seeding initial central kitchen inventory, outlets, and products...');
      
      let deletedBatchesSet = new Set<string>();
      try {
        const delSnap = await getDocs(collection(db, 'deleted_batches'));
        delSnap.forEach(d => {
          deletedBatchesSet.add(d.id);
          const data = d.data();
          if (data.batchNo) deletedBatchesSet.add(data.batchNo);
        });
      } catch (delErr) {
        console.warn('Could not read deleted_batches:', delErr);
      }

      // Seed Batches
      for (const b of INITIAL_BATCHES) {
        if (!deletedBatchesSet.has(b.id) && !deletedBatchesSet.has(b.batchNo)) {
          await setDoc(doc(db, BATCHES_COL, b.id), b);
        }
      }

      // Seed Outlets
      for (const o of INITIAL_OUTLETS) {
        await setDoc(doc(db, OUTLETS_COL, o.id), o);
      }

      // Seed Products
      for (const p of INITIAL_PRODUCT_CATALOG) {
        await setDoc(doc(db, PRODUCTS_COL, p.id), p);
      }

      // Seed Drivers
      for (const d of INITIAL_DRIVERS) {
        await setDoc(doc(db, DRIVERS_COL, d.id), d);
      }

      // Seed Users
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, USERS_COL, u.id), u, { merge: true });
      }

      // Mark system initialization as complete
      try {
        await setDoc(doc(db, 'system_metadata', 'init_state'), {
          seeded: true,
          seededAt: new Date().toISOString()
        });
      } catch (metaErr) {
        console.warn('Could not write system_metadata/init_state:', metaErr);
      }

      return true;
    } else {
      const prodSnap = await getDocs(collection(db, PRODUCTS_COL));
      if (prodSnap.empty) {
        for (const p of INITIAL_PRODUCT_CATALOG) {
          await setDoc(doc(db, PRODUCTS_COL, p.id), p);
        }
      }

      try {
        let deletedSet = new Set<string>();
        try {
          const deletedSnap = await getDocs(collection(db, 'deleted_users'));
          deletedSnap.forEach(d => {
            deletedSet.add(d.id.toLowerCase());
            const data = d.data();
            if (data.username) deletedSet.add(data.username.toLowerCase());
            if (data.userIdCode) deletedSet.add(data.userIdCode.toLowerCase());
          });
        } catch (delReadErr) {
          console.warn('Could not read deleted_users collection:', delReadErr);
        }

        for (const u of INITIAL_USERS) {
          const uName = (u.username || '').toLowerCase();
          const uCode = (u.userIdCode || '').toLowerCase();
          if (deletedSet.has(uName) || deletedSet.has(uCode)) {
            continue;
          }
          const userDocRef = doc(db, USERS_COL, u.id);
          const uSnap = await getDoc(userDocRef);
          if (!uSnap.exists()) {
            await setDoc(userDocRef, u);
          }
        }
      } catch (usersSyncErr) {
        console.warn('Could not verify initial staff accounts:', usersSyncErr);
      }

      await syncOfficialOutlets(false);
    }
    return false;
  } catch (error) {
    console.warn('Seeding note (offline or permission fallback):', error);
    return false;
  }
}

// ----------------- INVENTORY BATCHES -----------------
export function subscribeBatches(callback: (batches: InventoryBatch[]) => void) {
  const q = query(collection(db, BATCHES_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: InventoryBatch[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as InventoryBatch);
      });
      items.sort((a, b) => b.batchNo.localeCompare(a.batchNo));
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, BATCHES_COL);
    }
  );
}

export async function addInventoryBatch(batch: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<string> {
  const id = `batch-${Date.now()}`;
  try {
    const newBatch: InventoryBatch = { ...batch, id, createdAt: new Date().toISOString() };
    await setDoc(doc(db, BATCHES_COL, id), newBatch);

    await addBatchLog({
      batchId: id,
      batchNo: batch.batchNo,
      productName: batch.productName,
      action: 'batch_created',
      quantityChanged: batch.initialQuantity,
      previousQty: 0,
      newQty: batch.initialQuantity,
      recordedBy: batch.createdBy || 'Central Kitchen Staff',
      timestamp: new Date().toISOString()
    });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${BATCHES_COL}/${id}`);
    throw error;
  }
}

export async function updateInventoryBatch(id: string, updates: Partial<InventoryBatch>, userEmail: string): Promise<void> {
  try {
    const ref = doc(db, BATCHES_COL, id);
    await updateDoc(ref, {
      ...updates,
      updatedAt: new Date().toISOString()
    });

    if (updates.quantity !== undefined) {
      await addBatchLog({
        batchId: id,
        batchNo: updates.batchNo || id,
        productName: updates.productName,
        action: 'manual_adjustment',
        quantityChanged: 0,
        previousQty: updates.quantity,
        newQty: updates.quantity,
        recordedBy: userEmail,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${BATCHES_COL}/${id}`);
    throw error;
  }
}

export async function deleteInventoryBatch(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, BATCHES_COL, id));
    try {
      const q = query(collection(db, BATCHES_COL), where('id', '==', id));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (qErr) {
      // Non-fatal query cleanup
    }

    try {
      await setDoc(doc(db, 'deleted_batches', id), {
        id,
        deletedAt: new Date().toISOString()
      });
    } catch (tombErr) {
      console.warn('Could not record deleted_batches tombstone:', tombErr);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BATCHES_COL}/${id}`);
    throw error;
  }
}

// ----------------- BATCH AUDIT LOGS -----------------
export function subscribeBatchLogs(callback: (logs: BatchLog[]) => void) {
  const q = query(collection(db, LOGS_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: BatchLog[] = [];
      snapshot.forEach((d) => {
        logs.push({ id: d.id, ...d.data() } as BatchLog);
      });
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, LOGS_COL);
    }
  );
}

export async function addBatchLog(log: Omit<BatchLog, 'id'>): Promise<void> {
  const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  try {
    await setDoc(doc(db, LOGS_COL, id), { ...log, id });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${LOGS_COL}/${id}`);
  }
}

// ----------------- OUTLETS -----------------
export function subscribeOutlets(callback: (outlets: Outlet[]) => void) {
  const q = query(collection(db, OUTLETS_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Outlet[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Outlet);
      });
      items.sort((a, b) => {
        const numA = parseInt(a.outletId?.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.outletId?.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, OUTLETS_COL);
    }
  );
}

export function getNextOutletCode(outletsList: Outlet[]): string {
  let max = 0;
  for (const o of outletsList) {
    const match = o.outletId?.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  const nextNum = max > 0 ? max + 1 : outletsList.length + 1;
  return `OUT-${String(nextNum).padStart(2, '0')}`;
}

export async function addOutlet(outlet: { name: string; active?: boolean }): Promise<string> {
  const name = outlet.name.trim();
  if (!name) {
    throw new Error('Outlet Name is compulsory.');
  }
  const id = `outlet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  try {
    const snap = await getDocs(collection(db, OUTLETS_COL));
    let max = 0;
    snap.forEach((d) => {
      const data = d.data();
      const code = data.outletId as string;
      const match = code?.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    });
    const autoCode = `OUT-${String(max + 1).padStart(2, '0')}`;
    await setDoc(doc(db, OUTLETS_COL, id), {
      id,
      outletId: autoCode,
      name,
      location: '',
      phone: '',
      active: outlet.active !== undefined ? outlet.active : true
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${OUTLETS_COL}/${id}`);
    throw error;
  }
}

export async function updateOutlet(
  id: string, 
  updates: { name?: string; active?: boolean }
): Promise<void> {
  try {
    const safeUpdates: Partial<Outlet> = {};
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) throw new Error('Outlet Name is compulsory.');
      safeUpdates.name = trimmed;
    }
    if (updates.active !== undefined) {
      safeUpdates.active = updates.active;
    }
    await updateDoc(doc(db, OUTLETS_COL, id), safeUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${OUTLETS_COL}/${id}`);
    throw error;
  }
}

export async function deleteOutlet(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, OUTLETS_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${OUTLETS_COL}/${id}`);
    throw error;
  }
}

export async function deleteAllOutlets(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, OUTLETS_COL));
    if (snap.empty) return;
    let batch = writeBatch(db);
    let count = 0;
    const batchPromises = [];
    for (const d of snap.docs) {
      batch.delete(d.ref);
      count++;
      if (count >= 400) {
        batchPromises.push(batch.commit());
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      batchPromises.push(batch.commit());
    }
    await Promise.all(batchPromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, OUTLETS_COL);
    throw error;
  }
}

export async function syncOfficialOutlets(force = false): Promise<number> {
  try {
    const snap = await getDocs(collection(db, OUTLETS_COL));
    const hasOldDemo = snap.docs.some(d => {
      const data = d.data();
      return (
        data.name?.includes('Colombo Fort Branch') ||
        data.name?.includes('Havelock Town') ||
        data.name?.includes('Galle Face Mall')
      );
    });
    if (force || snap.empty || snap.size < 50 || hasOldDemo) {
      console.log('Syncing all 101 official Barista outlets to Firestore with writeBatch...');
      if (hasOldDemo) {
        let delBatch = writeBatch(db);
        for (const d of snap.docs) {
          const data = d.data();
          if (data.name?.includes('Colombo Fort Branch') || data.name?.includes('Havelock Town') || data.name?.includes('Galle Face Mall')) {
            delBatch.delete(d.ref);
          }
        }
        await delBatch.commit();
      }
      const insertBatch = writeBatch(db);
      for (const o of INITIAL_OUTLETS) {
        insertBatch.set(doc(db, OUTLETS_COL, o.id), o, { merge: true });
      }
      await insertBatch.commit();
      console.log(`Successfully synced ${INITIAL_OUTLETS.length} official Barista outlets.`);
      return INITIAL_OUTLETS.length;
    }
    return snap.size;
  } catch (error) {
    console.error('Sync official outlets error:', error);
    handleFirestoreError(error, OperationType.WRITE, OUTLETS_COL);
    throw error;
  }
}

export async function bulkAddOutlets(
  outletList: Array<{ name: string; location?: string; phone?: string }>
): Promise<void> {
  try {
    const snap = await getDocs(collection(db, OUTLETS_COL));
    let max = 0;
    snap.forEach((d) => {
      const data = d.data();
      const code = data.outletId as string;
      const match = code?.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    });
    let nextIndex = max + 1;
    for (const item of outletList) {
      const name = item.name.trim();
      if (!name) continue;
      const id = `outlet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const code = `OUT-${String(nextIndex).padStart(2, '0')}`;
      await setDoc(doc(db, OUTLETS_COL, id), {
        id,
        outletId: code,
        name,
        location: '',
        phone: item.phone?.trim() || '',
        active: true
      });
      nextIndex++;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, OUTLETS_COL);
    throw error;
  }
}

// ----------------- PRODUCTS -----------------
export function subscribeProducts(callback: (products: Product[]) => void) {
  const q = query(collection(db, PRODUCTS_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Product);
      });
      items.sort((a, b) => {
        const numA = parseInt((a.productId || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.productId || '').replace(/\D/g, ''), 10) || 0;
        if (numA !== numB) return numA - numB;
        return a.name.localeCompare(b.name);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, PRODUCTS_COL);
    }
  );
}

export function getNextProductCode(productsList: Product[]): string {
  let max = 0;
  for (const p of productsList) {
    const match = p.productId?.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  const nextNum = max > 0 ? max + 1 : productsList.length + 1;
  return `PRD-${String(nextNum).padStart(2, '0')}`;
}

export async function addProduct(product: {
  name: string;
  dispatchTemp: number;
  category?: string;
  keyCode?: string;
  shelfLifeDays?: number;
  unit?: string;
  active?: boolean;
}): Promise<string> {
  const name = product.name.trim();
  if (!name) {
    throw new Error('Product Name is compulsory.');
  }
  if (product.dispatchTemp === undefined || isNaN(product.dispatchTemp)) {
    throw new Error('Valid Dispatch Temperature ( C) is required.');
  }
  const id = `prd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  try {
    const snap = await getDocs(collection(db, PRODUCTS_COL));
    let max = 0;
    snap.forEach((d) => {
      const data = d.data();
      const code = data.productId as string;
      const match = code?.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    });
    const autoCode = `PRD-${String(max + 1).padStart(2, '0')}`;
    const cleanKeyCode = (product.keyCode && product.keyCode.trim()) 
      ? product.keyCode.trim().toUpperCase() 
      : getProductKeyCode(name);

    const newProduct: Product = {
      id,
      productId: autoCode,
      name,
      keyCode: cleanKeyCode,
      category: product.category?.trim() || 'Pastry Kitchen Items',
      dispatchTemp: Number(product.dispatchTemp),
      shelfLifeDays: product.shelfLifeDays ? Number(product.shelfLifeDays) : 5,
      unit: product.unit || 'NoS',
      active: product.active !== undefined ? product.active : true,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, PRODUCTS_COL, id), newProduct);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${PRODUCTS_COL}/${id}`);
    throw error;
  }
}

export async function updateProduct(
  id: string,
  updates: {
    name?: string;
    dispatchTemp?: number;
    category?: string;
    keyCode?: string;
    shelfLifeDays?: number;
    unit?: string;
    active?: boolean;
  }
): Promise<void> {
  try {
    const safeUpdates: any = {
      updatedAt: new Date().toISOString()
    };
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed) throw new Error('Product Name is compulsory.');
      safeUpdates.name = trimmed;
    }
    if (updates.keyCode !== undefined) {
      safeUpdates.keyCode = updates.keyCode.trim().toUpperCase();
    }
    if (updates.dispatchTemp !== undefined) {
      if (isNaN(updates.dispatchTemp)) throw new Error('Dispatch Temperature must be a valid number.');
      safeUpdates.dispatchTemp = Number(updates.dispatchTemp);
    }
    if (updates.category !== undefined) {
      safeUpdates.category = updates.category.trim() || 'Pastry Kitchen Items';
    }
    if (updates.unit !== undefined) {
      safeUpdates.unit = updates.unit.trim() || 'NoS';
    }
    if (updates.shelfLifeDays !== undefined) {
      safeUpdates.shelfLifeDays = Number(updates.shelfLifeDays);
    }
    if (updates.active !== undefined) {
      safeUpdates.active = updates.active;
    }
    await setDoc(doc(db, PRODUCTS_COL, id), safeUpdates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${PRODUCTS_COL}/${id}`);
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, PRODUCTS_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${PRODUCTS_COL}/${id}`);
    throw error;
  }
}

export async function deleteAllProducts(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, PRODUCTS_COL));
    if (snap.empty) return;
    let batch = writeBatch(db);
    let count = 0;
    const batchPromises = [];
    for (const d of snap.docs) {
      batch.delete(d.ref);
      count++;
      if (count >= 400) {
        batchPromises.push(batch.commit());
        batch = writeBatch(db);
        count = 0;
      }
    }
    if (count > 0) {
      batchPromises.push(batch.commit());
    }
    await Promise.all(batchPromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, PRODUCTS_COL);
    throw error;
  }
}

export async function syncOfficialProducts(force = false): Promise<number> {
  try {
    const snap = await getDocs(collection(db, PRODUCTS_COL));
    if (force || snap.empty) {
      console.log('Syncing official Barista product catalog to Firestore...');
      const insertBatch = writeBatch(db);
      for (const p of INITIAL_PRODUCT_CATALOG) {
        insertBatch.set(doc(db, PRODUCTS_COL, p.id), { ...p, unit: 'NoS' }, { merge: true });
      }
      await insertBatch.commit();
      console.log(`Successfully synced ${INITIAL_PRODUCT_CATALOG.length} official products.`);
      return INITIAL_PRODUCT_CATALOG.length;
    }
    return snap.size;
  } catch (error) {
    console.error('Sync official products error:', error);
    handleFirestoreError(error, OperationType.WRITE, PRODUCTS_COL);
    throw error;
  }
}

export async function bulkAddProducts(
  productList: Array<{ name: string; dispatchTemp?: number; category?: string; keyCode?: string; unit?: string; shelfLifeDays?: number }>
): Promise<void> {
  try {
    const snap = await getDocs(collection(db, PRODUCTS_COL));
    let max = 0;
    snap.forEach((d) => {
      const data = d.data();
      const code = data.productId as string;
      const match = code?.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    });
    let nextIndex = max + 1;
    for (const item of productList) {
      const name = item.name.trim();
      if (!name) continue;
      const id = `prd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const code = `PRD-${String(nextIndex).padStart(2, '0')}`;
      const temp = item.dispatchTemp !== undefined && !isNaN(item.dispatchTemp) ? item.dispatchTemp : 3.5;
      const cleanKey = item.keyCode && item.keyCode.trim() 
        ? item.keyCode.trim().toUpperCase() 
        : getProductKeyCode(name);

      await setDoc(doc(db, PRODUCTS_COL, id), {
        id,
        productId: code,
        name,
        keyCode: cleanKey,
        category: item.category?.trim() || 'Pastry Kitchen Items',
        dispatchTemp: Number(temp),
        shelfLifeDays: item.shelfLifeDays || 5,
        unit: 'NoS',
        active: true,
        createdAt: new Date().toISOString()
      });
      nextIndex++;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, PRODUCTS_COL);
    throw error;
  }
}

// ----------------- DRIVERS -----------------
export function subscribeDrivers(callback: (drivers: Driver[]) => void) {
  const q = query(collection(db, DRIVERS_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Driver[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Driver);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, DRIVERS_COL);
    }
  );
}

export async function addDriver(driver: Omit<Driver, 'id'>): Promise<string> {
  const id = `drv-${Date.now()}`;
  try {
    await setDoc(doc(db, DRIVERS_COL, id), { ...driver, id });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${DRIVERS_COL}/${id}`);
    throw error;
  }
}

// ----------------- DISPATCH LOGS (HACCP BCL/REC/HACCP/32) -----------------
export function subscribeDispatchLogs(callback: (logs: DispatchLog[]) => void) {
  const q = query(collection(db, DISPATCH_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: DispatchLog[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        if (data.deleted === true || data.isDeleted === true || data.status === 'deleted') {
          return;
        }
        items.push({ id: d.id, ...data } as DispatchLog);
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, DISPATCH_COL);
    }
  );
}

export async function createDispatchLogWithDeduction(
  dispatchData: Omit<DispatchLog, 'id' | 'createdAt'>,
  batches: InventoryBatch[]
): Promise<string> {
  const dispatchId = `disp-${Date.now()}`;
  try {
    const fullLog: DispatchLog = sanitizeForFirestore({
      ...dispatchData,
      id: dispatchId,
      createdAt: new Date().toISOString()
    });

    // 1. Save Dispatch Document as a separate new document
    await setDoc(doc(db, DISPATCH_COL, dispatchId), fullLog);

    // 2. If this is an edited revision from a previous document, link it
    let previousItemsMap: Record<string, number> = {};
    if (dispatchData.previousDocId) {
      try {
        const prevDocSnap = await getDoc(doc(db, DISPATCH_COL, dispatchData.previousDocId));
        if (prevDocSnap.exists()) {
          const prevData = prevDocSnap.data() as DispatchLog;
          (prevData.items || []).forEach(it => {
            if (it.batchNo) {
              previousItemsMap[it.batchNo] = (previousItemsMap[it.batchNo] || 0) + (it.quantity || 0);
            }
          });

          // Mark previous document as superseded by the new revision
          await updateDoc(doc(db, DISPATCH_COL, dispatchData.previousDocId), sanitizeForFirestore({
            supersededBy: dispatchId,
            supersededByDocName: fullLog.documentName,
            latestRevision: fullLog.revision,
            updatedAt: new Date().toISOString()
          }));
        }
      } catch (prevErr) {
        console.warn('Could not read or link previous dispatch document:', prevErr);
      }
    }

    // 3. Reconcile or adjust inventory quantities for each item dispatched
    const isRevision = Boolean(dispatchData.previousDocId);
    for (const item of dispatchData.items) {
      if (!item.batchNo) continue;
      
      const targetBatch = batches.find(b => b.batchNo === item.batchNo || b.id === item.batchId);
      if (targetBatch) {
        const prevLoggedQty = isRevision ? (previousItemsMap[item.batchNo] || 0) : 0;
        const netDifference = (item.quantity || 0) - prevLoggedQty;

        if (netDifference !== 0) {
          const prevQty = targetBatch.quantity;
          const newQty = Math.max(0, prevQty - netDifference);

          const batchRef = doc(db, BATCHES_COL, targetBatch.id);
          await updateDoc(batchRef, {
            quantity: newQty,
            updatedAt: new Date().toISOString()
          });

          await addBatchLog({
            batchId: targetBatch.id,
            batchNo: targetBatch.batchNo,
            productName: item.productName || targetBatch.productName,
            action: netDifference > 0 ? 'dispatch_deduction' : 'manual_adjustment',
            quantityChanged: -netDifference,
            previousQty: prevQty,
            newQty: newQty,
            referenceId: dispatchId,
            outletName: dispatchData.outletNames.join(', '),
            driverName: dispatchData.driverName,
            recordedBy: dispatchData.supervisor,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return dispatchId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${DISPATCH_COL}/${dispatchId}`);
    throw error;
  }
}

export async function updateDispatchLog(
  id: string, 
  updates: Partial<DispatchLog>
): Promise<void> {
  try {
    const cleanUpdates = sanitizeForFirestore({
      ...updates,
      status: 'edited',
      updatedAt: new Date().toISOString()
    });
    await updateDoc(doc(db, DISPATCH_COL, id), cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${DISPATCH_COL}/${id}`);
    throw error;
  }
}

export async function deleteDispatchLog(_id: string): Promise<void> {
  throw new Error('HACCP Audit Security Protocol: Submitted dispatch logs cannot be deleted once committed. Use "Edit (New Revision)" to generate an updated revision document.');
}

// ----------------- MONTHLY DISPATCH CYCLE (Resets each month 1st @ 12:00 AM) -----------------
const CYCLE_STORAGE_KEY = 'barista_monthly_dispatch_cycle';

export function getDefaultMonthlyCycle(): MonthlyDispatchCycle {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const cycleMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
  const firstOfMonth = new Date(year, month, 1, 0, 0, 0, 0);

  return {
    lastResetAt: firstOfMonth.toISOString(),
    resetBy: 'Automated System (1st 12:00 AM)',
    resetReason: 'Monthly 1st 12:00 AM automatic cycle rollover',
    cycleMonth,
    archivedCount: 0
  };
}

export function subscribeMonthlyCycle(callback: (cycle: MonthlyDispatchCycle) => void): () => void {
  try {
    const cached = localStorage.getItem(CYCLE_STORAGE_KEY);
    if (cached) {
      callback(JSON.parse(cached));
    } else {
      callback(getDefaultMonthlyCycle());
    }
  } catch (e) {
    callback(getDefaultMonthlyCycle());
  }

  const cycleDocRef = doc(db, 'system_metadata', 'dispatch_cycle');
  return onSnapshot(
    cycleDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as MonthlyDispatchCycle;
        try {
          localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(data));
        } catch (_) {}
        callback(data);
      } else {
        const def = getDefaultMonthlyCycle();
        callback(def);
      }
    },
    (err) => {
      console.warn('Could not subscribe to dispatch_cycle in Firestore, using local fallback:', err);
    }
  );
}

export async function resetMonthlyDispatchCycle(
  performedBy: string,
  purgeDispatches: boolean = false,
  reason: string = 'Manual Admin Reset'
): Promise<MonthlyDispatchCycle> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const cycleMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  const cycleData: MonthlyDispatchCycle = {
    lastResetAt: now.toISOString(),
    resetBy: performedBy || 'Admin',
    resetReason: reason,
    cycleMonth,
    archivedCount: 0
  };

  try {
    if (purgeDispatches) {
      const snap = await getDocs(collection(db, DISPATCH_COL));
      if (!snap.empty) {
        let batch = writeBatch(db);
        let count = 0;
        const promises = [];
        for (const d of snap.docs) {
          batch.delete(d.ref);
          count++;
          if (count >= 400) {
            promises.push(batch.commit());
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) promises.push(batch.commit());
        await Promise.all(promises);
      }
    }

    await setDoc(doc(db, 'system_metadata', 'dispatch_cycle'), cycleData, { merge: true });
    try {
      localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(cycleData));
    } catch (_) {}
  } catch (err) {
    console.warn('Error saving dispatch_cycle to Firestore, cached in localStorage:', err);
    try {
      localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(cycleData));
    } catch (_) {}
  }

  return cycleData;
}

export async function checkAndApplyAutomaticMonthlyReset(): Promise<MonthlyDispatchCycle> {
  const defaultCycle = getDefaultMonthlyCycle();
  try {
    const cycleDocRef = doc(db, 'system_metadata', 'dispatch_cycle');
    const snap = await getDoc(cycleDocRef);
    if (!snap.exists()) {
      await setDoc(cycleDocRef, defaultCycle, { merge: true });
      try {
        localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(defaultCycle));
      } catch (_) {}
      return defaultCycle;
    }

    const currentData = snap.data() as MonthlyDispatchCycle;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const currentMonthPrefix = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
    const firstOfMonth = new Date(currentYear, currentMonthIndex, 1, 0, 0, 0, 0);

    if (
      !currentData.cycleMonth ||
      currentData.cycleMonth !== currentMonthPrefix ||
      new Date(currentData.lastResetAt).getTime() < firstOfMonth.getTime()
    ) {
      const updatedCycle: MonthlyDispatchCycle = {
        lastResetAt: firstOfMonth.toISOString(),
        resetBy: 'Automated System (1st 12:00 AM)',
        resetReason: 'Automatic Monthly 1st 12:00 AM cycle reset',
        cycleMonth: currentMonthPrefix,
        archivedCount: 0
      };
      await setDoc(cycleDocRef, updatedCycle, { merge: true });
      try {
        localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(updatedCycle));
      } catch (_) {}
      return updatedCycle;
    }
    return currentData;
  } catch (e) {
    return defaultCycle;
  }
}

// ----------------- USERS & ACCESS MANAGEMENT -----------------
export function subscribeUsers(callback: (users: UserProfile[]) => void) {
  const q = query(collection(db, USERS_COL));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: UserProfile[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as UserProfile);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, USERS_COL);
    }
  );
}

export async function createNewUser(user: Omit<UserProfile, 'id'>): Promise<string> {
  const cleanUsername = (user.username || '').trim().toLowerCase();
  if (!cleanUsername) {
    throw new Error('Username is compulsory and cannot be empty.');
  }

  try {
    const q = query(collection(db, USERS_COL), where('username', '==', cleanUsername));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error(`Username "${cleanUsername}" is already in use by another active account.`);
    }
  } catch (checkErr: any) {
    if (checkErr.message?.includes('already in use')) throw checkErr;
    console.warn('Could not verify username uniqueness in Firestore:', checkErr);
  }

  try {
    await deleteDoc(doc(db, 'deleted_users', cleanUsername));
  } catch (e) {
    // Ignore tombstone delete failure
  }

  const id = user.uid || `user-${Date.now()}`;
  try {
    await setDoc(doc(db, USERS_COL, id), {
      ...user,
      id,
      uid: id,
      username: cleanUsername,
      status: user.status || 'active'
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${USERS_COL}/${id}`);
    throw error;
  }
}

export async function updateUserRoleAndPermissions(
  userId: string,
  role: UserRole,
  permissions: any,
  _userIdCode?: string,
  password?: string,
  extraUpdates?: {
    username?: string;
    displayName?: string;
    designation?: string;
    department?: string;
    status?: 'active' | 'suspended';
  }
): Promise<void> {
  try {
    const updateData: any = {
      role,
      permissions,
      updatedAt: new Date().toISOString()
    };
    if (password && password.trim().length > 0) {
      updateData.password = password.trim();
    }
    if (extraUpdates) {
      if (extraUpdates.username) updateData.username = extraUpdates.username.trim().toLowerCase();
      if (extraUpdates.displayName) updateData.displayName = extraUpdates.displayName.trim();
      if (extraUpdates.designation) updateData.designation = extraUpdates.designation.trim();
      if (extraUpdates.department) updateData.department = extraUpdates.department.trim();
      if (extraUpdates.status) updateData.status = extraUpdates.status;
    }
    await setDoc(doc(db, USERS_COL, userId), updateData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${userId}`);
    throw error;
  }
}

export async function toggleUserStatus(
  userId: string,
  status: 'active' | 'suspended',
  fullUser?: UserProfile
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COL, userId);
    const payload: any = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (fullUser) {
      await setDoc(userRef, { ...fullUser, ...payload }, { merge: true });
    } else {
      await setDoc(userRef, payload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${userId}`);
    throw error;
  }
}

export async function updateUserPassword(
  userId: string,
  newPassword: string,
  clearMustReset: boolean = true
): Promise<void> {
  try {
    const updatePayload: any = {
      password: newPassword.trim(),
      updatedAt: new Date().toISOString()
    };
    if (clearMustReset) {
      updatePayload.mustResetPassword = false;
      updatePayload.isFirstLogin = false;
    }
    await setDoc(doc(db, USERS_COL, userId), updatePayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${userId}`);
    throw error;
  }
}

export async function adminResetUserPassword(
  userId: string,
  newPassword: string,
  requireResetOnLogin: boolean = true
): Promise<void> {
  try {
    await setDoc(doc(db, USERS_COL, userId), {
      password: newPassword.trim(),
      mustResetPassword: requireResetOnLogin,
      isFirstLogin: requireResetOnLogin,
      tempPasswordSetAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${userId}`);
    throw error;
  }
}

export async function deleteUserRecord(userId: string): Promise<void> {
  try {
    const userDocRef = doc(db, USERS_COL, userId);
    let deletedUsername = '';
    let deletedCode = '';
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        deletedUsername = (data?.username || '').trim().toLowerCase();
        deletedCode = (data?.userIdCode || '').trim().toLowerCase();
      }
    } catch (e) {
      console.warn('Could not read user before delete:', e);
    }
    
    await deleteDoc(userDocRef);

    if (deletedUsername && deletedUsername !== 'admin') {
      try {
        await setDoc(doc(db, 'deleted_users', deletedUsername), {
          username: deletedUsername,
          userId,
          deletedAt: new Date().toISOString()
        });
        if (deletedCode) {
          await setDoc(doc(db, 'deleted_users', deletedCode), {
            username: deletedUsername,
            userIdCode: deletedCode,
            userId,
            deletedAt: new Date().toISOString()
          });
        }
      } catch (tombErr) {
        console.warn('Could not record deleted_user tombstone:', tombErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${USERS_COL}/${userId}`);
    throw error;
  }
}
