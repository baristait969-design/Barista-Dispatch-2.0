import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Search, 
  Download, 
  Edit, 
  Trash2, 
  History, 
  ThermometerSnowflake, 
  X, 
  Filter, 
  Lock, 
  Boxes, 
  Layers, 
  ArrowUpDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  RotateCcw,
  ShieldAlert,
  Calendar,
  FileText
} from 'lucide-react';
import { InventoryBatch, BatchLog, Product, DamagedItem } from '../types';
import { INITIAL_PRODUCTS } from '../data/seedData';
import { 
  addInventoryBatch, 
  updateInventoryBatch, 
  deleteInventoryBatch,
  recordDamagedStock,
  updateDamagedStock,
  restoreDamagedStock,
  deleteDamagedStock,
  rectifyExpiredBatch,
  disposeExpiredBatch,
  subscribeDamagedItems
} from '../services/dataService';
import { getNextBatchNumberForProduct } from '../utils/batchUtils';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useModal } from '../context/ModalDialogContext';
import { calculateFutureDate, renderUnitBadge } from '../utils/productUtils';

interface InventoryViewProps {
  batches: InventoryBatch[];
  batchLogs: BatchLog[];
  products?: Product[];
  damagedItems?: DamagedItem[];
  onRefresh?: () => void;
}

const normalizeCategory = (cat?: string): 'Hot Kitchen' | 'Pastry Kitchen' => {
  if (!cat) return 'Pastry Kitchen';
  const lower = cat.toLowerCase();
  if (lower.includes('hot') || lower.includes('savory') || lower.includes('beverage')) {
    return 'Hot Kitchen';
  }
  return 'Pastry Kitchen';
};

const DAMAGE_REASONS = [
  'Physical Damage / Dropped',
  'Packaging Damaged / Broken Seal',
  'Temperature Fluctuation / Thawed',
  'Quality / Texture Defect',
  'Foreign Matter / Contamination',
  'Handling Accident in Kitchen',
  'Other Defect'
];

