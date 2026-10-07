import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Plus, 
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
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { InventoryBatch, BatchLog, Product } from '../types';
import { INITIAL_PRODUCTS } from '../data/seedData';
import { addInventoryBatch, updateInventoryBatch, deleteInventoryBatch } from '../services/dataService';
import { getNextBatchNumberForProduct } from '../utils/batchUtils';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useModal } from '../context/ModalDialogContext';
import { calculateFutureDate, renderUnitBadge } from '../utils/productUtils';

interface InventoryViewProps {
  batches: InventoryBatch[];
  batchLogs: BatchLog[];
  products?: Product[];
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

export const InventoryView: React.FC<InventoryViewProps> = ({
  batches,
  batchLogs,
  products
}) => {
  const { role, userProfile } = useAuth();
  const { showAlert } = useModal();
  const canEdit = role === 'admin' || role === 'editor';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'product_wise' | 'batches'>('product_wise');
  const [productSortBy, setProductSortBy] = useState<'quantity_desc' | 'quantity_asc' | 'name_asc' | 'expiry_asc'>('quantity_desc');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<InventoryBatch | null>(null);
  const [selectedBatchForLogs, setSelectedBatchForLogs] = useState<InventoryBatch | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<InventoryBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // PRODUCT-WISE QUANTITY COUNT AGGREGATION
  const productWiseStock = useMemo(() => {
    const catalog = products && products.length > 0 ? products : INITIAL_PRODUCTS;
    const productMap = new Map<string, {
      id?: string;
      productId?: string;
      productName: string;
      category: 'Hot Kitchen' | 'Pastry Kitchen';
      unit: string;
      totalQuantity: number;
      initialTotalQuantity: number;
      batches: InventoryBatch[];
      earliestExpiry: string | null;
      latestProdDate: string | null;
      dispatchTemp: number;
      shelfLifeDays?: number;
    }>();

    // Populate catalog active products
    catalog.forEach((p, idx) => {
      if (p.active === false) return;
      const key = p.name.trim().toLowerCase();
      const pId = 'productId' in p && p.productId ? p.productId : `PRD-${String(idx + 1).padStart(2, '0')}`;
      productMap.set(key, {
        id: (p as any).id,
        productId: pId,
        productName: p.name,
        category: normalizeCategory(p.category),
        unit: ('unit' in p && p.unit) ? p.unit : 'Slices',
        totalQuantity: 0,
        initialTotalQuantity: 0,
        batches: [],
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
          earliestExpiry: null,
          latestProdDate: null,
          dispatchTemp: b.dispatchTemp || 3.5
        };
        productMap.set(key, item);
      }

      item.totalQuantity += (b.quantity || 0);
      item.initialTotalQuantity += (b.initialQuantity || b.quantity || 0);
      item.batches.push(b);

      if (b.quantity > 0 && b.useByDate) {
        if (!item.earliestExpiry || b.useByDate < item.earliestExpiry) {
          item.earliestExpiry = b.useByDate;
        }
      }

      if (b.prodDate) {
        if (!item.latestProdDate || b.prodDate > item.latestProdDate) {
          item.latestProdDate = b.prodDate;
        }
      }
    });

    return Array.from(productMap.values());
  }, [batches, products]);

  // Filtered & Sorted Product-Wise Stock
  const filteredProductWiseStock = useMemo(() => {
    let list = productWiseStock.filter(item => {
      const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.productId && item.productId.toLowerCase().includes(searchTerm.toLowerCase()));
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

  // Summary Metrics
  const totalStockUnits = useMemo(() => {
    return batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
  }, [batches]);

  const totalDistinctProducts = useMemo(() => {
    return productWiseStock.length;
  }, [productWiseStock]);

  const lowStockProductsCount = useMemo(() => {
    return productWiseStock.filter(p => p.totalQuantity > 0 && p.totalQuantity <= 15).length;
  }, [productWiseStock]);

  const outOfStockProductsCount = useMemo(() => {
    return productWiseStock.filter(p => p.totalQuantity === 0).length;
  }, [productWiseStock]);

  const initialProduct = (products && products.length > 0 ? products[0] : INITIAL_PRODUCTS[0]);
  const initialProductName = initialProduct.name;
  const initialToday = new Date().toISOString().split('T')[0];
  const initialShelfDays = (initialProduct && 'shelfLifeDays' in initialProduct && initialProduct.shelfLifeDays) ? initialProduct.shelfLifeDays : 5;
  const initialTemp = (initialProduct && 'dispatchTemp' in initialProduct && initialProduct.dispatchTemp !== undefined) ? initialProduct.dispatchTemp : 3.5;
  const initialUnit = (initialProduct && 'unit' in initialProduct && initialProduct.unit) ? initialProduct.unit : 'Slices';

  // Form State
  const [formData, setFormData] = useState(() => ({
    batchNo: getNextBatchNumberForProduct(initialProductName, batches, products),
    productName: initialProductName,
    category: normalizeCategory(initialProduct.category),
    quantity: 50,
    prodDate: initialToday,
    useByDate: calculateFutureDate(initialToday, initialShelfDays),
    dispatchTemp: initialTemp,
    unit: initialUnit
  }));

  const categories = ['Hot Kitchen', 'Pastry Kitchen'];

  // Filtered Batches
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = 
      batch.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      batch.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const normCat = normalizeCategory(batch.category);
    const matchesCategory = filterCategory === 'all' || normCat === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
        prodDate: new Date().toISOString().split('T')[0],
        useByDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));

      showAlert(`Batch ${formData.batchNo} (${formData.productName}) registered successfully!`, {
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

  const exportToCSV = () => {
    const headers = [
      'Batch No',
      'Product Name',
      'Category',
      'Remaining Qty',
      'Initial Qty',
      'Unit',
      'Production Date',
      'Expiration Date',
      'Dispatch Temp (C)',
      'HACCP Status'
    ];

    const rows = batches.map(b => [
      `"${b.batchNo}"`,
      `"${b.productName}"`,
      `"${b.category || ''}"`,
      b.quantity,
      b.initialQuantity || b.quantity,
      `"${b.unit}"`,
      `"${b.prodDate}"`,
      `"${b.useByDate}"`,
      b.dispatchTemp,
      b.dispatchTemp <= 5.0 ? 'COMPLIANT (<=5C)' : 'EXCEEDED'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Barista_Central_Kitchen_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportProductWiseCSV = () => {
    const headers = [
      'Product ID',
      'Product Name',
      'Category',
      'Total Quantity Count',
      'Unit',
      'Active Batches Count',
      'Earliest Use-By (FIFO)',
      'Latest Production Date',
      'Stock Status'
    ];

    const rows = filteredProductWiseStock.map(p => [
      `"${p.productId || 'N/A'}"`,
      `"${p.productName}"`,
      `"${p.category}"`,
      p.totalQuantity,
      `"${p.unit}"`,
      p.batches.filter(b => b.quantity > 0).length,
      `"${p.earliestExpiry || 'N/A'}"`,
      `"${p.latestProdDate || 'N/A'}"`,
      p.totalQuantity === 0 ? 'OUT OF STOCK' : p.totalQuantity <= 15 ? 'LOW STOCK' : 'OPTIMAL'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Barista_Product_Wise_Inventory_Count_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Central Kitchen Inventory</h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Product-wise physical inventory balance, quantity counts, batch FIFO traceability, and cold-chain compliance.
          </p>
          {!canEdit && (
            <div className="mt-2 text-xs text-emerald-400 font-medium">
              Logged in as <span className="uppercase">{role}</span>: Read-only access enabled (view data & reports).
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportProductWiseCSV}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 font-medium rounded-lg text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
            title="Download Product-Wise Stock Count CSV (all product totals)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Product Counts CSV</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 font-medium rounded-lg text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
            title="Download Batch-Wise Inventory CSV (all individual batch records)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Batches CSV</span>
          </button>

          {canEdit && (
            <button
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  batchNo: getNextBatchNumberForProduct(prev.productName, batches, products)
                }));
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
              title="Add a new production batch"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* OPERATIONAL KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Total In-Stock Units</span>
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">{totalStockUnits.toLocaleString()}</span>
            <span className="text-[11px] text-stone-500 block">Total physical units in kitchen</span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Product Lines</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white font-mono">{totalDistinctProducts}</span>
            <span className="text-[11px] text-stone-500 block">Active monitored products</span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Low Stock Products</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{lowStockProductsCount}</span>
            <span className="text-[11px] text-stone-500 block">&le; 15 units remaining</span>
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span className="font-semibold text-stone-300">Out of Stock</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-rose-400 font-mono">{outOfStockProductsCount}</span>
            <span className="text-[11px] text-stone-500 block">Zero stock in hand</span>
          </div>
        </div>
      </div>

      {/* VIEW SWITCHER TABS: Product-Wise vs Batch-Wise */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#181311] border border-[#2E221E] p-2.5 rounded-2xl shadow-sm">
        <div className="flex items-center space-x-2">
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
            <span>Product-Wise Stock Count ({productWiseStock.length})</span>
          </button>
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
            <span>Batch-Wise Detail ({batches.length})</span>
          </button>
        </div>

        <div className="text-[11px] text-stone-400 px-2 font-mono hidden md:block">
          {viewMode === 'product_wise' 
            ? 'Viewing aggregated quantities by product across batches' 
            : 'Viewing individual production batches and tracking history'}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-3 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={viewMode === 'product_wise' ? "Search by Product Name or PRD Code..." : "Search by Batch No or Product..."}
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
        </div>
      </div>

      {/* VIEW 1: PRODUCT-WISE QUANTITY COUNT TABLE */}
      {viewMode === 'product_wise' ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Boxes className="w-4 h-4 text-amber-500" />
                <span>Product-Wise Physical Stock Count</span>
              </h3>
              <p className="text-[11px] text-stone-400">
                Summary of total available stock units per product across all warehouse batches.
              </p>
            </div>
            <span className="text-xs font-mono text-stone-400 bg-stone-900 px-2.5 py-1 rounded-lg border border-stone-800 self-start sm:self-auto">
              Showing <strong className="text-amber-400">{filteredProductWiseStock.length}</strong> of {productWiseStock.length} products
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-800/60 text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Product Name & Category</th>
                  <th className="py-3 px-4">Total Stock Count</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4">Active Batches</th>
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
                    const activeBatches = prod.batches.filter(b => b.quantity > 0);

                    return (
                      <tr key={prod.productName} className="hover:bg-stone-800/40 transition">
                        <td className="py-3.5 px-4 text-center font-mono text-stone-500 text-xs">
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
                            <span className="text-[10px] text-stone-500 font-mono">
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
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-800 animate-pulse">
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
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="font-mono text-xs font-bold text-stone-200">
                              {activeBatches.length} {activeBatches.length === 1 ? 'Batch' : 'Batches'}
                            </span>
                            {activeBatches.slice(0, 2).map(b => (
                              <span key={b.id} className="text-[10px] bg-stone-800 border border-stone-700 px-1.5 py-0.2 rounded font-mono text-stone-300">
                                {b.batchNo} ({b.quantity})
                              </span>
                            ))}
                            {activeBatches.length > 2 && (
                              <span className="text-[10px] text-stone-500 font-mono">
                                +{activeBatches.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {prod.earliestExpiry ? (
                            <div>
                              <span className="font-mono text-xs text-stone-200 font-semibold">
                                {prod.earliestExpiry}
                              </span>
                              {(() => {
                                const diff = (new Date(prod.earliestExpiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                                if (diff < 0) {
                                  return <span className="block text-[10px] text-red-400 font-bold">Expired</span>;
                                }
                                if (diff <= 3) {
                                  return <span className="block text-[10px] text-amber-400 font-bold">Expiring in {Math.max(0, Math.ceil(diff))}d</span>;
                                }
                                return null;
                              })()}
                            </div>
                          ) : (
                            <span className="text-stone-500 text-xs font-mono">-</span>
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
                              title={`Drill down to see all batches for ${prod.productName}`}
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
      ) : (
        /* VIEW 2: BATCH-WISE DETAIL TABLE */
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
                <thead className="bg-stone-850 bg-stone-800/60 text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-800">
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
                      
                      const diffDays = (new Date(batch.useByDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                      const isExpired = diffDays < 0;
                      const isExpiringSoon = diffDays >= 0 && diffDays <= 3;

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
                              batch.quantity <= 0 
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
                              isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-stone-300'
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
                            {isExpired ? (
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
                              <button
                                onClick={() => setSelectedBatchForLogs(batch)}
                                className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition cursor-pointer"
                                title="View Batch Audit & Deduction Logs"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => setEditingBatch(batch)}
                                  className="p-1.5 text-stone-400 hover:text-blue-400 hover:bg-stone-800 rounded transition cursor-pointer"
                                  title="Edit Batch"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {canEdit && (
                                <button
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

      {/* CONFIRM DELETE MODAL */}
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
                          {log.action === 'dispatch_deduction' ? 'Stock Deduction / Dispatched' : 'Batch Registered'}
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
