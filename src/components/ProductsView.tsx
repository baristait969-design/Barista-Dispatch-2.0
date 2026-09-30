import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UtensilsCrossed, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X,
  FileSpreadsheet,
  Search,
  Lock,
  RefreshCw,
  ShieldAlert,
  ThermometerSnowflake,
  Clock
} from 'lucide-react';
import { Product } from '../types';
import { 
  addProduct, 
  updateProduct, 
  deleteProduct, 
  deleteAllProducts, 
  bulkAddProducts,
  syncOfficialProducts,
  getNextProductCode
} from '../services/dataService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useModal } from '../context/ModalDialogContext';
import { 
  PRODUCT_CATEGORIES, 
  STANDARD_UNITS, 
  renderUnitBadge 
} from '../utils/productUtils';

interface ProductsViewProps {
  products: Product[];
}

const DEFAULT_CATEGORIES = [
  ...PRODUCT_CATEGORIES,
  'Bakery & Pastry',
  'Cakes & Desserts',
  'Savory Kitchen',
  'Beverage Bases',
  'Cold Desserts'
];

export const ProductsView: React.FC<ProductsViewProps> = ({ products }) => {
  const { role } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const isAdmin = role === 'admin' || role === 'editor';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const [newName, setNewName] = useState('');
  const [newDispatchTemp, setNewDispatchTemp] = useState<number>(3.5);
  const [newCategory, setNewCategory] = useState<string>('Hot Kitchen');
  const [newUnit, setNewUnit] = useState<string>('Slices');
  const [newShelfLifeDays, setNewShelfLifeDays] = useState<number>(5);
  const [newActive, setNewActive] = useState(true);

  const nextAssignedCode = useMemo(() => {
    return getNextProductCode(products);
  }, [products]);

  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        prod.name.toLowerCase().includes(q) ||
        prod.productId.toLowerCase().includes(q) ||
        (prod.category && prod.category.toLowerCase().includes(q));
      
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? prod.active :
        !prod.active;

      const matchesCategory = 
        selectedCategory === 'all' ? true :
        prod.category === selectedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, searchTerm, statusFilter, selectedCategory]);

  if (role === 'viewer') {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Lock className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h3 className="text-lg font-bold text-white">Access Restricted: Viewer Profile</h3>
          <p className="text-xs text-stone-400 mt-1">
            Your account is assigned the Viewer role. Under Central Kitchen security guidelines, Viewers only have access to Reports and Printing. The Product Master Catalog is restricted to system administrators.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators have permission to add new products to the catalog.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }

    const trimmed = newName.trim();
    if (!trimmed) {
      showAlert('Product Name is compulsory.', {
        title: 'Validation Error',
        type: 'warning'
      });
      return;
    }

    if (isNaN(newDispatchTemp)) {
      showAlert('Valid Dispatch Temperature ( C) is required.', {
        title: 'Invalid Temperature',
        type: 'warning'
      });
      return;
    }

    const parsedNewShelf = Number(newShelfLifeDays);
    if (isNaN(parsedNewShelf) || parsedNewShelf < 1) {
      showAlert('Valid Shelf Life Period (minimum 1 day) is required.', {
        title: 'Validation Error',
        type: 'warning'
      });
      return;
    }

    setSubmitting(true);
    try {
      await addProduct({
        name: trimmed,
        dispatchTemp: Number(newDispatchTemp),
        category: newCategory.trim() || 'Hot Kitchen',
        unit: newUnit || 'Slices',
        shelfLifeDays: parsedNewShelf,
        active: newActive
      });

      setNewName('');
      setNewDispatchTemp(3.5);
      setNewCategory('Hot Kitchen');
      setNewUnit('Slices');
      setNewShelfLifeDays(5);
      setNewActive(true);
      setShowAddModal(false);
      showAlert(`Product "${trimmed}" successfully added to the master catalog.`, {
        title: 'Product Added',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error adding product: ' + err.message, {
        title: 'Operation Failed',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators have permission to edit product details.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }
    if (!editingProduct) return;

    const trimmed = editingProduct.name.trim();
    if (!trimmed) {
      showAlert('Product Name is compulsory.', {
        title: 'Validation Error',
        type: 'warning'
      });
      return;
    }

    const parsedEditTemp = Number(editingProduct.dispatchTemp);
    if (isNaN(parsedEditTemp)) {
      showAlert('Valid Dispatch Temperature ( C) is required.', {
        title: 'Invalid Temperature',
        type: 'warning'
      });
      return;
    }

    const parsedEditShelf = Number(editingProduct.shelfLifeDays);
    if (isNaN(parsedEditShelf) || parsedEditShelf < 1) {
      showAlert('Valid Shelf Life Period (minimum 1 day) is required.', {
        title: 'Validation Error',
        type: 'warning'
      });
      return;
    }

    setSubmitting(true);
    try {
      await updateProduct(editingProduct.id, {
        name: trimmed,
        dispatchTemp: parsedEditTemp,
        category: editingProduct.category || 'Hot Kitchen',
        unit: editingProduct.unit || 'Slices',
        shelfLifeDays: parsedEditShelf,
        active: editingProduct.active
      });
      setEditingProduct(null);
      showAlert(`Product "${trimmed}" details updated successfully.`, {
        title: 'Product Updated',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error updating product: ' + err.message, {
        title: 'Update Failed',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
      showAlert('Product removed from catalog.', {
        title: 'Product Deleted',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error removing product: ' + err.message, {
        title: 'Delete Failed',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResyncAllOfficial = async () => {
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators can synchronize official products.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }

    const confirmed = await showConfirm(
      'Sync master product catalog to database?',
      {
        title: 'Sync Catalog',
        confirmText: 'Sync Catalog',
        type: 'info'
      }
    );
    if (!confirmed) {
      return;
    }

    setSyncing(true);
    try {
      await syncOfficialProducts(true);
      showAlert('All catalog products synced.', {
        title: 'Success',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error syncing products: ' + (err.message || 'Please check network connection.'), {
        title: 'Sync Failed',
        type: 'error'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClearAllProducts = async () => {
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators can clear the product catalog.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }

    const confirmed = await showConfirm(
      `Are you sure you want to remove ALL ${products.length} current products from the database? This action cannot be reversed.`,
      {
        title: 'Clear Product Catalog',
        confirmText: 'Yes, Clear All Products',
        type: 'danger'
      }
    );
    if (confirmed) {
      try {
        await deleteAllProducts();
        showAlert('All catalog products have been cleared.', {
          title: 'Catalog Cleared',
          type: 'success'
        });
      } catch (err: any) {
        showAlert('Error clearing product catalog: ' + err.message, {
          title: 'Operation Failed',
          type: 'error'
        });
      }
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators have permission to import products.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }

    const lines = bulkText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      showAlert('Please enter at least one product line.', {
        title: 'Empty List',
        type: 'warning'
      });
      return;
    }

    setBulkSubmitting(true);
    try {
      const itemsToImport = lines.map(line => {
        const parts = line.split(/[,\t]/).map(p => p.trim());
        const tempVal = parseFloat(parts[1]);
        return {
          name: parts[0],
          dispatchTemp: !isNaN(tempVal) ? tempVal : 3.5,
          category: parts[2] || 'Pastry Kitchen Items',
          unit: 'NoS'
        };
      });
      await bulkAddProducts(itemsToImport);
      setBulkText('');
      setShowBulkModal(false);
      showAlert(`Successfully imported ${itemsToImport.length} products to the catalog!`, {
        title: 'Import Complete',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error importing products: ' + err.message, {
        title: 'Import Failed',
        type: 'error'
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const toggleActiveStatus = async (prod: Product) => {
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators have permission to suspend or activate products.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }
    try {
      await updateProduct(prod.id, { active: !prod.active });
    } catch (err: any) {
      showAlert('Error updating product status: ' + err.message, {
        title: 'Status Update Failed',
        type: 'error'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Barista Product Catalog</h2>
            <span className="text-xs bg-amber-500/20 text-amber-400 font-mono font-bold px-2.5 py-0.5 rounded border border-amber-500/30">
              {products.length} Products
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            {isAdmin 
              ? 'Central Kitchen Master Registry: Add, edit, suspend, and configure standard pastry & bakery products. System generates immutable Product IDs (PRD-XX) automatically.'
              : 'Read-Only Mode: Products represent central kitchen items and cold-chain temperature thresholds. Only Administrators can add, edit, or suspend products.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <>
              <button
                onClick={handleResyncAllOfficial}
                disabled={syncing}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                title="Synchronize official Barista products catalog"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Products'}</span>
              </button>
              {products.length > 0 && (
                <button
                  onClick={handleClearAllProducts}
                  className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  title="Delete all products in the catalog"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear Catalog</span>
                </button>
              )}
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-amber-400 border border-amber-500/30 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                title="Paste list of product names and temperatures"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Quick Import</span>
              </button>
              <button
                onClick={() => {
                  setNewName('');
                  setNewDispatchTemp(3.5);
                  setNewCategory('Pastry Kitchen Items');
                  setNewShelfLifeDays(5);
                  setNewActive(true);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition flex items-center space-x-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Single Product</span>
              </button>
            </>
          ) : (
            <div className="px-3 py-1.5 bg-stone-800/80 border border-stone-700/80 rounded-xl text-xs text-stone-400 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin-Managed Catalog (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3.5 flex items-center space-x-3 text-xs text-stone-400">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            You are viewing the product catalog in read-only mode. Adding new products, updating names, changing dispatch temperatures, and suspending items require Administrator privileges.
          </span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-stone-900 border border-stone-800 rounded-xl p-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product name, code (e.g. PRD-01), or category..."
            className="w-full pl-9 pr-8 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 text-xs text-stone-300">
            <span className="hidden sm:inline font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-stone-950 border border-stone-700 text-stone-100 font-medium text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all" className="bg-stone-900 text-stone-100">All Categories</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat} className="bg-stone-900 text-stone-100">{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex rounded-lg bg-stone-800 p-0.5 border border-stone-700 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'all'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All ({products.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'active'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Active ({products.filter(p => p.active).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'inactive'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Suspended ({products.filter(p => !p.active).length})
            </button>
          </div>
          <span className="text-[11px] text-stone-500 font-mono hidden xl:inline">
            Showing {filteredProducts.length} of {products.length}
          </span>
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 bg-stone-800 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">
              {products.length === 0 ? 'No Products in Catalog' : 'No matching products found'}
            </h3>
            <p className="text-xs text-stone-400">
              {products.length === 0
                ? isAdmin 
                  ? 'Click "Sync Products" to load official Barista pastry and bakery items, or click "Add Single Product" to create one.'
                  : 'No products registered in the database. Please contact an Administrator.'
                : `No products matched "${searchTerm}". Clear search or adjust category/status filters.`}
            </p>
          </div>
          {products.length === 0 && isAdmin && (
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={handleResyncAllOfficial}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition flex items-center space-x-2 shadow cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sync Products</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredProducts.map((prod) => {
            const isTempCompliant = prod.dispatchTemp <= 5.0;
            return (
              <div
                key={prod.id}
                className="bg-stone-900 border border-stone-800 hover:border-amber-600/40 rounded-xl p-4 shadow-sm flex flex-col justify-between transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5">
                      <span 
                        className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40 flex items-center space-x-1"
                        title="System-Generated Product ID (Immutable)"
                      >
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        <span>{prod.productId}</span>
                      </span>
                      {isAdmin ? (
                        <button
                          onClick={() => toggleActiveStatus(prod)}
                          className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-1.5 py-0.5 rounded transition cursor-pointer ${
                            prod.active
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900'
                          }`}
                          title="Administrator: Click to toggle active / suspended status"
                        >
                          {prod.active ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                          <span>{prod.active ? 'Active' : 'Suspended'}</span>
                        </button>
                      ) : (
                        <div
                          className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-1.5 py-0.5 rounded select-none ${
                            prod.active
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {prod.active ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                          <span>{prod.active ? 'Active' : 'Suspended'}</span>
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setEditingProduct(prod)}
                          className="p-1 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition cursor-pointer"
                          title="Edit Product Details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProductToDelete(prod)}
                          className="p-1 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded transition cursor-pointer"
                          title="Delete Product from Catalog"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-white text-sm tracking-tight mb-2 leading-snug">
                    {prod.name}
                  </h3>

                  <div className="flex items-center space-x-1.5 text-[11px] mb-3">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-semibold ${
                      prod.category === 'Hot Kitchen'
                        ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      <span className="truncate">{prod.category || 'Hot Kitchen'}</span>
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-lg border text-xs font-mono mb-2 ${
                    isTempCompliant
                      ? 'bg-cyan-950/40 border-cyan-800/60 text-cyan-300'
                      : 'bg-red-950/40 border-red-800/60 text-red-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-stone-400 flex items-center space-x-1">
                        <ThermometerSnowflake className="w-3 h-3 text-cyan-400" />
                        <span>Dispatch Temp</span>
                      </span>
                      <span className="font-bold text-sm">
                        {prod.dispatchTemp.toFixed(1)} C
                      </span>
                    </div>
                    <div className="text-[10px] mt-1 text-stone-400 flex items-center justify-between">
                      <span>Standard:</span>
                      <span className={isTempCompliant ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {isTempCompliant ? '&lt;= 5.0 C Safe' : 'Warm Warning (&gt;5 C)'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-stone-400 font-mono mt-2">
                    <div className="bg-stone-800/60 px-2 py-1.5 rounded border border-stone-800 flex items-center justify-between">
                      <span className="text-stone-400">Unit:</span>
                      {renderUnitBadge(prod.unit)}
                    </div>
                    <div className="bg-stone-800/60 px-2 py-1.5 rounded border border-stone-800 flex items-center justify-between">
                      <span className="text-stone-400">Expires In:</span>
                      <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{prod.shelfLifeDays || 5} days</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                  <span>Kitchen Availability</span>
                  <span className={prod.active ? 'text-emerald-400' : 'text-rose-400'}>
                    {prod.active ? 'Available for Dispatch' : 'Production Suspended'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <UtensilsCrossed className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Add New Central Kitchen Product</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Product ID (System-Generated)</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                    Locked / Immutable
                  </span>
                </label>
                <input
                  type="text"
                  value={nextAssignedCode}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 bg-stone-950/90 border border-stone-800 rounded-xl text-xs font-mono font-bold text-amber-400 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Product Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classic Blueberry Cheesecake Slices"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Default Dispatch Temperature ( C)</span>
                    <span className="text-amber-400">*</span>
                  </span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                    newDispatchTemp <= 5.0 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}>
                    {newDispatchTemp <= 5.0 ? 'HACCP Compliant (<= 5.0 C)' : 'Above HACCP Limit (>5.0 C)'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newDispatchTemp}
                    onChange={(e) => setNewDispatchTemp(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-stone-400"> C</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Category <span className="text-amber-400">*</span>
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {PRODUCT_CATEGORIES.map(cat => {
                      const isSelected = newCategory === cat;
                      const isHot = cat === 'Hot Kitchen';
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border cursor-pointer ${
                            isSelected 
                              ? isHot 
                                ? 'bg-orange-500/20 text-orange-300 border-orange-500 shadow-sm' 
                                : 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm' 
                              : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200 hover:border-stone-600'
                          }`}
                        >
                          <span className="font-semibold">{cat}</span>
                          {isSelected && (
                            <span className="ml-auto text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                              Selected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span>Standard Unit</span>
                    <span className="text-[10px] text-stone-400 font-mono">Select Unit</span>
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {STANDARD_UNITS.map(u => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>Expiration Period in Days (Shelf Life)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={newShelfLifeDays !== undefined ? newShelfLifeDays : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNewShelfLifeDays(v === '' ? ('' as any) : parseInt(v, 10));
                    }}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="pt-5">
                  <label className="flex items-center space-x-2.5 cursor-pointer bg-stone-800/80 p-2.5 rounded-xl border border-stone-700 hover:border-stone-600 transition">
                    <input
                      type="checkbox"
                      checked={newActive}
                      onChange={(e) => setNewActive(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 bg-stone-900 border-stone-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">Active in Kitchen</span>
                      <span className="text-[10px] text-stone-400">Can be dispatched to retail outlets</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && isAdmin && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Edit Product Details</h3>
              </div>
              <button 
                onClick={() => setEditingProduct(null)} 
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Product ID (System-Generated)</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                    System Assigned / Read-Only
                  </span>
                </label>
                <input
                  type="text"
                  value={editingProduct.productId}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 bg-stone-950/90 border border-stone-800 rounded-xl text-xs font-mono font-bold text-amber-400 cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Product Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Default Dispatch Temperature ( C)</span>
                    <span className="text-amber-400">*</span>
                  </span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                    editingProduct.dispatchTemp <= 5.0 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}>
                    {editingProduct.dispatchTemp <= 5.0 ? 'HACCP Compliant (<= 5.0 C)' : 'Above HACCP Limit (>5.0 C)'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingProduct.dispatchTemp !== undefined ? editingProduct.dispatchTemp : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditingProduct({
                        ...editingProduct,
                        dispatchTemp: v === '' ? ('' as any) : parseFloat(v)
                      });
                    }}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-stone-400"> C</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Category <span className="text-amber-400">*</span>
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {PRODUCT_CATEGORIES.map(cat => {
                      const isSelected = editingProduct.category === cat;
                      const isHot = cat === 'Hot Kitchen';
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setEditingProduct({ ...editingProduct, category: cat })}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border cursor-pointer ${
                            isSelected 
                              ? isHot 
                                ? 'bg-orange-500/20 text-orange-300 border-orange-500 shadow-sm' 
                                : 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm' 
                              : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200 hover:border-stone-600'
                          }`}
                        >
                          <span className="font-semibold">{cat}</span>
                          {isSelected && (
                            <span className="ml-auto text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                              Selected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span>Standard Unit</span>
                    <span className="text-[10px] text-stone-400 font-mono">Select Unit</span>
                  </label>
                  <select
                    value={editingProduct.unit || 'NoS'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {STANDARD_UNITS.map(u => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>Expiration Period in Days (Shelf Life)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={editingProduct.shelfLifeDays !== undefined ? editingProduct.shelfLifeDays : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setEditingProduct({
                        ...editingProduct,
                        shelfLifeDays: v === '' ? ('' as any) : parseInt(v, 10)
                      });
                    }}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="pt-5">
                  <label className="flex items-center space-x-2.5 cursor-pointer bg-stone-800/80 p-2.5 rounded-xl border border-stone-700 hover:border-stone-600 transition">
                    <input
                      type="checkbox"
                      checked={editingProduct.active}
                      onChange={(e) => setEditingProduct({ ...editingProduct, active: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 bg-stone-900 border-stone-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-white block">Active Status</span>
                      <span className="text-[10px] text-stone-400">Available for Central Kitchen dispatch</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      {showBulkModal && isAdmin && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Bulk Quick Import Products</h3>
              </div>
              <button 
                onClick={() => setShowBulkModal(false)} 
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Paste Products (One per line)
                </label>
                <p className="text-[11px] text-stone-400 mb-2">
                  Format: <code className="text-amber-400 bg-stone-950 px-1 py-0.5 rounded">Product Name, Dispatch Temp C, Category, Unit</code>
                </p>
                <textarea
                  rows={6}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Carrot Walnut Cake, 3.8, Pastry Kitchen Items, Slices\nChicken Curry Bun, 4.5, Savory Kitchen, Pieces\nCold Brew Bottle 500ml, 2.5, Beverage Bases, Bottles`}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {bulkSubmitting ? 'Importing...' : 'Import Products'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!productToDelete}
        title="Delete Central Kitchen Product"
        itemName={productToDelete ? `${productToDelete.name} (${productToDelete.productId})` : ''}
        itemType="Master Product"
        description="Are you sure you want to permanently remove this product from the Central Kitchen master catalog? This action cannot be undone."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteProduct}
        onClose={() => setProductToDelete(null)}
      />
    </div>
  );
};