export const InventoryView: React.FC<InventoryViewProps> = ({
  batches,
  batchLogs,
  products,
  damagedItems: propDamagedItems
}) => {
  const { role, userProfile } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const canEdit = role === 'admin' || role === 'editor';

  // Subscribed damaged items state (uses prop if passed, fallback to internal subscription)
  const [internalDamagedItems, setInternalDamagedItems] = useState<DamagedItem[]>([]);
  useEffect(() => {
    if (!propDamagedItems) {
      const unsub = subscribeDamagedItems((items) => {
        setInternalDamagedItems(items || []);
      });
      return () => unsub();
    }
  }, [propDamagedItems]);

  const damagedList = propDamagedItems || internalDamagedItems;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Navigation tabs: Permanent, non-changing buttons
  const [viewMode, setViewMode] = useState<'product_wise' | 'batches' | 'expired' | 'damaged'>('product_wise');

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [productSortBy, setProductSortBy] = useState<'quantity_desc' | 'quantity_asc' | 'name_asc' | 'expiry_asc'>('quantity_desc');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null);
  const [selectedBatchForLogs, setSelectedBatchForLogs] = useState<InventoryBatch | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<InventoryBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Expired rectification modal
  const [batchToRectify, setBatchToRectify] = useState<InventoryBatch | null>(null);
  const [rectifyUseByDate, setRectifyUseByDate] = useState('');
  const [rectifyProdDate, setRectifyProdDate] = useState('');
  const [rectifyQuantity, setRectifyQuantity] = useState<number>(0);
  const [rectifyNotes, setRectifyNotes] = useState('');
  const [rectifying, setRectifying] = useState(false);

  // Damaged items modals
  const [showRecordDamagedModal, setShowRecordDamagedModal] = useState(false);
  const [damagedTargetProduct, setDamagedTargetProduct] = useState('');
  const [damagedTargetBatchId, setDamagedTargetBatchId] = useState('');
  const [damagedQty, setDamagedQty] = useState<number>(1);
  const [damagedReason, setDamagedReason] = useState(DAMAGE_REASONS[0]);
  const [damagedNotes, setDamagedNotes] = useState('');
  const [damagedDate, setDamagedDate] = useState(todayStr);
  const [savingDamaged, setSavingDamaged] = useState(false);

  // Editing existing damaged record
  const [editingDamagedItem, setEditingDamagedItem] = useState<DamagedItem | null>(null);
  const [editDamagedQty, setEditDamagedQty] = useState<number>(1);
  const [editDamagedReason, setEditDamagedReason] = useState('');
  const [editDamagedNotes, setEditDamagedNotes] = useState('');
  const [savingDamagedEdit, setSavingDamagedEdit] = useState(false);

  // Confirm write-off modal
  const [batchToDispose, setBatchToDispose] = useState<InventoryBatch | null>(null);
  const [disposing, setDisposing] = useState(false);

  // Helper to check if a batch is expired
  const isBatchExpired = (b: InventoryBatch): boolean => {
    if (b.status === 'disposed') return false;
    if (b.isExpired === true || b.status === 'expired') return true;
    if (b.useByDate && b.useByDate < todayStr && (b.quantity || 0) > 0) return true;
    return false;
  };

  // EXPIRED BATCHES LIST (Batches expired that still have stock > 0)
  const expiredBatches = useMemo(() => {
    return batches.filter(b => isBatchExpired(b) && (b.quantity || 0) > 0);
  }, [batches, todayStr]);

  // PRODUCT-WISE QUANTITY COUNT AGGREGATION
  // STRICT RULE: Expired items and Damaged items MUST NOT appear in Product-Wise stock count!
  const productWiseStock = useMemo(() => {
    const catalog = products && products.length > 0 ? products : INITIAL_PRODUCTS;
    const productMap = new Map<string, {
      productName: string;
      category: 'Hot Kitchen' | 'Pastry Kitchen';
      unit: string;
      totalQuantity: number; // ONLY good, sellable, unexpired, undamaged units!
      initialTotalQuantity: number;
      batches: InventoryBatch[];
      expiredBatchesCount: number;
      expiredUnitsCount: number;
      earliestExpiry: string | null;
      latestProdDate: string | null;
      dispatchTemp: number;
      shelfLifeDays?: number;
    }>();

    // Populate catalog active products
    catalog.forEach((p) => {
      if (p.active === false) return;
      const key = p.name.trim().toLowerCase();
      productMap.set(key, {
        productName: p.name,
        category: normalizeCategory(p.category),
        unit: ('unit' in p && p.unit) ? p.unit : 'Slices',
        totalQuantity: 0,
        initialTotalQuantity: 0,
        batches: [],
        expiredBatchesCount: 0,
        expiredUnitsCount: 0,
        earliestExpiry: null,
        latestProdDate: null,
        dispatchTemp: ('dispatchTemp' in p && p.dispatchTemp !== undefined) 
          ? Number(p.dispatchTemp) 
          : (('defaultTemp' in (p as any)) ? Number((p as any).defaultTemp) : 3.5),
        shelfLifeDays: ('shelfLifeDays' in p && p.shelfLifeDays) ? p.shelfLifeDays : 5
      });
    });

    // Aggregate batches into productMap
    batches.forEach(b => {
      const key = b.productName.trim().toLowerCase();
      let item = productMap.get(key);
      if (!item) {
        item = {
          productName: b.productName,
          category: normalizeCategory(b.category),
          unit: b.unit || 'Slices',
          totalQuantity: 0,
          initialTotalQuantity: 0,
          batches: [],
          expiredBatchesCount: 0,
          expiredUnitsCount: 0,
          earliestExpiry: null,
          latestProdDate: null,
          dispatchTemp: b.dispatchTemp || 3.5
        };
        productMap.set(key, item);
      }

      const expired = isBatchExpired(b);
      const isDamaged = b.status === 'damaged';

      if (expired) {
        // Automatically quarantined from sellable stock!
        item.expiredBatchesCount += 1;
        item.expiredUnitsCount += (b.quantity || 0);
      } else if (!isDamaged && (b.quantity || 0) > 0) {
        // ONLY active, unexpired, undamaged stock counts in product-wise inventory!
        item.totalQuantity += (b.quantity || 0);

        if (b.useByDate) {
          if (!item.earliestExpiry || b.useByDate < item.earliestExpiry) {
            item.earliestExpiry = b.useByDate;
          }
        }
      }

      item.initialTotalQuantity += (b.initialQuantity || b.quantity || 0);
      item.batches.push(b);

      if (b.prodDate) {
        if (!item.latestProdDate || b.prodDate > item.latestProdDate) {
          item.latestProdDate = b.prodDate;
        }
      }
    });

    return Array.from(productMap.values());
  }, [batches, products, todayStr]);

  // Filtered & Sorted Product-Wise Stock
  const filteredProductWiseStock = useMemo(() => {
    let list = productWiseStock.filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      return matchesSearch && matchesCategory;
    });

    list.sort((a, b) => {
      if (productSortBy === 'quantity_desc') return b.totalQuantity - a.totalQuantity;
      if (productSortBy === 'quantity_asc') return a.totalQuantity - b.totalQuantity;
      if (productSortBy === 'name_asc') return a.productName.localeCompare(b.productName);
      if (productSortBy === 'expiry_asc') {
        if (!a.earliestExpiry) return 1;
        if (!b.earliestExpiry) return -1;
        return a.earliestExpiry.localeCompare(b.earliestExpiry);
      }
      return 0;
    });

    return list;
  }, [productWiseStock, searchTerm, filterCategory, productSortBy]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      const matchesSearch = 
        batch.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const normCat = normalizeCategory(batch.category);
      const matchesCategory = filterCategory === 'all' || normCat === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [batches, searchTerm, filterCategory]);

  // Filtered Expired Batches
  const filteredExpiredBatches = useMemo(() => {
    return expiredBatches.filter(batch => {
      const matchesSearch = 
        batch.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const normCat = normalizeCategory(batch.category);
      const matchesCategory = filterCategory === 'all' || normCat === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expiredBatches, searchTerm, filterCategory]);

  // Filtered Damaged Items
  const filteredDamagedItems = useMemo(() => {
    return damagedList.filter(item => {
      const matchesSearch = 
        (item.batchNo && item.batchNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.reason && item.reason.toLowerCase().includes(searchTerm.toLowerCase()));
      const normCat = normalizeCategory(item.category);
      const matchesCategory = filterCategory === 'all' || normCat === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [damagedList, searchTerm, filterCategory]);

  // Operational KPI metrics
  const totalSellableStockUnits = useMemo(() => {
    return productWiseStock.reduce((sum, p) => sum + p.totalQuantity, 0);
  }, [productWiseStock]);

  const totalExpiredStockUnits = useMemo(() => {
    return expiredBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
  }, [expiredBatches]);

  const totalDamagedUnits = useMemo(() => {
    return damagedList.reduce((sum, d) => sum + (d.quantity || 0), 0);
  }, [damagedList]);

  const lowStockCount = useMemo(() => {
    return productWiseStock.filter(p => p.totalQuantity > 0 && p.totalQuantity <= 15).length;
  }, [productWiseStock]);

  const outOfStockCount = useMemo(() => {
    return productWiseStock.filter(p => p.totalQuantity === 0).length;
  }, [productWiseStock]);

  // Form State for creating batch
  const initialProduct = (products && products.length > 0 ? products[0] : INITIAL_PRODUCTS[0]);
  const initialProductName = initialProduct.name;
  const initialShelfDays = (initialProduct && 'shelfLifeDays' in initialProduct && initialProduct.shelfLifeDays) ? initialProduct.shelfLifeDays : 5;
  const initialTemp = (initialProduct && 'dispatchTemp' in initialProduct && initialProduct.dispatchTemp !== undefined) ? initialProduct.dispatchTemp : 3.5;
  const initialUnit = (initialProduct && 'unit' in initialProduct && initialProduct.unit) ? initialProduct.unit : 'Slices';

  const [formData, setFormData] = useState(() => ({
    batchNo: getNextBatchNumberForProduct(initialProductName, batches, products),
    productName: initialProductName,
    category: normalizeCategory(initialProduct.category),
    quantity: 50,
    prodDate: todayStr,
    useByDate: calculateFutureDate(todayStr, initialShelfDays),
    dispatchTemp: initialTemp,
    unit: initialUnit
  }));

  const categories = ['Hot Kitchen', 'Pastry Kitchen'];

  const selectedProductMeta = useMemo(() => {
    const activeProducts = products && products.length > 0 ? products : [];
    return activeProducts.find(p => p.name === formData.productName) || 
           INITIAL_PRODUCTS.find(p => p.name === formData.productName);
  }, [products, formData.productName]);

  const handleProductSelect = (pName: string) => {
    const activeProducts = products && products.length > 0 ? products : [];
    const found = activeProducts.find(p => p.name === pName) || INITIAL_PRODUCTS.find(p => p.name === pName);
    const autoBatchNo = getNextBatchNumberForProduct(pName, batches, products);

    if (found) {
      const shelfDays = ('shelfLifeDays' in found && found.shelfLifeDays) ? found.shelfLifeDays : 5;
      const defTemp = ('dispatchTemp' in found && found.dispatchTemp !== undefined) 
        ? found.dispatchTemp 
        : (('defaultTemp' in (found as any)) ? (found as any).defaultTemp : 3.5);
      
      const futureDate = calculateFutureDate(formData.prodDate, shelfDays);

      setFormData(prev => ({
        ...prev,
        batchNo: autoBatchNo,
        productName: found.name,
        category: normalizeCategory(found.category),
        dispatchTemp: Number(defTemp),
        unit: ('unit' in found && found.unit) ? found.unit : 'Slices',
        useByDate: futureDate
      }));
    } else {
      setFormData(prev => ({ ...prev, productName: pName, batchNo: autoBatchNo }));
    }
  };

  const handleProdDateChange = (newProdDate: string) => {
    const shelfDays = (selectedProductMeta && 'shelfLifeDays' in selectedProductMeta && selectedProductMeta.shelfLifeDays) 
      ? selectedProductMeta.shelfLifeDays 
      : 5;
    const autoUseBy = calculateFutureDate(newProdDate, shelfDays);
    setFormData(prev => ({
      ...prev,
      prodDate: newProdDate,
      useByDate: autoUseBy
    }));
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setSubmitting(true);
    try {
      const assignedBatchNo = formData.batchNo.trim() || getNextBatchNumberForProduct(formData.productName, batches, products);
      await addInventoryBatch({
        batchNo: assignedBatchNo,
        productName: formData.productName,
        category: formData.category,
        initialQuantity: Number(formData.quantity),
        quantity: Number(formData.quantity),
        prodDate: formData.prodDate,
        useByDate: formData.useByDate,
        dispatchTemp: Number(formData.dispatchTemp),
        unit: formData.unit,
        createdBy: userProfile?.displayName || userProfile?.email || 'Central Kitchen Staff'
      });

      setShowAddModal(false);
      const updatedBatches = [...batches, { id: 'temp', batchNo: assignedBatchNo, productName: formData.productName } as any];
      const nextBatch = getNextBatchNumberForProduct(formData.productName, updatedBatches, products);
      setFormData(prev => ({
        ...prev,
        batchNo: nextBatch,
        quantity: 50,
        prodDate: todayStr,
        useByDate: calculateFutureDate(todayStr, 5)
      }));

      showAlert(`Batch ${assignedBatchNo} (${formData.productName}) registered successfully!`, {
        title: 'Batch Created',
        type: 'success'
      });
    } catch (err) {
      showAlert('Error creating batch: ' + (err as any)?.message, {
        title: 'Operation Failed',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch || !canEdit) return;

    setSubmitting(true);
    try {
      await updateInventoryBatch(
        editingBatch.id,
        {
          batchNo: editingBatch.batchNo,
          productName: editingBatch.productName,
          quantity: Number(editingBatch.quantity),
          prodDate: editingBatch.prodDate,
          useByDate: editingBatch.useByDate,
          dispatchTemp: Number(editingBatch.dispatchTemp),
          unit: editingBatch.unit
        },
        userProfile?.displayName || userProfile?.email || 'Staff'
      );
      setEditingBatch(null);
      showAlert(`Batch ${editingBatch.batchNo} successfully updated.`, {
        title: 'Batch Updated',
        type: 'success'
      });
    } catch (err) {
      showAlert('Error updating batch: ' + (err as any)?.message, {
        title: 'Update Failed',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteBatch = async () => {
    if (!batchToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInventoryBatch(batchToDelete.id);
      setBatchToDelete(null);
      showAlert('Inventory batch removed successfully.', {
        title: 'Batch Deleted',
        type: 'success'
      });
    } catch (err) {
      showAlert('Error deleting batch: ' + (err as any)?.message, {
        title: 'Delete Failed',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // RECTIFY EXPIRED BATCH (If user made a mistake in date or quantity)
  const openRectifyModal = (batch: InventoryBatch) => {
    setBatchToRectify(batch);
    setRectifyUseByDate(batch.useByDate || todayStr);
    setRectifyProdDate(batch.prodDate || todayStr);
    setRectifyQuantity(batch.quantity || 0);
    setRectifyNotes('');
  };

  const handleSaveRectification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchToRectify || !canEdit) return;

    setRectifying(true);
    try {
      await rectifyExpiredBatch(
        batchToRectify.id,
        {
          useByDate: rectifyUseByDate,
          prodDate: rectifyProdDate,
          quantity: Number(rectifyQuantity),
          notes: rectifyNotes || 'Corrected expiration date by staff'
        },
        userProfile?.displayName || userProfile?.email || 'Staff'
      );

      const willBeActive = rectifyUseByDate >= todayStr && Number(rectifyQuantity) > 0;
      setBatchToRectify(null);

      showAlert(
        willBeActive 
          ? `Batch ${batchToRectify.batchNo} expiration rectified successfully! Since the Use-By date is now ${rectifyUseByDate}, the batch has been restored to active good inventory and will appear in product-wise stock count.`
          : `Batch ${batchToRectify.batchNo} updated. The Use-By date remains in the past, so it remains in the expired holding section.`,
        {
          title: 'Expiration Rectified',
          type: 'success'
        }
      );
    } catch (err) {
      showAlert('Error rectifying expiration date: ' + (err as any)?.message, {
        title: 'Operation Failed',
        type: 'error'
      });
    } finally {
      setRectifying(false);
    }
  };

  const handleDisposeExpired = async () => {
    if (!batchToDispose || !canEdit) return;
    setDisposing(true);
    try {
      await disposeExpiredBatch(
        batchToDispose.id,
        userProfile?.displayName || userProfile?.email || 'Staff'
      );
      const bNo = batchToDispose.batchNo;
      setBatchToDispose(null);
      showAlert(`Expired batch ${bNo} has been written off and removed from active holding.`, {
        title: 'Batch Disposed',
        type: 'success'
      });
    } catch (err) {
      showAlert('Error disposing batch: ' + (err as any)?.message, {
        title: 'Error',
        type: 'error'
      });
    } finally {
      setDisposing(false);
    }
  };

  // RECORD DAMAGED STOCK
  const openRecordDamagedModal = (preselectedProduct?: string, preselectedBatch?: InventoryBatch) => {
    if (preselectedBatch && isBatchExpired(preselectedBatch)) {
      showAlert(`Batch ${preselectedBatch.batchNo} is expired. Expired stock cannot be reported as damaged as it is already quarantined under Expired Stock.`, {
        title: 'Batch Expired',
        type: 'warning'
      });
      return;
    }

    const defaultProd = preselectedProduct || (products && products.length > 0 ? products[0].name : INITIAL_PRODUCTS[0].name);
    setDamagedTargetProduct(defaultProd);

    if (preselectedBatch) {
      setDamagedTargetBatchId(preselectedBatch.id);
      setDamagedQty(1);
    } else {
      const availBatches = batches.filter(b => b.productName === defaultProd && (b.quantity || 0) > 0 && !isBatchExpired(b));
      setDamagedTargetBatchId(availBatches.length > 0 ? availBatches[0].id : '');
      setDamagedQty(1);
    }

    setDamagedReason(DAMAGE_REASONS[0]);
    setDamagedNotes('');
    setDamagedDate(todayStr);
    setShowRecordDamagedModal(true);
  };

  const availableBatchesForDamagedProduct = useMemo(() => {
    return batches.filter(b => b.productName === damagedTargetProduct && (b.quantity || 0) > 0 && !isBatchExpired(b));
  }, [batches, damagedTargetProduct, todayStr]);

  const selectedBatchForDamage = useMemo(() => {
    return batches.find(b => b.id === damagedTargetBatchId && !isBatchExpired(b));
  }, [batches, damagedTargetBatchId, todayStr]);

  const handleSaveDamagedRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!selectedBatchForDamage) {
      showAlert('Please select a valid, unexpired production batch with remaining stock to report damaged items from.', {
        title: 'Batch Required',
        type: 'warning'
      });
      return;
    }

    if (isBatchExpired(selectedBatchForDamage)) {
      showAlert(`Cannot record damaged stock from batch ${selectedBatchForDamage.batchNo} because it has expired. Expired items are already automatically quarantined under Expired Stock.`, {
        title: 'Expired Batch Not Allowed',
        type: 'error'
      });
      return;
    }

    const availableStock = selectedBatchForDamage.quantity || 0;
    const parsedQty = Number(damagedQty);

    if (isNaN(parsedQty) || parsedQty <= 0) {
      showAlert('Damaged quantity must be a positive number of at least 1 unit.', { 
        title: 'Invalid Quantity', 
        type: 'warning' 
      });
      return;
    }

    if (!Number.isInteger(parsedQty)) {
      showAlert('Damaged quantity must be an integer whole number.', { 
        title: 'Invalid Quantity', 
        type: 'warning' 
      });
      return;
    }

    if (parsedQty > availableStock) {
      showAlert(`Damaged quantity (${parsedQty}) exceeds available unexpired stock in batch ${selectedBatchForDamage.batchNo} (${availableStock} ${selectedBatchForDamage.unit}). Please enter a quantity between 1 and ${availableStock}.`, {
        title: 'Quantity Exceeds Stock',
        type: 'error'
      });
      return;
    }

    setSavingDamaged(true);
    try {
      await recordDamagedStock(
        {
          productName: selectedBatchForDamage.productName,
          category: normalizeCategory(selectedBatchForDamage.category),
          batchNo: selectedBatchForDamage.batchNo,
          batchId: selectedBatchForDamage.id,
          quantity: parsedQty,
          unit: selectedBatchForDamage.unit || 'Slices',
          reason: damagedReason,
          notes: damagedNotes,
          damagedDate: damagedDate,
          reportedBy: userProfile?.displayName || userProfile?.email || 'Central Kitchen Staff'
        },
        userProfile?.displayName || userProfile?.email || 'Staff'
      );

      setShowRecordDamagedModal(false);
      showAlert(`Recorded ${parsedQty} damaged ${selectedBatchForDamage.unit} of ${selectedBatchForDamage.productName} (Batch: ${selectedBatchForDamage.batchNo}). This stock has been deducted from active inventory and moved to the Damaged Stock tab.`, {
        title: 'Damaged Stock Recorded',
        type: 'success'
      });
    } catch (err) {
      showAlert('Error recording damaged items: ' + (err as any)?.message, {
        title: 'Operation Failed',
        type: 'error'
      });
    } finally {
      setSavingDamaged(false);
    }
  };

  // EDIT DAMAGED RECORD
  const openEditDamagedModal = (item: DamagedItem) => {
    setEditingDamagedItem(item);
    setEditDamagedQty(item.quantity);
    setEditDamagedReason(item.reason);
    setEditDamagedNotes(item.notes || '');
  };

  const handleUpdateDamagedRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDamagedItem || !canEdit) return;

    const parsedQty = Number(editDamagedQty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      showAlert('Damaged quantity must be at least 1 unit.', {
        title: 'Invalid Quantity',
        type: 'warning'
      });
      return;
    }

    if (!Number.isInteger(parsedQty)) {
      showAlert('Damaged quantity must be a whole number.', {
        title: 'Invalid Quantity',
        type: 'warning'
      });
      return;
    }

    const linkedBatch = batches.find(b => b.id === editingDamagedItem.batchId || b.batchNo === editingDamagedItem.batchNo);
    const availableBatchQty = linkedBatch?.quantity || 0;
    const additionalNeeded = parsedQty - editingDamagedItem.quantity;

    if (additionalNeeded > availableBatchQty) {
      showAlert(`Cannot increase damaged quantity by ${additionalNeeded}. Available stock in batch ${editingDamagedItem.batchNo} is only ${availableBatchQty}.`, {
        title: 'Exceeds Available Stock',
        type: 'error'
      });
      return;
    }

    setSavingDamagedEdit(true);
    try {
      await updateDamagedStock(
        editingDamagedItem.id,
        {
          quantity: parsedQty,
          reason: editDamagedReason,
          notes: editDamagedNotes
        },
        editingDamagedItem.quantity,
        userProfile?.displayName || userProfile?.email || 'Staff'
      );

      const diff = editingDamagedItem.quantity - parsedQty;
      setEditingDamagedItem(null);
      showAlert(
        `Damaged record updated. ${diff > 0 ? `${diff} units returned back to batch ${editingDamagedItem.batchNo}.` : diff < 0 ? `${Math.abs(diff)} additional units deducted from batch ${editingDamagedItem.batchNo}.` : 'Details updated.'}`,
        {
          title: 'Damaged Record Updated',
          type: 'success'
        }
      );
    } catch (err) {
      showAlert('Error updating damaged record: ' + (err as any)?.message, {
        title: 'Update Failed',
        type: 'error'
      });
    } finally {
      setSavingDamagedEdit(false);
    }
  };

  // RESTORE DAMAGED STOCK BACK TO GOOD INVENTORY (Undo Mistake)
  const handleRestoreDamagedToGood = async (item: DamagedItem) => {
    if (!canEdit) return;

    const confirmed = await showConfirm(
      `Are you sure you want to restore ${item.quantity} ${item.unit} of "${item.productName}" (Batch: ${item.batchNo || 'N/A'}) back to active inventory?`,
      {
        title: 'Restore Stock Confirmation',
        type: 'warning',
        confirmText: 'Yes, Restore Stock',
        cancelText: 'Cancel'
      }
    );

    if (!confirmed) return;

    try {
      await restoreDamagedStock(
        item.id,
        userProfile?.displayName || userProfile?.email || 'Staff'
      );

      showAlert(`Restored ${item.quantity} ${item.unit} of ${item.productName} (Batch: ${item.batchNo}) back to active good inventory. The items now reappear in the product-wise stock count.`, {
        title: 'Restored to Active Stock',
        type: 'success'
      });
    } catch (err) {
      showAlert('Error restoring stock: ' + (err as any)?.message, {
        title: 'Restore Failed',
        type: 'error'
      });
    }
  };

  // EXPORT CSV
  const exportConsolidatedCSV = () => {
    if (viewMode === 'damaged') {
      const headers = ['Damaged Date', 'Product Name', 'Category', 'Batch No', 'Damaged Qty', 'Unit', 'Reason', 'Reported By', 'Notes'];
      const rows = filteredDamagedItems.map(d => [
        `"${d.damagedDate}"`,
        `"${d.productName}"`,
        `"${d.category || ''}"`,
        `"${d.batchNo}"`,
        d.quantity,
        `"${d.unit}"`,
        `"${d.reason}"`,
        `"${d.reportedBy}"`,
        `"${(d.notes || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csvContent, `Barista_Damaged_Inventory_${todayStr}.csv`);
      return;
    }

    if (viewMode === 'expired') {
      const headers = ['Batch No', 'Product Name', 'Category', 'Expired Qty', 'Unit', 'Production Date', 'Expiration Date', 'Quarantine Status'];
      const rows = filteredExpiredBatches.map(b => [
        `"${b.batchNo}"`,
        `"${b.productName}"`,
        `"${b.category || ''}"`,
        b.quantity,
        `"${b.unit}"`,
        `"${b.prodDate}"`,
        `"${b.useByDate}"`,
        'EXPIRED - QUARANTINED'
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csvContent, `Barista_Expired_Inventory_${todayStr}.csv`);
      return;
    }

    if (viewMode === 'batches') {
      const headers = ['Batch No', 'Product Name', 'Category', 'Remaining Qty', 'Initial Qty', 'Unit', 'Production Date', 'Expiration Date', 'Temp (C)', 'Status'];
      const rows = filteredBatches.map(b => [
        `"${b.batchNo}"`,
        `"${b.productName}"`,
        `"${b.category || ''}"`,
        b.quantity,
        b.initialQuantity || b.quantity,
        `"${b.unit}"`,
        `"${b.prodDate}"`,
        `"${b.useByDate}"`,
        b.dispatchTemp,
        isBatchExpired(b) ? 'EXPIRED' : b.quantity <= 0 ? 'DEPLETED' : 'ACTIVE'
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csvContent, `Barista_Batches_Inventory_${todayStr}.csv`);
      return;
    }

    // Default: Product-Wise Stock Count
    const headers = ['Product Name', 'Category', 'Sellable Stock Count', 'Unit', 'Active Batches Count', 'Earliest Use-By (FIFO)', 'Stock Status'];
    const rows = filteredProductWiseStock.map(p => [
      `"${p.productName}"`,
      `"${p.category}"`,
      p.totalQuantity,
      `"${p.unit}"`,
      p.batches.filter(b => (b.quantity || 0) > 0 && !isBatchExpired(b)).length,
      `"${p.earliestExpiry || 'N/A'}"`,
      p.totalQuantity === 0 ? 'OUT OF STOCK' : p.totalQuantity <= 15 ? 'LOW STOCK' : 'IN STOCK'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csvContent, `Barista_Product_Wise_Inventory_${todayStr}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const encodedUri = encodeURI(content);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and 3 Fixed, Non-Changing Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Central Kitchen Inventory</h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Physical stock balances, batch FIFO traceability, expired stock quarantine, and damaged item management.
          </p>
          {!canEdit && (
            <div className="mt-2 text-xs text-emerald-400 font-medium">
              Logged in as <span className="uppercase">{role}</span>: Read-only access enabled (view data & reports).
            </div>
          )}
        </div>

        {/* 3 Permanent Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportConsolidatedCSV}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-medium rounded-lg text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
            title="Export CSV data for current inventory view"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => openRecordDamagedModal()}
              className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Record damaged or compromised kitchen stock"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Record Damaged Stock</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  batchNo: getNextBatchNumberForProduct(prev.productName, batches, products)
                }));
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Register a new production batch"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Create New Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* OPERATIONAL KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Sellable Good Stock</span>
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{totalSellableStockUnits.toLocaleString()}</span>
            <span className="text-[11px] text-stone-500 block">Active units ready for dispatch</span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Monitored Products</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">{productWiseStock.length}</span>
            <span className="text-[11px] text-stone-500 block">
              {lowStockCount > 0 ? `${lowStockCount} low stock` : 'Stock balanced'}
            </span>
          </div>
        </div>

        <div 
          onClick={() => setViewMode('expired')}
          className="bg-stone-900 border border-stone-800 hover:border-rose-800/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer transition group"
          title="Click to view all expired stock batches"
        >
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300 group-hover:text-rose-300 transition">Expired Stock Held</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-400 font-mono">{totalExpiredStockUnits.toLocaleString()}</span>
            <span className="text-[11px] text-stone-500 block">
              {expiredBatches.length} {expiredBatches.length === 1 ? 'batch' : 'batches'} quarantined
            </span>
          </div>
        </div>

        <div 
          onClick={() => setViewMode('damaged')}
          className="bg-stone-900 border border-stone-800 hover:border-orange-800/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer transition group"
          title="Click to view all damaged inventory records"
        >
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300 group-hover:text-orange-300 transition">Damaged Stock</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-orange-400 font-mono">{totalDamagedUnits.toLocaleString()}</span>
            <span className="text-[11px] text-stone-500 block">
              {damagedList.length} incident reports logged
            </span>
          </div>
        </div>
      </div>

      {/* PERMANENT, NON-CHANGING TAB SWITCHER BUTTONS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#181311] border border-[#2E221E] p-2.5 rounded-2xl shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Product-Wise Stock Count */}
          <button
            type="button"
            onClick={() => setViewMode('product_wise')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              viewMode === 'product_wise'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/20'
                : 'text-stone-300 hover:text-white hover:bg-stone-850'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Product-Wise Stock Count</span>
            <span className={`min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] leading-none ${
              viewMode === 'product_wise'
                ? 'bg-stone-950 text-white font-bold shadow-sm'
                : 'bg-stone-800 text-stone-100 border border-stone-700/80 font-semibold'
            }`}>
              {productWiseStock.length}
            </span>
          </button>

          {/* 2. Batch-Wise Details */}
          <button
            type="button"
            onClick={() => setViewMode('batches')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              viewMode === 'batches'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/20'
                : 'text-stone-300 hover:text-white hover:bg-stone-850'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Batch-Wise Details</span>
            <span className={`min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] leading-none ${
              viewMode === 'batches'
                ? 'bg-stone-950 text-white font-bold shadow-sm'
                : 'bg-stone-800 text-stone-100 border border-stone-700/80 font-semibold'
            }`}>
              {batches.length}
            </span>
          </button>

          {/* 3. Expired Stock */}
          <button
            type="button"
            onClick={() => setViewMode('expired')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              viewMode === 'expired'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/20'
                : 'text-stone-300 hover:text-white hover:bg-stone-850'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Expired Stock</span>
            <span className={`min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] leading-none ${
              viewMode === 'expired'
                ? 'bg-stone-950 text-white font-bold shadow-sm'
                : 'bg-stone-800 text-stone-100 border border-stone-700/80 font-semibold'
            }`}>
              {expiredBatches.length}
            </span>
          </button>

          {/* 4. Damaged Stock */}
          <button
            type="button"
            onClick={() => setViewMode('damaged')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              viewMode === 'damaged'
                ? 'bg-amber-600 text-stone-950 shadow-md shadow-amber-600/20'
                : 'text-stone-300 hover:text-white hover:bg-stone-850'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Damaged Stock</span>
            <span className={`min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] leading-none ${
              viewMode === 'damaged'
                ? 'bg-stone-950 text-white font-bold shadow-sm'
                : 'bg-stone-800 text-stone-100 border border-stone-700/80 font-semibold'
            }`}>
              {damagedList.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-3 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={
              viewMode === 'product_wise' 
                ? "Search by Product Name..." 
                : viewMode === 'batches' 
                ? "Search by Batch No or Product..." 
                : viewMode === 'expired' 
                ? "Search expired batches or products..." 
                : "Search damaged records or reasons..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-sans"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'product_wise' && (
            <div className="flex items-center space-x-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-stone-300 font-medium">Sort:</span>
              <select
                value={productSortBy}
                onChange={(e) => setProductSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="quantity_desc" className="bg-stone-900 text-stone-100">Quantity: High to Low</option>
                <option value="quantity_asc" className="bg-stone-900 text-stone-100">Quantity: Low to High</option>
                <option value="name_asc" className="bg-stone-900 text-stone-100">Product Name: A to Z</option>
                <option value="expiry_asc" className="bg-stone-900 text-stone-100">Earliest Expiry (FIFO)</option>
              </select>
            </div>
          )}

          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-stone-300 font-medium">Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-stone-950 border border-stone-700 rounded-lg text-xs text-stone-100 font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all" className="bg-stone-900 text-stone-100">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-stone-900 text-stone-100">{cat}</option>
              ))}
            </select>
          </div>

          {viewMode === 'damaged' && canEdit && (
            <button
              type="button"
              onClick={() => openRecordDamagedModal()}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Report Damaged Items</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: PRODUCT-WISE QUANTITY COUNT TABLE */}
      {viewMode === 'product_wise' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-800/60 text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Product Name & Category</th>
                  <th className="py-3 px-4">Sellable Stock Count</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4">Active Batch Count</th>
                  <th className="py-3 px-4">Earliest Use-By (FIFO)</th>
                  <th className="py-3 px-4">Dispatch Temp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {filteredProductWiseStock.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-500">
                      No products found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProductWiseStock.map((prod, index) => {
                    const isOutOfStock = prod.totalQuantity === 0;
                    const isLowStock = prod.totalQuantity > 0 && prod.totalQuantity <= 15;
                    const activeGoodBatches = prod.batches.filter(b => (b.quantity || 0) > 0 && !isBatchExpired(b));

                    return (
                      <tr key={prod.productName} className="hover:bg-stone-800/40 transition">
                        <td className="py-3.5 px-4 text-center font-mono text-stone-400 font-medium text-xs">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <span className="text-sm">{prod.productName}</span>
                          <div className="mt-1 flex items-center space-x-2">
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              prod.category === 'Hot Kitchen' 
                                ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20' 
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            }`}>
                              <span>{prod.category}</span>
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              Unit: {prod.unit}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-baseline space-x-1.5">
                            <span className={`text-base font-black ${
                              isOutOfStock 
                                ? 'text-red-400' 
                                : isLowStock 
                                ? 'text-amber-400' 
                                : 'text-emerald-400'
                            }`}>
                              {prod.totalQuantity.toLocaleString()}
                            </span>
                            <span className="text-xs text-stone-400 font-sans">
                              {prod.unit}
                            </span>
                          </div>
                          {/* Visual Stock Level Indicator */}
                          <div className="w-24 h-1.5 bg-stone-800 rounded-full mt-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(isOutOfStock ? 0 : 8, (prod.totalQuantity / 100) * 100))}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-800">
                              <AlertCircle className="w-3 h-3" />
                              <span>OUT OF STOCK</span>
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800">
                              <AlertTriangle className="w-3 h-3" />
                              <span>LOW STOCK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>IN STOCK</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {activeGoodBatches.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm(prod.productName);
                                setViewMode('batches');
                              }}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-100 hover:text-white border border-stone-700 hover:border-amber-500/50 transition cursor-pointer shadow-sm group"
                              title={`View ${activeGoodBatches.length} active batches for ${prod.productName}`}
                            >
                              <Layers className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                              <span className="font-bold text-white font-mono">{activeGoodBatches.length}</span>
                              <span className="text-stone-300">
                                {activeGoodBatches.length === 1 ? 'Batch' : 'Batches'}
                              </span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-800/80 text-stone-300 border border-stone-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                              <span className="font-mono font-bold text-stone-200">0</span>
                              <span>Batches</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {prod.earliestExpiry ? (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-stone-800/90 rounded-lg border border-stone-700 text-stone-100 shadow-sm">
                              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="font-mono text-xs font-semibold text-white tracking-wide">
                                {prod.earliestExpiry}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-300 bg-stone-800/70 border border-stone-700">
                              No active stock
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950/70 text-cyan-300 border border-cyan-800/60">
                            <ThermometerSnowflake className="w-3 h-3" />
                            <span>{prod.dispatchTemp.toFixed(1)} C</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSearchTerm(prod.productName);
                                setViewMode('batches');
                              }}
                              className="px-2.5 py-1.5 bg-[#251C18] hover:bg-[#32231E] text-amber-400 hover:text-amber-300 border border-[#382B25] hover:border-amber-500/40 rounded-lg text-xs font-semibold transition flex items-center space-x-1 cursor-pointer shadow-sm"
                              title={`View individual batches for ${prod.productName}`}
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>View Batches</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: BATCH-WISE DETAIL TABLE */}
      {viewMode === 'batches' && (
        <div className="space-y-3">
          {searchTerm && (
            <div className="flex items-center justify-between p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl text-xs text-amber-300">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>
                  Filtering batches for product: <strong className="text-white">"{searchTerm}"</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-amber-400 hover:text-white underline font-semibold cursor-pointer"
              >
                Clear Filter & Show All Batches
              </button>
            </div>
          )}

          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-800/60 text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Batch No</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Remaining Stock</th>
                    <th className="py-3 px-4">Production Date</th>
                    <th className="py-3 px-4">Expiration Date</th>
                    <th className="py-3 px-4">Dispatch Temp ( C)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-500">
                        No batches found matching the search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((batch) => {
                      const isLow = batch.quantity <= 15;
                      const isTempOk = batch.dispatchTemp <= 5.0;
                      const expired = isBatchExpired(batch);
                      
                      const diffDays = (new Date(batch.useByDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                      const isExpiringSoon = !expired && diffDays >= 0 && diffDays <= 3;

                      return (
                        <tr key={batch.id} className="hover:bg-stone-800/40 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            {batch.batchNo}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div>{batch.productName}</div>
                            <span className={`inline-flex items-center space-x-1 text-[10px] font-semibold mt-0.5 px-1.5 py-0.2 rounded ${
                              normalizeCategory(batch.category) === 'Hot Kitchen' 
                                ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20' 
                                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            }`}>
                              <span>{normalizeCategory(batch.category)}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-stone-200">
                            <span className={`font-bold text-sm ${
                              expired
                                ? 'text-red-400'
                                : batch.quantity <= 0 
                                ? 'text-stone-500' 
                                : batch.quantity <= 15 
                                ? 'text-amber-400' 
                                : 'text-stone-100'
                            }`}>
                              {batch.quantity}
                            </span>{' '}
                            <span className="text-xs text-stone-400 font-sans">
                              {batch.unit || 'NoS'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-stone-300">
                            {batch.prodDate}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`font-medium ${
                              expired ? 'text-red-400 font-bold' : isExpiringSoon ? 'text-amber-400' : 'text-stone-300'
                            }`}>
                              {batch.useByDate}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                              isTempOk ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/60' : 'bg-red-950/70 text-red-300 border border-red-800'
                            }`}>
                              <ThermometerSnowflake className="w-3 h-3" />
                              <span>{batch.dispatchTemp.toFixed(1)} C</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {expired ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                                EXPIRED
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                EXPIRING SOON
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-400">
                                LOW STOCK
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                ACTIVE / GOOD
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {/* Quick Report Damaged from this batch */}
                              {canEdit && batch.quantity > 0 && !expired && (
                                <button
                                  type="button"
                                  onClick={() => openRecordDamagedModal(batch.productName, batch)}
                                  className="p-1.5 text-stone-400 hover:text-orange-400 hover:bg-stone-800 rounded transition cursor-pointer"
                                  title="Report Damaged Units from this Batch"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedBatchForLogs(batch)}
                                className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition cursor-pointer"
                                title="View Batch Audit & Deduction Logs"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => setEditingBatch(batch)}
                                  className="p-1.5 text-stone-400 hover:text-blue-400 hover:bg-stone-800 rounded transition cursor-pointer"
                                  title="Edit Batch"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => setBatchToDelete(batch)}
                                  className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded transition cursor-pointer"
                                  title="Delete Batch Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: EXPIRED STOCK OPTION (Automatic Quarantine) */}
      {viewMode === 'expired' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-800/60 text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Batch No</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Expired Stock</th>
                    <th className="py-3 px-4">Production Date</th>
                    <th className="py-3 px-4">Expiration Date</th>
                    <th className="py-3 px-4">Quarantine Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {filteredExpiredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-stone-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <span className="text-sm font-semibold text-white block">No Expired Stock Present</span>
                        <span className="text-xs text-stone-500">All central kitchen inventory batches are unexpired and HACCP compliant.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredExpiredBatches.map((batch) => {
                      return (
                        <tr key={batch.id} className="hover:bg-stone-800/40 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            {batch.batchNo}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div>{batch.productName}</div>
                            <span className="text-[10px] text-stone-400 font-mono">
                              Category: {batch.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className="text-sm font-black text-rose-400">
                              {batch.quantity}
                            </span>{' '}
                            <span className="text-xs text-stone-400 font-sans">
                              {batch.unit}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-stone-300 font-mono">
                            {batch.prodDate}
                          </td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className="text-xs font-bold text-rose-400">
                              {batch.useByDate}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              <ShieldAlert className="w-3 h-3" />
                              <span>QUARANTINED FROM STOCK</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
      )}
      {viewMode === 'damaged' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-800/60 text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Batch No</th>
                    <th className="py-3 px-4">Damaged Qty</th>
                    <th className="py-3 px-4">Damage Reason</th>
                    <th className="py-3 px-4">Reported By</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {filteredDamagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-stone-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <span className="text-sm font-semibold text-white block">No Damaged Stock Recorded</span>
                        <span className="text-xs text-stone-500">Zero damaged or defective items currently logged in kitchen records.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredDamagedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-800/40 transition">
                        <td className="py-3.5 px-4 font-mono text-stone-300">
                          {item.damagedDate}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div>{item.productName}</div>
                          {item.category && (
                            <span className="text-[10px] text-stone-400 font-mono">
                              {item.category}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                          {item.batchNo || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className="text-sm font-black text-orange-400">
                            {item.quantity}
                          </span>{' '}
                          <span className="text-xs text-stone-400 font-sans">
                            {item.unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-950 text-orange-300 border border-orange-800/80">
                            {item.reason}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-300 font-medium">
                          {item.reportedBy}
                        </td>
                        <td className="py-3.5 px-4 text-stone-400 max-w-xs truncate" title={item.notes}>
                          {item.notes || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleRestoreDamagedToGood(item)}
                                className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white border border-emerald-800 rounded-lg text-xs font-semibold transition flex items-center space-x-1 cursor-pointer shadow-sm"
                                title="Undo mistake: Return stock back to active inventory"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore</span>
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
          </div>
      )}

      {/* MODAL: RECTIFY EXPIRED BATCH (Fix mistaken expiration date) */}
      {batchToRectify && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Rectify Expiration Date</h3>
                  <p className="text-xs text-stone-400">
                    Batch: <span className="text-amber-400 font-mono font-bold">{batchToRectify.batchNo}</span> - {batchToRectify.productName}
                  </p>
                </div>
              </div>
              <button onClick={() => setBatchToRectify(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRectification} className="space-y-4">
              <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-xl text-xs text-blue-200">
                If the expiration date was typed mistakenly during batch entry, setting it to today or a future date will <strong>automatically restore the batch back to active good inventory</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={batchToRectify.productName}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-300 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Production Date
                  </label>
                  <input
                    type="date"
                    required
                    value={rectifyProdDate}
                    onChange={(e) => setRectifyProdDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span>Expiration Date</span>
                    <span className="text-[10px] text-amber-400 font-semibold">Edit Mistake</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={rectifyUseByDate}
                    onChange={(e) => setRectifyUseByDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-amber-600/80 rounded-lg text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Stock Quantity in Batch
                </label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    required
                    min={0}
                    value={rectifyQuantity}
                    onChange={(e) => setRectifyQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 font-bold"
                  />
                  <div className="shrink-0">
                    {renderUnitBadge(batchToRectify.unit)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Correction Reason / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Corrected typo in expiration month/day"
                  value={rectifyNotes}
                  onChange={(e) => setRectifyNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setBatchToRectify(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rectifying}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {rectifying ? 'Saving Changes...' : 'Save & Rectify Expiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD DAMAGED STOCK */}
      {showRecordDamagedModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-white text-base">Record Damaged Stock</h3>
              </div>
              <button onClick={() => setShowRecordDamagedModal(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDamagedRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Product Name
                </label>
                <select
                  value={damagedTargetProduct}
                  onChange={(e) => {
                    const p = e.target.value;
                    setDamagedTargetProduct(p);
                    const bList = batches.filter(b => b.productName === p && (b.quantity || 0) > 0 && !isBatchExpired(b));
                    setDamagedTargetBatchId(bList.length > 0 ? bList[0].id : '');
                    setDamagedQty(1);
                  }}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 font-medium"
                >
                  {(products && products.length > 0 ? products : INITIAL_PRODUCTS)
                    .filter(p => p.active !== false)
                    .map(p => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                  <span>Production Batch Source</span>
                  {selectedBatchForDamage && (
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      Available Stock: {selectedBatchForDamage.quantity} {selectedBatchForDamage.unit}
                    </span>
                  )}
                </label>
                {availableBatchesForDamagedProduct.length === 0 ? (
                  <div className="px-3 py-2 bg-amber-950/30 border border-amber-900/50 rounded-lg text-xs text-amber-300 flex items-center space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>No unexpired stock available for this product</span>
                  </div>
                ) : (
                  <select
                    value={damagedTargetBatchId}
                    onChange={(e) => {
                      setDamagedTargetBatchId(e.target.value);
                      const chosen = batches.find(b => b.id === e.target.value);
                      if (chosen && damagedQty > chosen.quantity) {
                        setDamagedQty(Math.max(1, chosen.quantity));
                      }
                    }}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono font-bold"
                  >
                    {availableBatchesForDamagedProduct.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batchNo} — Stock: {b.quantity} {b.unit} (Exp: {b.useByDate})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span>Damaged Quantity</span>
                    {selectedBatchForDamage && (
                      <span className="text-[10px] text-stone-400 font-mono">
                        Max: {selectedBatchForDamage.quantity}
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={selectedBatchForDamage?.quantity || 1}
                    value={damagedQty || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDamagedQty(isNaN(val) ? 0 : val);
                    }}
                    className={`w-full px-3 py-2 bg-stone-800 border rounded-lg text-xs font-mono font-bold focus:outline-none transition ${
                      selectedBatchForDamage && (damagedQty > selectedBatchForDamage.quantity || damagedQty <= 0)
                        ? 'border-red-500 text-red-300 focus:border-red-500'
                        : 'border-stone-700 text-stone-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20'
                    }`}
                  />
                  {selectedBatchForDamage && damagedQty > selectedBatchForDamage.quantity && (
                    <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Exceeds available stock ({selectedBatchForDamage.quantity} {selectedBatchForDamage.unit})</span>
                    </p>
                  )}
                  {damagedQty <= 0 && (
                    <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Quantity must be at least 1 unit</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Damage Date
                  </label>
                  <input
                    type="date"
                    required
                    value={damagedDate}
                    onChange={(e) => setDamagedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Damage Reason
                </label>
                <select
                  value={damagedReason}
                  onChange={(e) => setDamagedReason(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100"
                >
                  {DAMAGE_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Notes / Incident Details (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tray dropped while loading chilled dispatch rack"
                  value={damagedNotes}
                  onChange={(e) => setDamagedNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-stone-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRecordDamagedModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 rounded-lg text-xs font-medium cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    savingDamaged ||
                    !selectedBatchForDamage ||
                    availableBatchesForDamagedProduct.length === 0 ||
                    damagedQty <= 0 ||
                    damagedQty > (selectedBatchForDamage?.quantity || 0) ||
                    isBatchExpired(selectedBatchForDamage)
                  }
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
                  title={
                    availableBatchesForDamagedProduct.length === 0
                      ? 'No unexpired stock available'
                      : damagedQty <= 0
                      ? 'Please enter a valid quantity'
                      : selectedBatchForDamage && damagedQty > selectedBatchForDamage.quantity
                      ? 'Quantity exceeds available stock'
                      : 'Confirm and record damaged stock'
                  }
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{savingDamaged ? 'Saving...' : 'Record Damaged Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DAMAGED RECORD */}
      {editingDamagedItem && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Edit Damaged Stock Record</h3>
              </div>
              <button onClick={() => setEditingDamagedItem(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDamagedRecord} className="space-y-4">
              <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-300 space-y-1">
                <div>Product: <strong className="text-white">{editingDamagedItem.productName}</strong></div>
                <div>Batch: <strong className="text-amber-400 font-mono">{editingDamagedItem.batchNo}</strong></div>
              </div>

              <div>
                {(() => {
                  const linkedBatch = batches.find(b => b.id === editingDamagedItem.batchId || b.batchNo === editingDamagedItem.batchNo);
                  const maxAllowed = (linkedBatch?.quantity || 0) + editingDamagedItem.quantity;
                  const isOver = editDamagedQty > maxAllowed;
                  const isUnder = editDamagedQty <= 0;

                  return (
                    <>
                      <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                        <span>Damaged Quantity</span>
                        <span className="text-[10px] text-amber-400 font-mono font-semibold">
                          Max available: {maxAllowed} {editingDamagedItem.unit}
                        </span>
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={maxAllowed}
                        value={editDamagedQty || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setEditDamagedQty(isNaN(val) ? 0 : val);
                        }}
                        className={`w-full px-3 py-2 bg-stone-800 border rounded-lg text-xs font-mono font-bold focus:outline-none transition ${
                          isOver || isUnder
                            ? 'border-red-500 text-red-300 focus:border-red-500'
                            : 'border-stone-700 text-stone-100 focus:border-blue-500'
                        }`}
                      />
                      {isOver && (
                        <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Exceeds maximum allowable stock ({maxAllowed} {editingDamagedItem.unit})</span>
                        </p>
                      )}
                      {isUnder && (
                        <p className="text-[11px] text-red-400 mt-1 flex items-center space-x-1 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Quantity must be at least 1 unit</span>
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Damage Reason
                </label>
                <select
                  value={editDamagedReason}
                  onChange={(e) => setEditDamagedReason(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100"
                >
                  {DAMAGE_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={editDamagedNotes}
                  onChange={(e) => setEditDamagedNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100"
                />
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    const item = editingDamagedItem;
                    setEditingDamagedItem(null);
                    handleRestoreDamagedToGood(item);
                  }}
                  className="px-3 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore to Good Stock</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingDamagedItem(null)}
                    className="px-3 py-2 bg-stone-800 text-stone-300 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingDamagedEdit}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    {savingDamagedEdit ? 'Saving...' : 'Update Record'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DISPOSE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!batchToDispose}
        title="Dispose Expired Central Kitchen Stock"
        itemName={batchToDispose ? `${batchToDispose.batchNo} (${batchToDispose.productName})` : ''}
        itemType="Expired Batch"
        description="Are you sure you want to write-off and dispose this expired batch? Remaining quantity will be set to zero and archived in audit logs."
        isDeleting={disposing}
        onConfirm={handleDisposeExpired}
        onClose={() => setBatchToDispose(null)}
      />

      {/* CONFIRM DELETE BATCH MODAL */}
      <ConfirmDeleteModal
        isOpen={!!batchToDelete}
        title="Delete Central Kitchen Batch"
        itemName={batchToDelete ? `${batchToDelete.batchNo} (${batchToDelete.productName})` : ''}
        itemType="Inventory Batch"
        description="Are you sure you want to permanently delete this batch from Central Kitchen inventory records? This action cannot be undone."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteBatch}
        onClose={() => setBatchToDelete(null)}
      />

      {/* CREATE BATCH MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Create Central Kitchen Batch</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Product Name
                </label>
                <select
                  value={formData.productName}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-medium"
                >
                  {(products && products.length > 0 ? products : INITIAL_PRODUCTS)
                    .filter((p) => p.active !== false)
                    .map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span>Batch Number</span>
                    <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 font-mono">
                      <Lock className="w-3 h-3" /> System Generated
                    </span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={formData.batchNo}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-amber-400 font-mono font-bold cursor-not-allowed select-none opacity-90 shadow-inner"
                    title="Batch number is system-generated and automatically follows sequential codes per product item."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Initial Stock Quantity
                  </label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      required
                      min={1}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-bold"
                    />
                    <div className="shrink-0">
                      {renderUnitBadge(formData.unit)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Production Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.prodDate}
                    onChange={(e) => handleProdDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Expiration Date</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                      Auto (+{(selectedProductMeta && 'shelfLifeDays' in selectedProductMeta && selectedProductMeta.shelfLifeDays) || 5}d)
                    </span>
                  </label>
                  <input
                    type="date"
                    readOnly
                    disabled
                    value={formData.useByDate}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-amber-400 font-mono font-bold cursor-not-allowed select-none opacity-90 shadow-inner"
                    title="Expiration date is auto-calculated based on production date and master product expiration period."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Dispatch Temperature (&lt;= 5.0 C HACCP)</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3 flex items-center pointer-events-none text-cyan-400">
                    <ThermometerSnowflake className="w-4 h-4 text-cyan-400 shrink-0" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={`${Number(formData.dispatchTemp !== undefined ? formData.dispatchTemp : 3.5).toFixed(1)} C`}
                    className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-700/80 rounded-lg text-xs text-cyan-300 font-mono font-bold cursor-not-allowed select-none shadow-inner"
                    title="Dispatch temperature is auto-assigned from the product master catalog and cannot be edited."
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Batch...' : 'Register Batch in Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BATCH MODAL */}
      {editingBatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Edit Batch: {editingBatch.batchNo}</h3>
              </div>
              <button onClick={() => setEditingBatch(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                  <span>Batch Number</span>
                  <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> System Locked
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={editingBatch.batchNo}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-amber-400 font-mono font-bold cursor-not-allowed select-none opacity-90 shadow-inner"
                  title="Batch number cannot be changed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={editingBatch.productName}
                  onChange={(e) => setEditingBatch({ ...editingBatch, productName: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Remaining Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingBatch.quantity}
                    onChange={(e) => setEditingBatch({ ...editingBatch, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-cyan-400" />
                      <span>Dispatch Temp ( C)</span>
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono font-semibold">
                      System Assigned
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 flex items-center pointer-events-none text-cyan-400">
                      <ThermometerSnowflake className="w-4 h-4 text-cyan-400 shrink-0" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={`${Number(editingBatch.dispatchTemp !== undefined ? editingBatch.dispatchTemp : 3.5).toFixed(1)} C`}
                      className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-700/80 rounded-lg text-xs text-cyan-300 font-mono font-bold cursor-not-allowed select-none shadow-inner"
                      title="Dispatch temperature is fixed based on the product creation setting."
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Production Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editingBatch.prodDate}
                    onChange={(e) => {
                      const newProd = e.target.value;
                      const matchedP = (products && products.length > 0 ? products : INITIAL_PRODUCTS)
                        .find(p => p.name === editingBatch.productName);
                      const shelf = (matchedP && 'shelfLifeDays' in matchedP && matchedP.shelfLifeDays) ? matchedP.shelfLifeDays : 5;
                      const newUseBy = calculateFutureDate(newProd, shelf);
                      setEditingBatch({ ...editingBatch, prodDate: newProd, useByDate: newUseBy });
                    }}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>Expiration Date</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      Auto-Assigned
                    </span>
                  </label>
                  <input
                    type="date"
                    readOnly
                    disabled
                    value={editingBatch.useByDate}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-amber-400 font-mono font-bold cursor-not-allowed select-none opacity-90 shadow-inner"
                    title="Expiration date is auto-calculated based on production date and the product's expiration period."
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH AUDIT & REDUCTION LOGS MODAL */}
      {selectedBatchForLogs && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4 shrink-0">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Batch History & Stock Reduction Logs
                  </h3>
                  <p className="text-xs text-stone-400">
                    Batch: <span className="text-amber-400 font-mono font-bold">{selectedBatchForLogs.batchNo}</span> - {selectedBatchForLogs.productName}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedBatchForLogs(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-3">
              {batchLogs.filter(l => l.batchNo === selectedBatchForLogs.batchNo || l.batchId === selectedBatchForLogs.id).length === 0 ? (
                <div className="text-center py-10 text-stone-500 text-xs">
                  No automated deductions logged for this batch yet.
                </div>
              ) : (
                batchLogs
                  .filter(l => l.batchNo === selectedBatchForLogs.batchNo || l.batchId === selectedBatchForLogs.id)
                  .map((log) => (
                    <div key={log.id} className="p-3.5 bg-stone-800/70 border border-stone-700/60 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                          log.action === 'dispatch_deduction' 
                            ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {log.action === 'dispatch_deduction' ? 'Stock Deduction / Dispatched' : 'Batch Registered / Adjustment'}
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-stone-900/60 p-2 rounded">
                          <span className="text-stone-400 block text-[10px]">Change</span>
                          <span className={`font-bold font-mono ${log.quantityChanged < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                          </span>
                        </div>
                        <div className="bg-stone-900/60 p-2 rounded">
                          <span className="text-stone-400 block text-[10px]">Stock Level</span>
                          <span className="text-stone-200 font-mono font-medium">
                            {log.previousQty} -&gt; <strong className="text-white">{log.newQty}</strong>
                          </span>
                        </div>
                        <div className="bg-stone-900/60 p-2 rounded">
                          <span className="text-stone-400 block text-[10px]">Outlet Destination</span>
                          <span className="text-amber-400 truncate block">
                            {log.outletName || 'Central Kitchen'}
                          </span>
                        </div>
                        <div className="bg-stone-900/60 p-2 rounded">
                          <span className="text-stone-400 block text-[10px]">Authorized By</span>
                          <span className="text-stone-300 truncate block">
                            {log.recordedBy}
                          </span>
                        </div>
                      </div>
                      {log.driverName && (
                        <div className="mt-1 text-[11px] text-stone-400">
                          Assigned Driver: <span className="text-stone-200">{log.driverName}</span>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-stone-800 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedBatchForLogs(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
