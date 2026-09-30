import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Printer, 
  Send, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  History, 
  RotateCcw,
  Sparkles,
  Copy,
  Search,
  Check,
  Zap,
  Lock,
  X,
  MapPin
} from 'lucide-react';
import { InventoryBatch, Outlet, Driver, DispatchLog, DispatchLineItem, Product, UserProfile } from '../types';
import { INITIAL_PRODUCTS } from '../data/seedData';
import { createDispatchLogWithDeduction } from '../services/dataService';
import { PrintableDispatchSheet } from './PrintableDispatchSheet';
import { DocumentHaccpHeader } from './DocumentHaccpHeader';
import { getAvailableFIFOBatches, isBatchExpired } from '../utils/batchUtils';
import { calculateFutureDate } from '../utils/productUtils';
import { useModal } from '../context/ModalDialogContext';

interface FormsViewProps {
  batches: InventoryBatch[];
  outlets: Outlet[];
  drivers: Driver[];
  dispatchLogs: DispatchLog[];
  products?: Product[];
  usersList?: UserProfile[];
}

export const FormsView: React.FC<FormsViewProps> = ({
  batches,
  outlets,
  drivers,
  dispatchLogs,
  products,
  usersList
}) => {
  const { userProfile, hasAccess } = useAuth();
  const { showAlert } = useModal();
  const canEdit = hasAccess('forms', 'edit');

  const [activeTab, setActiveTab] = useState<'create' | 'submitted'>('create');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [selectedLogForPrint, setSelectedLogForPrint] = useState<DispatchLog | null>(null);
  const [lastSubmittedLog, setLastSubmittedLog] = useState<DispatchLog | null>(null);

  const getCurrentTime = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getTimeWithOffset = (offsetMinutes: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + offsetMinutes);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const allDriversList = useMemo(() => {
    const list: Array<{ id: string; name: string; designation?: string }> = [];
    const seen = new Set<string>();

    if (usersList && usersList.length > 0) {
      usersList.filter(u => u.role === 'driver').forEach(u => {
        if (!seen.has(u.displayName)) {
          seen.add(u.displayName);
          list.push({ id: u.id, name: u.displayName, designation: u.designation || 'Driver' });
        }
      });
    }

    drivers.forEach(d => {
      if (!seen.has(d.name)) {
        seen.add(d.name);
        list.push({ id: d.id, name: d.name, designation: 'Delivery Driver' });
      }
    });

    return list;
  }, [usersList, drivers]);

  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([]);
  const [outletSearch, setOutletSearch] = useState('');
  const [isOutletDropdownOpen, setIsOutletDropdownOpen] = useState(false);
  const outletDropdownRef = useRef<HTMLDivElement>(null);
  const outletInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (outletDropdownRef.current && !outletDropdownRef.current.contains(event.target as Node)) {
        setIsOutletDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [date, setDate] = useState<string>(getTodayDate());
  const [dispatchTime, setDispatchTime] = useState<string>(getCurrentTime());
  const [syncTimeToRows, setSyncTimeToRows] = useState<boolean>(true);
  const [timeSyncedNotice, setTimeSyncedNotice] = useState<string | null>(null);

  const [selectedDriverName, setSelectedDriverName] = useState<string>(() => {
    if (allDriversList.length > 0) return allDriversList[0].name;
    return 'Kamal Perera';
  });
  const [vehicleNo, setVehicleNo] = useState<string>('Refrigerated Van');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (allDriversList.length > 0 && !allDriversList.some(d => d.name === selectedDriverName)) {
      setSelectedDriverName(allDriversList[0].name);
    }
  }, [allDriversList, selectedDriverName]);

  const [lineItems, setLineItems] = useState<DispatchLineItem[]>(() => {
    const today = getTodayDate();
    const usedBatches = new Set<string>();
    const catalog = (products && products.length > 0 ? products : INITIAL_PRODUCTS)
      .filter(p => p.active !== false);

    const productsWithStock = catalog.filter(prod => {
      const avail = getAvailableFIFOBatches(prod.name, batches);
      return avail.length > 0;
    });

    if (productsWithStock.length > 0) {
      return productsWithStock.map((prod, idx) => {
        const availableBatches = getAvailableFIFOBatches(prod.name, batches);
        const oldestBatchWithStock = availableBatches[0] || null;
        if (oldestBatchWithStock) usedBatches.add(oldestBatchWithStock.batchNo);
        const defTemp = 'dispatchTemp' in prod ? prod.dispatchTemp : (prod as any).defaultTemp;
        const shelfLife = 'shelfLifeDays' in prod && prod.shelfLifeDays ? prod.shelfLifeDays : 5;
        const prodDate = oldestBatchWithStock?.prodDate || today;
        let useByDate = oldestBatchWithStock?.useByDate;
        if (!useByDate || useByDate === prodDate) {
          useByDate = calculateFutureDate(prodDate, shelfLife);
        }

        return {
          id: `row-${idx}-${Date.now()}`,
          productName: prod.name,
          batchNo: oldestBatchWithStock ? oldestBatchWithStock.batchNo : '',
          batchId: oldestBatchWithStock ? oldestBatchWithStock.id : undefined,
          dispatchTime: getCurrentTime(),
          prodDate: prodDate,
          useByDate: useByDate || calculateFutureDate(prodDate, shelfLife),
          dispatchTemp: oldestBatchWithStock ? oldestBatchWithStock.dispatchTemp : (defTemp || 3.5),
          quantity: 0,
          availableStock: oldestBatchWithStock ? oldestBatchWithStock.quantity : 0,
          isCustom: false
        };
      });
    }

    return [{
      id: `row-0-${Date.now()}`,
      productName: '',
      batchNo: '',
      batchId: undefined,
      dispatchTime: getCurrentTime(),
      prodDate: today,
      useByDate: today,
      dispatchTemp: 3.5,
      quantity: 0,
      availableStock: 0,
      isCustom: true
    }];
  });

  useEffect(() => {
    if (editingLogId) return;
    const suspendedNames = new Set(
      (products || [])
        .filter(p => p.active === false)
        .map(p => p.name.trim().toLowerCase())
    );
    if (suspendedNames.size === 0) return;

    setLineItems(prev => {
      const hasSuspended = prev.some(r => r.productName && suspendedNames.has(r.productName.trim().toLowerCase()));
      if (!hasSuspended) return prev;
      const remaining = prev.filter(r => !r.productName || !suspendedNames.has(r.productName.trim().toLowerCase()));
      if (remaining.length === 0) {
        return [{
          id: `row-0-${Date.now()}`,
          productName: '',
          batchNo: '',
          batchId: undefined,
          dispatchTime: getCurrentTime(),
          prodDate: getTodayDate(),
          useByDate: getTodayDate(),
          dispatchTemp: 3.5,
          quantity: 0,
          availableStock: 0,
          isCustom: true
        }];
      }
      return remaining;
    });
  }, [products, editingLogId]);

  useEffect(() => {
    if (editingLogId) return;
    const suspendedOutletIds = new Set(
      outlets.filter(o => o.active === false).map(o => o.id)
    );
    if (suspendedOutletIds.size === 0) return;

    setSelectedOutletIds(prev => {
      const remaining = prev.filter(id => !suspendedOutletIds.has(id));
      if (remaining.length !== prev.length) {
        return remaining;
      }
      return prev;
    });
  }, [outlets, editingLogId]);

  useEffect(() => {
    if (editingLogId) return;
    const suspendedNames = new Set(
      (products || [])
        .filter(p => p.active === false)
        .map(p => p.name.trim().toLowerCase())
    );

    setLineItems(prev => {
      const usedBatchesInForm = new Set<string>();
      return prev.map(row => {
        if (!row.productName || suspendedNames.has(row.productName.trim().toLowerCase())) return row;
        const availableBatches = getAvailableFIFOBatches(row.productName, batches);
        const currentBatch = batches.find(b => b.batchNo === row.batchNo);

        if (currentBatch && (currentBatch.quantity || 0) > 0 && !isBatchExpired(currentBatch.useByDate)) {
          usedBatchesInForm.add(currentBatch.batchNo);
          return {
            ...row,
            availableStock: currentBatch.quantity,
            quantity: Math.min(row.quantity, currentBatch.quantity)
          };
        }

        const nextBatch = availableBatches.find(b => !usedBatchesInForm.has(b.batchNo)) || availableBatches[0] || null;
        if (nextBatch) {
          usedBatchesInForm.add(nextBatch.batchNo);
          const prodDef = (products || []).find(p => p.name.trim().toLowerCase() === row.productName.trim().toLowerCase()) ||
            INITIAL_PRODUCTS.find(p => p.name.trim().toLowerCase() === row.productName.trim().toLowerCase());
          const shelfLife = (prodDef && 'shelfLifeDays' in prodDef && prodDef.shelfLifeDays) ? prodDef.shelfLifeDays : 5;
          const prodDate = nextBatch.prodDate || row.prodDate || getTodayDate();
          let useByDate = nextBatch.useByDate;
          if (!useByDate || useByDate === prodDate) {
            useByDate = calculateFutureDate(prodDate, shelfLife);
          }
          return {
            ...row,
            batchNo: nextBatch.batchNo,
            batchId: nextBatch.id,
            availableStock: nextBatch.quantity,
            prodDate: prodDate,
            useByDate: useByDate,
            dispatchTemp: nextBatch.dispatchTemp !== undefined ? nextBatch.dispatchTemp : row.dispatchTemp,
            quantity: Math.min(row.quantity, nextBatch.quantity)
          };
        }

        return {
          ...row,
          batchNo: '',
          batchId: undefined,
          availableStock: 0,
          quantity: 0
        };
      });
    });
  }, [batches, products, editingLogId]);

  const handleTopDispatchTimeChange = (newTime: string, applyToAll = syncTimeToRows) => {
    setDispatchTime(newTime);
    if (applyToAll) {
      setLineItems(prev => prev.map(row => ({ ...row, dispatchTime: newTime })));
      triggerTimeToast(`Auto-filled dispatch time to ${newTime} across all items`);
    }
  };

  const handleAutoFillNow = () => {
    const nowTime = getCurrentTime();
    setDispatchTime(nowTime);
    setLineItems(prev => prev.map(row => ({ ...row, dispatchTime: nowTime })));
    triggerTimeToast(`Auto-filled current time (${nowTime}) to all item rows`);
  };

  const handleSyncAllRowsToTopTime = () => {
    setLineItems(prev => prev.map(row => ({ ...row, dispatchTime })));
    triggerTimeToast(`Synchronized all items to top dispatch time (${dispatchTime})`);
  };

  const triggerTimeToast = (msg: string) => {
    setTimeSyncedNotice(msg);
    setTimeout(() => {
      setTimeSyncedNotice(null);
    }, 2800);
  };

  const handleDriverChange = (driverName: string) => {
    setSelectedDriverName(driverName);
    const found = drivers.find(d => d.name === driverName);
    if (found) {
      setVehicleNo(found.vehicleNo);
    }
  };

  const selectOutlet = (outletId: string) => {
    const targetOutlet = outlets.find(o => o.id === outletId);
    if (!editingLogId && targetOutlet && targetOutlet.active === false) {
      showAlert(`Outlet "${targetOutlet.name}" is currently suspended and cannot receive dispatches.`, {
        title: 'Suspended Outlet Blocked',
        type: 'warning'
      });
      return;
    }
    setSelectedOutletIds([outletId]);
    setIsOutletDropdownOpen(false);
    setOutletSearch('');
  };

  const clearOutletSelection = () => {
    setSelectedOutletIds([]);
    setOutletSearch('');
    setIsOutletDropdownOpen(false);
  };

  const allAvailableProducts = useMemo(() => {
    const suspendedNames = new Set(
      (products || [])
        .filter(p => p.active === false)
        .map(p => p.name.trim().toLowerCase())
    );
    const set = new Set<string>();
    const sourceList = (products && products.length > 0 ? products : INITIAL_PRODUCTS);
    sourceList.forEach(p => {
      const trimmed = p.name.trim();
      if (p.active !== false && !suspendedNames.has(trimmed.toLowerCase())) {
        set.add(trimmed);
      }
    });
    batches.forEach(b => {
      if (b.productName) {
        const trimmed = b.productName.trim();
        if (!suspendedNames.has(trimmed.toLowerCase())) {
          const prodInCatalog = (products || []).find(
            p => p.name.trim().toLowerCase() === trimmed.toLowerCase()
          );
          if (!prodInCatalog || prodInCatalog.active !== false) {
            set.add(trimmed);
          }
        }
      }
    });
    return Array.from(set).sort((a, b) => {
      const stockA = getAvailableFIFOBatches(a, batches).reduce((acc, batch) => acc + (batch.quantity || 0), 0);
      const stockB = getAvailableFIFOBatches(b, batches).reduce((acc, batch) => acc + (batch.quantity || 0), 0);
      if (stockA > 0 && stockB === 0) return -1;
      if (stockB > 0 && stockA === 0) return 1;
      return a.localeCompare(b);
    });
  }, [products, batches]);

  const handleResetEntireForm = () => {
    setSelectedOutletIds([]);
    setOutletSearch('');
    setDate(getTodayDate());
    setDispatchTime(getCurrentTime());
    setNotes('');

    const today = getTodayDate();
    const usedBatches = new Set<string>();
    const suspendedNames = new Set(
      (products || [])
        .filter(p => p.active === false)
        .map(p => p.name.trim().toLowerCase())
    );
    const catalog = (products && products.length > 0 ? products : INITIAL_PRODUCTS)
      .filter(p => p.active !== false && !suspendedNames.has(p.name.trim().toLowerCase()));

    const productsWithStock = catalog.filter(prod => {
      const avail = getAvailableFIFOBatches(prod.name, batches);
      return avail.length > 0;
    });

    if (productsWithStock.length > 0) {
      setLineItems(
        productsWithStock.map((prod, idx) => {
          const availableBatches = getAvailableFIFOBatches(prod.name, batches);
          const chosenBatch = availableBatches[0] || null;
          if (chosenBatch) usedBatches.add(chosenBatch.batchNo);
          const defTemp = 'dispatchTemp' in prod ? prod.dispatchTemp : (prod as any).defaultTemp;
          return {
            id: `row-${idx}-${Date.now()}`,
            productName: prod.name,
            batchNo: chosenBatch ? chosenBatch.batchNo : '',
            batchId: chosenBatch ? chosenBatch.id : undefined,
            dispatchTime: getCurrentTime(),
            prodDate: chosenBatch?.prodDate || today,
            useByDate: chosenBatch?.useByDate || today,
            dispatchTemp: chosenBatch?.dispatchTemp !== undefined ? chosenBatch.dispatchTemp : (defTemp || 3.5),
            quantity: 0,
            availableStock: chosenBatch ? chosenBatch.quantity : 0,
            isCustom: false
          };
        })
      );
    } else {
      setLineItems([{
        id: `row-0-${Date.now()}`,
        productName: '',
        batchNo: '',
        batchId: undefined,
        dispatchTime: getCurrentTime(),
        prodDate: today,
        useByDate: today,
        dispatchTemp: 3.5,
        quantity: 0,
        availableStock: 0,
        isCustom: true
      }]);
    }
    setEditingLogId(null);
    triggerTimeToast('Reset form to default state (in-stock items only)');
  };

  const handleAddNextBatchForProduct = (sourceRowId: string) => {
    const sourceRow = lineItems.find(r => r.id === sourceRowId);
    if (!sourceRow || !sourceRow.productName) return;
    const trimmed = sourceRow.productName.trim();
    const availableBatches = getAvailableFIFOBatches(trimmed, batches);
    
    const rowsForThisProduct = lineItems.filter(
      r => r.productName && r.productName.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (rowsForThisProduct.length >= availableBatches.length) {
      showAlert(`All ${availableBatches.length} available batches for "${trimmed}" are already added to this dispatch form.`, {
        title: 'All Batches in Form',
        type: 'info'
      });
      return;
    }

    const usedBatchNos = new Set(
      rowsForThisProduct.filter(r => r.batchNo).map(r => r.batchNo)
    );
    const nextBatch = availableBatches.find(b => !usedBatchNos.has(b.batchNo)) || availableBatches[rowsForThisProduct.length] || null;
    if (!nextBatch) {
      showAlert(`No further unassigned batches available for "${trimmed}".`, {
        title: 'All Batches Added',
        type: 'info'
      });
      return;
    }

    const prodDef = (products || []).find(p => p.name.trim().toLowerCase() === trimmed.toLowerCase()) ||
      INITIAL_PRODUCTS.find(p => p.name.trim().toLowerCase() === trimmed.toLowerCase());
    const fallbackTemp = prodDef ? ('dispatchTemp' in prodDef ? prodDef.dispatchTemp : prodDef.defaultTemp) : 3.5;
    const shelfLife = (prodDef && 'shelfLifeDays' in prodDef && prodDef.shelfLifeDays) ? prodDef.shelfLifeDays : 5;
    const prodDate = nextBatch.prodDate || getTodayDate();
    let useByDate = nextBatch.useByDate;
    if (!useByDate || useByDate === prodDate) {
      useByDate = calculateFutureDate(prodDate, shelfLife);
    }

    const newRow: DispatchLineItem = {
      id: `row-batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productName: sourceRow.productName,
      batchNo: nextBatch.batchNo,
      batchId: nextBatch.id,
      dispatchTime: sourceRow.dispatchTime || dispatchTime || getCurrentTime(),
      prodDate: prodDate,
      useByDate: useByDate,
      dispatchTemp: nextBatch.dispatchTemp !== undefined ? nextBatch.dispatchTemp : fallbackTemp,
      availableStock: nextBatch.quantity,
      quantity: 0,
      isCustom: true
    };

    setLineItems(prev => {
      const lastIndex = prev.map(r => r.productName?.trim().toLowerCase()).lastIndexOf(trimmed.toLowerCase());
      if (lastIndex === -1) return [...prev, newRow];
      const next = [...prev];
      next.splice(lastIndex + 1, 0, newRow);
      return next;
    });
    triggerTimeToast(`Added next FIFO batch (${nextBatch.batchNo}) for ${trimmed}`);
  };

  const handleProductNameChange = (rowId: string, newProductName: string) => {
    const trimmed = newProductName.trim();
    if (!trimmed) {
      setLineItems(prev =>
        prev.map(row => {
          if (row.id === rowId) {
            return {
              ...row,
              productName: '',
              batchNo: '',
              batchId: undefined,
              availableStock: 0,
              quantity: 0,
              prodDate: getTodayDate(),
              useByDate: getTodayDate()
            };
          }
          return row;
        })
      );
      return;
    }

    const isSuspended = (products || []).some(
      p => p.active === false && p.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isSuspended) {
      showAlert(`Product "${trimmed}" is currently suspended and cannot be dispatched.`, {
        title: 'Suspended Product Blocked',
        type: 'warning'
      });
      return;
    }

    const availableBatches = getAvailableFIFOBatches(trimmed, batches);
    const usedBatchNosInOtherRows = lineItems
      .filter(r => r.id !== rowId && r.productName.trim().toLowerCase() === trimmed.toLowerCase() && r.batchNo)
      .map(r => r.batchNo);
    const availableBatch = availableBatches.find(b => !usedBatchNosInOtherRows.includes(b.batchNo)) || availableBatches[0] || null;

    const prodDef = (products || []).find(p => p.name.trim().toLowerCase() === trimmed.toLowerCase()) ||
      INITIAL_PRODUCTS.find(p => p.name.trim().toLowerCase() === trimmed.toLowerCase());
    const fallbackTemp = prodDef ? ('dispatchTemp' in prodDef ? prodDef.dispatchTemp : prodDef.defaultTemp) : 3.5;

    let updatedRow: DispatchLineItem;
    if (availableBatch) {
      const prodDate = availableBatch.prodDate || getTodayDate();
      const shelfLife = (prodDef && 'shelfLifeDays' in prodDef && prodDef.shelfLifeDays) ? prodDef.shelfLifeDays : 5;
      let useByDate = availableBatch.useByDate;
      if (!useByDate || useByDate === prodDate) {
        useByDate = calculateFutureDate(prodDate, shelfLife);
      }
      updatedRow = {
        id: rowId,
        productName: availableBatch.productName || newProductName,
        batchNo: availableBatch.batchNo,
        batchId: availableBatch.id,
        dispatchTime: dispatchTime || getCurrentTime(),
        prodDate: prodDate,
        useByDate: useByDate,
        dispatchTemp: availableBatch.dispatchTemp !== undefined ? availableBatch.dispatchTemp : fallbackTemp,
        availableStock: availableBatch.quantity,
        quantity: 0,
        isCustom: true
      };
    } else {
      const prodDate = getTodayDate();
      const shelfLife = (prodDef && 'shelfLifeDays' in prodDef && prodDef.shelfLifeDays) ? prodDef.shelfLifeDays : 5;
      const useByDate = calculateFutureDate(prodDate, shelfLife);
      updatedRow = {
        id: rowId,
        productName: newProductName,
        batchNo: '',
        batchId: undefined,
        dispatchTime: dispatchTime || getCurrentTime(),
        prodDate: prodDate,
        useByDate: useByDate,
        dispatchTemp: fallbackTemp,
        availableStock: 0,
        quantity: 0,
        isCustom: true
      };
    }

    setLineItems(prev => {
      const matchingProductIndex = prev.findIndex(
        r => r.id !== rowId && r.productName.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (matchingProductIndex !== -1) {
        const withoutCurrent = prev.filter(r => r.id !== rowId);
        let insertPos = matchingProductIndex;
        while (
          insertPos < withoutCurrent.length &&
          withoutCurrent[insertPos].productName.trim().toLowerCase() === trimmed.toLowerCase()
        ) {
          insertPos++;
        }
        withoutCurrent.splice(insertPos, 0, updatedRow);
        return withoutCurrent;
      }
      return prev.map(r => (r.id === rowId ? updatedRow : r));
    });
  };

  const handleBatchSelect = (rowId: string, batchNo: string) => {
    const currentRow = lineItems.find(r => r.id === rowId);
    if (!currentRow) return;

    if (batchNo) {
      const isAlreadyUsed = lineItems.some(
        r => r.id !== rowId && 
             r.productName.trim().toLowerCase() === currentRow.productName.trim().toLowerCase() && 
             r.batchNo === batchNo
      );
      if (isAlreadyUsed) {
        showAlert(`Batch ${batchNo} is already selected on another row for this product. Please select a different batch.`, {
          title: 'Duplicate Batch Selected',
          type: 'warning'
        });
        return;
      }
    }

    const selectedBatch = batches.find(b => b.batchNo === batchNo);
    if (selectedBatch && isBatchExpired(selectedBatch.useByDate)) {
      showAlert(`Batch "${selectedBatch.batchNo}" expired on ${selectedBatch.useByDate} and cannot be dispatched under HACCP food safety standards.`, {
        title: 'Expired Batch Blocked',
        type: 'danger'
      });
      return;
    }

    setLineItems(prev =>
      prev.map(row => {
        if (row.id === rowId) {
          if (selectedBatch) {
            const prodDef = (products || []).find(p => p.name.trim().toLowerCase() === selectedBatch.productName.trim().toLowerCase()) ||
              INITIAL_PRODUCTS.find(p => p.name.trim().toLowerCase() === selectedBatch.productName.trim().toLowerCase());
            const shelfLife = (prodDef && 'shelfLifeDays' in prodDef && prodDef.shelfLifeDays) ? prodDef.shelfLifeDays : 5;
            const prodDate = selectedBatch.prodDate || getTodayDate();
            let useByDate = selectedBatch.useByDate;
            if (!useByDate || useByDate === prodDate) {
              useByDate = calculateFutureDate(prodDate, shelfLife);
            }
            return {
              ...row,
              batchNo: selectedBatch.batchNo,
              batchId: selectedBatch.id,
              productName: selectedBatch.productName,
              prodDate: prodDate,
              useByDate: useByDate,
              dispatchTemp: selectedBatch.dispatchTemp !== undefined ? selectedBatch.dispatchTemp : (prodDef && 'dispatchTemp' in prodDef ? prodDef.dispatchTemp : (prodDef as any)?.defaultTemp || 3.5),
              availableStock: selectedBatch.quantity,
              quantity: Math.min(row.quantity, selectedBatch.quantity)
            };
          }
          return { ...row, batchNo, batchId: undefined, availableStock: 0 };
        }
        return row;
      })
    );
  };

  const handleRowQuantityChange = (rowId: string, requestedQty: number) => {
    setLineItems(prev =>
      prev.map(row => {
        if (row.id === rowId) {
          let safeQty = Math.max(0, Math.floor(isNaN(requestedQty) ? 0 : requestedQty));
          if (row.availableStock !== undefined && row.availableStock !== null) {
            safeQty = Math.min(safeQty, row.availableStock);
          }
          return { ...row, quantity: safeQty };
        }
        return row;
      })
    );
  };

  const handleRowTimeChange = (rowId: string, time: string) => {
    setLineItems(prev =>
      prev.map(row => (row.id === rowId ? { ...row, dispatchTime: time } : row))
    );
  };

  const handleSetRowTimeToNow = (rowId: string) => {
    const nowTime = getCurrentTime();
    setLineItems(prev =>
      prev.map(row => (row.id === rowId ? { ...row, dispatchTime: nowTime } : row))
    );
  };

  const removeRow = (rowId: string) => {
    if (lineItems.length <= 1) {
      showAlert('At least one product line is required on the dispatch log.', {
        title: 'Product Line Required',
        type: 'warning'
      });
      return;
    }
    setLineItems(prev => prev.filter(r => r.id !== rowId));
  };

  const supervisorName = userProfile?.displayName || userProfile?.email || 'Barista IT Administrator';
  const supervisorId = userProfile?.uid || 'USR-AUTH';

  const selectedOutletNames = outlets
    .filter(o => selectedOutletIds.includes(o.id))
    .map(o => o.name);

  const filteredOutlets = outlets.filter(o => {
    if (!editingLogId && o.active === false) {
      return false;
    }
    if (editingLogId && o.active === false && !selectedOutletIds.includes(o.id)) {
      return false;
    }
    return (
      o.name.toLowerCase().includes(outletSearch.toLowerCase()) ||
      o.outletId.toLowerCase().includes(outletSearch.toLowerCase()) ||
      (o.location ? o.location.toLowerCase().includes(outletSearch.toLowerCase()) : false)
    );
  });

  const selectedOutlet = useMemo(() => {
    if (selectedOutletIds.length === 0) return null;
    return outlets.find(o => o.id === selectedOutletIds[0]) || null;
  }, [outlets, selectedOutletIds]);

  const displayOutlets = useMemo(() => {
    return [...filteredOutlets].sort((a, b) => {
      const numA = parseInt(a.outletId?.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.outletId?.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  }, [filteredOutlets]);

  const totalUnits = lineItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const activeItemsCount = lineItems.filter(i => (i.quantity || 0) > 0).length;
  const isHaccpCompliant = lineItems.every(i => i.dispatchTemp <= 5.0);

  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showAlert('Viewers cannot submit dispatch records. Switch to Admin or Editor role.', {
        title: 'Action Prohibited',
        type: 'security'
      });
      return;
    }

    if (selectedOutletIds.length === 0) {
      showAlert('Please search and select a delivery destination outlet first.', {
        title: 'Destination Outlet Compulsory',
        type: 'warning'
      });
      return;
    }

    const suspendedChosenOutlets = outlets.filter(
      o => selectedOutletIds.includes(o.id) && o.active === false
    );
    if (suspendedChosenOutlets.length > 0) {
      showAlert(`Cannot dispatch to suspended outlet(s): ${suspendedChosenOutlets.map(o => o.name).join(', ')}. Please deselect them before submitting.`, {
        title: 'Suspended Outlet Selected',
        type: 'warning'
      });
      return;
    }

    const activeItems = lineItems.filter(i => i.quantity > 0);
    if (activeItems.length === 0) {
      showAlert('Please enter a quantity (> 0) for at least one product row to dispatch.', {
        title: 'No Quantity Entered',
        type: 'warning'
      });
      return;
    }

    const suspendedProdNames = new Set(
      (products || []).filter(p => p.active === false).map(p => p.name.trim().toLowerCase())
    );
    const suspendedActiveItems = activeItems.filter(i => suspendedProdNames.has(i.productName.trim().toLowerCase()));
    if (suspendedActiveItems.length > 0) {
      showAlert(`Cannot dispatch suspended product(s): ${suspendedActiveItems.map(i => i.productName).join(', ')}. Please remove them from the dispatch form.`, {
        title: 'Suspended Products Included',
        type: 'warning'
      });
      return;
    }

    for (const item of activeItems) {
      if (item.availableStock !== undefined && item.quantity > item.availableStock) {
        showAlert(
          `Cannot dispatch ${item.quantity} units of ${item.productName} (Batch ${item.batchNo}). Only ${item.availableStock} units remaining in central kitchen stock.`,
          {
            title: 'Insufficient Inventory',
            type: 'warning'
          }
        );
        return;
      }
    }

    setSubmitting(true);
    setSubmitSuccess(null);
    try {
      const newLogId = await createDispatchLogWithDeduction(
        {
          docNo: 'BCL/REC/HACCP/32',
          title: 'Central Kitchen Dispatch Log',
          revision: 'Rev 01',
          version: '01',
          effectiveDate: '01 January 2025',
          haccpLink: 'OPRP-2',
          approvedBy: 'QA Executive',
          date,
          dispatchTime,
          outletIds: selectedOutletIds,
          outletNames: selectedOutletNames,
          driverName: selectedDriverName,
          vehicleNo,
          supervisor: supervisorName,
          supervisorId: supervisorId,
          supervisorEmail: userProfile?.email || '',
          items: activeItems,
          notes,
          haccpCompliant: activeItems.every(i => i.dispatchTemp <= 5.0),
          status: 'submitted'
        },
        batches
      );

      const submittedDoc: DispatchLog = {
        id: newLogId,
        docNo: 'BCL/REC/HACCP/32',
        title: 'Central Kitchen Dispatch Log',
        revision: 'Rev 01',
        version: '01',
        effectiveDate: '01 January 2025',
        haccpLink: 'OPRP-2',
        approvedBy: 'QA Executive',
        date,
        dispatchTime,
        outletIds: selectedOutletIds,
        outletNames: selectedOutletNames,
        driverName: selectedDriverName,
        vehicleNo,
        supervisor: supervisorName,
        supervisorId: supervisorId,
        supervisorEmail: userProfile?.email || '',
        items: activeItems,
        notes,
        haccpCompliant: activeItems.every(i => i.dispatchTemp <= 5.0),
        status: 'submitted',
        createdAt: new Date().toISOString()
      };

      setEditingLogId(null);
      setLastSubmittedLog(submittedDoc);
      setSelectedLogForPrint(submittedDoc);
      setSubmitSuccess(`Dispatch Log successfully submitted as a new separate record (${newLogId})!`);
      setLineItems(prev => prev.map(r => ({ ...r, quantity: 0 })));
    } catch (err: any) {
      showAlert('Error submitting dispatch log: ' + err.message, {
        title: 'Dispatch Submission Error',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetrieveForEdit = (log: DispatchLog) => {
    setEditingLogId(log.id);
    setDate(log.date);
    setDispatchTime(log.dispatchTime);
    setSelectedOutletIds(log.outletIds);
    setSelectedDriverName(log.driverName);
    setVehicleNo(log.vehicleNo || '');
    setNotes(log.notes || '');
    setLineItems(log.items);
    setActiveTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-5 print:hidden shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Central Kitchen Dispatch Form</h2>
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold">
              BCL/REC/HACCP/32
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Dispatch details with automatic or manual time entry, multi-outlet delivery, and cold-chain compliance.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex rounded-xl bg-stone-800 p-1 border border-stone-700">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                activeTab === 'create' ? 'bg-amber-600 text-stone-950 shadow-sm' : 'text-stone-300 hover:text-white'
              }`}
            >
              {editingLogId ? 'Editing Form' : 'New Dispatch'}
            </button>
            <button
              onClick={() => setActiveTab('submitted')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'submitted' ? 'bg-amber-600 text-stone-950 shadow-sm' : 'text-stone-300 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Submitted Archive ({dispatchLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {selectedLogForPrint && (
        <PrintableDispatchSheet
          dispatchLog={selectedLogForPrint}
          onClose={() => setSelectedLogForPrint(null)}
          autoPrint={false}
        />
      )}

      {timeSyncedNotice && (
        <div className="fixed top-20 right-6 z-50 bg-amber-500 text-stone-950 px-4 py-2.5 rounded-xl shadow-2xl font-bold text-xs flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4" />
          <span>{timeSyncedNotice}</span>
        </div>
      )}

      {lastSubmittedLog && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-stone-900 to-stone-900 border-2 border-emerald-500/80 rounded-2xl p-5 text-white shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden animate-in fade-in">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-extrabold text-sm sm:text-base text-white">
                Dispatch Successfully Submitted & Stock Deducted!
              </span>
              <span className="bg-emerald-900/90 border border-emerald-500 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                {lastSubmittedLog.items.length} Products Dispatched
              </span>
            </div>
            <p className="text-xs text-stone-300">
              Delivered to: <strong className="text-white">{lastSubmittedLog.outletNames.join(', ')}</strong> | Total Units: <strong className="text-amber-400 font-mono">{lastSubmittedLog.items.reduce((s, i) => s + i.quantity, 0)} units</strong> | Driver: {lastSubmittedLog.driverName} ({lastSubmittedLog.vehicleNo || 'Van'})
            </p>
          </div>
          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedLogForPrint(lastSubmittedLog)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-lg transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Dispatched Items ({lastSubmittedLog.items.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLastSubmittedLog(null);
                setSubmitSuccess(null);
              }}
              className="text-stone-400 hover:text-white text-xs px-2.5 py-1.5 rounded-lg border border-stone-700 hover:bg-stone-800 transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {submitSuccess && !lastSubmittedLog && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-800 rounded-2xl text-emerald-200 text-xs flex items-center justify-between print:hidden shadow-md">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{submitSuccess}</span>
          </div>
          <button
            onClick={() => setSubmitSuccess(null)}
            className="text-emerald-400 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeTab === 'submitted' ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h3 className="font-bold text-white text-base">Submitted Dispatch Logs Archive</h3>
              <p className="text-xs text-stone-400">
                Retrieve submitted forms for edits, re-verification, or HACCP inspection.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('create')}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              + Create New Dispatch
            </button>
          </div>

          {dispatchLogs.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-xs">
              No dispatch logs submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-stone-800">
              {dispatchLogs.map((log) => (
                <div key={log.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-amber-400 text-sm">{log.docNo}</span>
                      <span className="text-xs bg-stone-800 px-2 py-0.5 rounded text-stone-300">
                        Date: {log.date} @ {log.dispatchTime}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        {log.haccpCompliant ? 'HACCP Compliant (<= 5.0 C)' : 'Audit Warning'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-300">
                      <strong>Outlets:</strong> {log.outletNames.join(', ')}
                    </div>
                    <div className="text-xs text-stone-400">
                      Driver: <span className="text-stone-300">{log.driverName}</span> ({log.vehicleNo || 'Van'}) | Supervisor: <span className="text-amber-300">{log.supervisor}</span> | Items: <span className="text-stone-300 font-semibold">{log.items.length} line items ({log.items.reduce((s, i) => s + i.quantity, 0)} units total)</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleRetrieveForEdit(log)}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-amber-400 border border-stone-700 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
                      title="Load this dispatch data to submit as a new separate dispatch record"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Load into Form</span>
                    </button>
                    <button
                      onClick={() => setSelectedLogForPrint(log)}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-amber-400 border border-stone-700 hover:border-amber-500/50 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                      title="Print official dispatch document for this record"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Sheet</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmitDispatch} className="space-y-6">
          {editingLogId && (
            <div className="p-3 bg-amber-950/70 border border-amber-800 rounded-xl text-amber-200 text-xs flex items-center justify-between print:hidden">
              <div className="flex items-center space-x-2">
                <Copy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Loaded data from previous log (<strong>{editingLogId}</strong>). Submitting will create a <strong>new separate record</strong> without overwriting the previous one.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingLogId(null);
                  setLineItems(prev => prev.map(r => ({ ...r, quantity: 0 })));
                }}
                className="text-xs text-amber-400 hover:text-white underline cursor-pointer ml-2 shrink-0"
              >
                Clear Form
              </button>
            </div>
          )}

          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-6 shadow-xl print:bg-white print:text-black print:p-2 print:border-none print:shadow-none">
            <DocumentHaccpHeader
              title="Central Kitchen Dispatch Log"
              subtitle="Daily Food Safety & Cold-Chain Logistics Document"
              docCode="BCL/REC/HACCP/32"
              effectiveDate={date || "01 January 2025"}
              revision="Rev 01"
              version="01"
              approvedBy={supervisorName || "QA Executive"}
              refId={editingLogId ? (dispatchLogs.find(l => l.id === editingLogId)?.docNo || 'BCL-CK-DISP') : 'BCL-CK-DISP'}
              haccpLink="OPRP-2 (Cold-Chain <= 5.0 C)"
              mandateNotice="CRITICAL CONTROL REQUIREMENT: Maximum dispatch transit temperature must remain <= 5.0 C."
              className="mb-5"
            />

            {/* Outlet Selection & Dispatch Date/Time Section */}
            <div className="bg-stone-850/70 print:bg-white border border-stone-800 print:border-black rounded-xl p-4 sm:p-5 mb-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Outlets Selection */}
                <div className="lg:col-span-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white print:text-black flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-amber-400 print:text-black" />
                      <span>Destination Outlet</span>
                      <span className="text-red-400 font-extrabold text-xs">*</span>
                      {selectedOutlet ? (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold flex items-center space-x-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Selected</span>
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-950/80 text-red-300 px-1.5 py-0.5 rounded border border-red-800 font-bold animate-pulse">
                          Compulsory: Select 1 Outlet
                        </span>
                      )}
                    </label>
                    {selectedOutlet && (
                      <button
                        type="button"
                        onClick={clearOutletSelection}
                        className="text-stone-400 hover:text-amber-400 text-[11px] hover:underline cursor-pointer flex items-center space-x-1 font-medium print:hidden"
                        title="Clear selected outlet"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>

                  {selectedOutlet && !isOutletDropdownOpen ? (
                    <div className="p-3 bg-stone-900 print:bg-white border-2 border-amber-500/80 print:border-black rounded-xl flex items-center justify-between shadow-sm">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 print:border-black">
                          <Building2 className="w-5 h-5 text-amber-400 print:text-black" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 shrink-0 print:border-black print:text-black">
                              {selectedOutlet.outletId}
                            </span>
                            <span className="text-sm font-bold text-white print:text-black truncate">
                              {selectedOutlet.name}
                            </span>
                          </div>
                          {selectedOutlet.location && (
                            <div className="text-[11px] text-stone-400 print:text-stone-700 truncate flex items-center space-x-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-stone-500 shrink-0 print:hidden" />
                              <span>{selectedOutlet.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOutletDropdownOpen(true);
                          setTimeout(() => outletInputRef.current?.focus(), 50);
                        }}
                        className="ml-3 px-3 py-1.5 bg-stone-800 hover:bg-stone-750 text-amber-400 hover:text-amber-300 border border-stone-700 rounded-lg text-xs font-semibold cursor-pointer transition shrink-0 flex items-center space-x-1 print:hidden"
                        title="Change destination outlet"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Change</span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative print:hidden" ref={outletDropdownRef}>
                      <div className="relative">
                        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          ref={outletInputRef}
                          value={outletSearch}
                          onChange={(e) => {
                            setOutletSearch(e.target.value);
                            setIsOutletDropdownOpen(true);
                          }}
                          onFocus={() => setIsOutletDropdownOpen(true)}
                          placeholder="Type outlet name, code (e.g. BIA, OUT-01), or location..."
                          className="w-full pl-9 pr-9 py-2.5 bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition font-medium"
                        />
                        {outletSearch ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOutletSearch('');
                              outletInputRef.current?.focus();
                            }}
                            className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-200 cursor-pointer p-0.5"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : null}
                      </div>

                      {isOutletDropdownOpen && (
                        <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-stone-900 border border-stone-700 rounded-xl shadow-2xl shadow-black/80 py-1 divide-y divide-stone-800/80">
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-950/90 flex justify-between items-center sticky top-0 backdrop-blur-sm z-10 border-b border-stone-800">
                            <span>Suggested Outlets ({displayOutlets.length})</span>
                            <span className="text-amber-400/90 font-mono lowercase">click to select</span>
                          </div>
                          {outlets.length === 0 ? (
                            <div className="p-4 text-center text-xs text-stone-400">
                              No outlets registered in system yet.
                            </div>
                          ) : displayOutlets.length === 0 ? (
                            <div className="p-4 text-center text-xs text-stone-400">
                              No active outlets match &quot;{outletSearch}&quot;.
                            </div>
                          ) : (
                            displayOutlets.map((outlet) => {
                              const isSelected = selectedOutletIds.includes(outlet.id);
                              return (
                                <button
                                  key={outlet.id}
                                  type="button"
                                  onClick={() => selectOutlet(outlet.id)}
                                  className={`w-full px-3 py-2 text-left transition flex items-center justify-between group cursor-pointer ${
                                    isSelected 
                                      ? 'bg-amber-500/20 text-white font-bold' 
                                      : 'hover:bg-amber-600/10 text-stone-200 hover:text-white'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                                      {outlet.outletId}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="text-xs font-medium group-hover:text-amber-300 truncate">
                                        {outlet.name}
                                      </div>
                                      {outlet.location && (
                                        <div className="text-[10px] text-stone-400 truncate flex items-center space-x-1">
                                          <MapPin className="w-2.5 h-2.5 text-stone-500 shrink-0" />
                                          <span>{outlet.location}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                                    {isSelected ? (
                                      <span className="text-[10px] font-bold text-amber-400 flex items-center space-x-1">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                        <span>Selected</span>
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-stone-500 group-hover:text-amber-400">
                                        Select
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Date, Time, Driver */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-white print:text-black mb-1">
                        Dispatch Date
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-900 print:bg-white border border-stone-700 print:border-black rounded-lg text-xs text-stone-100 print:text-black focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-white print:text-black flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-blue-400 print:text-black" />
                          <span>Dispatch Time</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoFillNow}
                          className="text-[11px] text-amber-400 hover:text-amber-300 print:hidden font-bold flex items-center space-x-1 cursor-pointer bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 hover:bg-amber-500/20 transition"
                          title="Auto-fill current time to this field and all table rows"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Auto-fill Now</span>
                        </button>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="time"
                          required
                          value={dispatchTime}
                          onChange={(e) => handleTopDispatchTimeChange(e.target.value)}
                          className="flex-1 px-3 py-2 bg-stone-900 print:bg-white border border-stone-700 print:border-black rounded-lg text-xs text-stone-100 print:text-black font-mono font-bold focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={handleSyncAllRowsToTopTime}
                          className="px-2.5 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 rounded-lg text-[10px] font-semibold transition cursor-pointer print:hidden shrink-0 flex items-center space-x-1"
                          title="Sync this dispatch time to all line items below"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Sync Rows</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 print:hidden">
                    <span className="text-[10px] text-stone-400">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleTopDispatchTimeChange(getCurrentTime())}
                      className="text-[10px] px-2 py-0.5 bg-stone-800 hover:bg-stone-750 border border-stone-700 rounded text-stone-300 cursor-pointer"
                    >
                      Now ({getCurrentTime()})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTopDispatchTimeChange(getTimeWithOffset(15))}
                      className="text-[10px] px-2 py-0.5 bg-stone-800 hover:bg-stone-750 border border-stone-700 rounded text-stone-300 cursor-pointer"
                    >
                      +15m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTopDispatchTimeChange('06:30')}
                      className="text-[10px] px-2 py-0.5 bg-stone-800 hover:bg-stone-750 border border-stone-700 rounded text-stone-300 cursor-pointer"
                    >
                      06:30
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTopDispatchTimeChange('14:00')}
                      className="text-[10px] px-2 py-0.5 bg-stone-800 hover:bg-stone-750 border border-stone-700 rounded text-stone-300 cursor-pointer"
                    >
                      14:00
                    </button>
                    <label className="text-[10px] text-stone-400 flex items-center space-x-1 ml-auto cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncTimeToRows}
                        onChange={(e) => setSyncTimeToRows(e.target.checked)}
                        className="rounded border-stone-700 bg-stone-900 text-amber-500 w-3 h-3"
                      />
                      <span>Auto-apply to rows</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white print:text-black mb-1">
                      Assigned Driver (Centralized Users)
                    </label>
                    <select
                      value={selectedDriverName}
                      onChange={(e) => handleDriverChange(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-900 print:bg-white border border-stone-700 print:border-black rounded-lg text-xs text-stone-100 print:text-black font-semibold focus:outline-none focus:border-amber-500"
                    >
                      {allDriversList.map((drv) => (
                        <option key={drv.id} value={drv.name}>
                          {drv.name} ({drv.designation || 'Driver'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-stone-700 print:border-black rounded-xl overflow-hidden mb-5 shadow-sm">
              <div className="bg-stone-800 print:bg-gray-200 px-4 py-2.5 border-b border-stone-700 print:border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-amber-400 print:text-black">
                    Pastry Kitchen Items & Cold-Chain Dispatch Verification
                  </span>
                  <span className="text-[10px] bg-stone-900 text-stone-300 px-2 py-0.5 rounded font-mono">
                    {lineItems.length} Products
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 print:hidden">
                  <button
                    type="button"
                    onClick={handleSyncAllRowsToTopTime}
                    className="px-2.5 py-1 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-[11px] font-semibold transition flex items-center space-x-1 cursor-pointer"
                    title="Set all row dispatch times to the header dispatch time"
                  >
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Auto-fill All Times</span>
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-stone-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-850 print:bg-gray-100 text-stone-300 print:text-black font-bold uppercase tracking-wider border-b border-stone-700 print:border-black select-none text-[11px]">
                    <tr>
                      <th className="py-2 px-3 w-[33%]">Product Name</th>
                      <th className="py-2 px-2.5 w-[14%]">
                        <div className="flex items-center justify-between">
                          <span>Dispatch Time</span>
                          <span className="text-[9px] font-normal text-amber-400 lowercase print:hidden">
                            (auto/manual)
                          </span>
                        </div>
                      </th>
                      <th className="py-2 px-2.5 w-[12%]">Batch No</th>
                      <th className="py-2 px-2 w-[11%] text-center">Qty</th>
                      <th className="py-2 px-2 w-[10%] text-center">Prod. Date</th>
                      <th className="py-2 px-2 w-[10%] text-center">Exp. Date</th>
                      <th className="py-2 px-2 w-[8%] text-center">Temp C</th>
                      <th className="py-2 px-1.5 w-7 text-right print:hidden"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 print:divide-black">
                    {lineItems.map((item) => {
                      const itemNorm = item.productName ? item.productName.trim().toLowerCase() : '';
                      const availableBatches = item.productName ? getAvailableFIFOBatches(item.productName, batches) : [];
                      const rowsForThisProduct = item.productName
                        ? lineItems.filter(r => r.productName && r.productName.trim().toLowerCase() === itemNorm)
                        : [];
                      const batchIndex = rowsForThisProduct.findIndex(r => r.id === item.id);
                      const isPrimaryRow = batchIndex <= 0;
                      const isExtraBatch = batchIndex > 0;
                      const otherRowBatchNos = rowsForThisProduct
                        .filter(r => r.id !== item.id && r.batchNo)
                        .map(r => r.batchNo);
                      const allAssignedBatchNos = rowsForThisProduct
                        .filter(r => r.batchNo)
                        .map(r => r.batchNo);
                      const nextUnassignedBatch = availableBatches.find(b => !allAssignedBatchNos.includes(b.batchNo)) || 
                        (rowsForThisProduct.length < availableBatches.length ? availableBatches[rowsForThisProduct.length] : undefined);
                      
                      const canAddMoreBatches = isPrimaryRow && availableBatches.length > 1 && rowsForThisProduct.length < availableBatches.length && !!nextUnassignedBatch;
                      const isTempWarm = item.dispatchTemp > 5.0;
                      const isOutOfStock = item.availableStock !== undefined && item.availableStock <= 0;
                      const isQtyExceeded = item.availableStock !== undefined && item.quantity > item.availableStock;

                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-stone-800/40 print:hover:bg-transparent transition ${
                            item.quantity === 0 ? 'print:hidden' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-white print:text-black">
                            {item.productName ? (
                              <div className="py-0.5">
                                <div className="font-bold text-white print:text-black text-xs tracking-wide">
                                  {item.productName}
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 print:hidden">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                    isOutOfStock
                                      ? 'bg-red-950 text-red-400 border border-red-800'
                                      : 'bg-stone-800 text-stone-300 border border-stone-700'
                                  }`}>
                                    In Stock: {item.availableStock ?? 0}
                                  </span>
                                  {rowsForThisProduct.length > 1 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-800/80">
                                      Batch #{batchIndex + 1}
                                    </span>
                                  )}
                                  {isQtyExceeded && (
                                    <span className="text-[10px] text-red-400 font-bold animate-pulse">
                                      Exceeds stock!
                                    </span>
                                  )}
                                  {canAddMoreBatches && nextUnassignedBatch && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddNextBatchForProduct(item.id)}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-300 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/80 shadow-sm transition cursor-pointer"
                                      title={`Add next FIFO batch (${nextUnassignedBatch.batchNo} - ${nextUnassignedBatch.quantity} in stock) grouped with this product`}
                                    >
                                      <span>+ Add Next Batch</span>
                                      <span className="font-mono text-[9px] text-amber-400 bg-black/40 px-1 py-0.2 rounded">
                                        {nextUnassignedBatch.batchNo} ({nextUnassignedBatch.quantity})
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center justify-between mb-1 print:hidden">
                                  <span className="text-[10px] font-semibold text-amber-400 flex items-center space-x-1">
                                    <Plus className="w-3 h-3" />
                                    <span>New Product Row</span>
                                  </span>
                                </div>
                                <div className="relative flex items-center">
                                  <input
                                    type="text"
                                    list={`product-options-${item.id}`}
                                    placeholder="Select or type product name..."
                                    value={item.productName}
                                    onChange={(e) => handleProductNameChange(item.id, e.target.value)}
                                    className="w-full bg-stone-900/90 print:bg-transparent border border-amber-500/60 print:border-none focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-white print:text-black font-semibold text-xs focus:ring-0 focus:outline-none transition pr-7 shadow-inner"
                                  />
                                  <datalist id={`product-options-${item.id}`}>
                                    {allAvailableProducts.map(p => (
                                      <option key={p} value={p} />
                                    ))}
                                  </datalist>
                                  <Search className="w-3.5 h-3.5 text-amber-400 absolute right-2 pointer-events-none print:hidden" />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2.5">
                            <div className="flex items-center space-x-1">
                              <input
                                type="time"
                                value={item.dispatchTime || dispatchTime}
                                onChange={(e) => handleRowTimeChange(item.id, e.target.value)}
                                className="w-full px-1.5 py-1 bg-stone-800 print:bg-white border border-stone-700 print:border-black rounded text-xs text-stone-100 print:text-black font-mono focus:border-amber-500 focus:outline-none"
                                title="Manual time entry or auto-filled"
                              />
                              <button
                                type="button"
                                onClick={() => handleSetRowTimeToNow(item.id)}
                                className="px-1.5 py-1 bg-stone-700 hover:bg-stone-650 text-amber-400 hover:text-amber-300 rounded text-[10px] font-bold print:hidden transition cursor-pointer shrink-0"
                                title="Set this row to current time"
                              >
                                Now
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2.5">
                            {!item.productName ? (
                              <div className="px-2 py-1 bg-stone-900/60 border border-stone-800 rounded text-stone-500 font-mono text-xs italic">
                                Select product first
                              </div>
                            ) : availableBatches.length === 0 ? (
                              <div className="px-2 py-1 bg-red-950/40 border border-red-900/50 rounded text-red-400 font-mono text-xs font-semibold">
                                Out of Stock (0)
                              </div>
                            ) : (
                              <div>
                                <select
                                  value={item.batchNo || (availableBatches[0] ? availableBatches[0].batchNo : '')}
                                  onChange={(e) => handleBatchSelect(item.id, e.target.value)}
                                  className="w-full px-2 py-1 bg-stone-800 print:bg-white border border-stone-700 print:border-black rounded text-xs text-amber-400 print:text-black font-mono font-bold focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm truncate"
                                >
                                  {availableBatches.map((b) => {
                                    const isUsedInOther = otherRowBatchNos.includes(b.batchNo);
                                    return (
                                      <option 
                                        key={b.id} 
                                        value={b.batchNo} 
                                        disabled={isUsedInOther}
                                        className={isUsedInOther ? 'text-stone-500 bg-stone-900' : 'text-stone-100 bg-stone-800 font-bold'}
                                      >
                                        {b.batchNo} (Stock: {b.quantity}) {isUsedInOther ? ' - [In use]' : ''}
                                      </option>
                                    );
                                  })}
                                  {editingLogId && item.batchNo && !availableBatches.some(b => b.batchNo === item.batchNo) && (
                                    <option value={item.batchNo}>
                                      {item.batchNo} (Historical)
                                    </option>
                                  )}
                                </select>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                disabled={item.quantity <= 0}
                                onClick={() => handleRowQuantityChange(item.id, item.quantity - 1)}
                                className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs print:hidden cursor-pointer border border-stone-700 transition select-none"
                              >
                                -
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={item.quantity}
                                onKeyDown={(e) => {
                                  if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E' || e.key === '.') {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => {
                                  const digitsOnly = e.target.value.replace(/\D/g, '');
                                  const num = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
                                  handleRowQuantityChange(item.id, num);
                                }}
                                className={`w-11 px-1 py-0.5 bg-stone-850 print:bg-white border rounded text-center text-xs text-white print:text-black font-bold font-mono focus:outline-none transition ${
                                  item.availableStock !== undefined && item.quantity >= item.availableStock && item.availableStock > 0
                                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                                    : 'border-stone-750 focus:border-amber-500'
                                }`}
                              />
                              <button
                                type="button"
                                disabled={item.availableStock !== undefined && item.quantity >= item.availableStock}
                                onClick={() => handleRowQuantityChange(item.id, item.quantity + 1)}
                                className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xs print:hidden cursor-pointer border border-stone-700 transition select-none"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="inline-flex items-center justify-center px-1.5 py-1 bg-stone-900/90 print:bg-transparent border border-stone-800 print:border-black rounded text-[11px] text-stone-300 print:text-black font-mono select-none w-full shadow-inner">
                              <span>{item.prodDate || '-'}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="inline-flex items-center justify-center px-1.5 py-1 bg-stone-900/90 print:bg-transparent border border-stone-800 print:border-black rounded text-[11px] text-amber-400/90 print:text-black font-mono font-semibold select-none w-full shadow-inner">
                              <span>{item.useByDate || '-'}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className={`inline-flex items-center justify-center px-1.5 py-1 bg-stone-900/90 print:bg-transparent border rounded text-[11px] font-mono font-bold select-none w-full shadow-inner ${
                              isTempWarm
                                ? 'border-red-900/70 text-red-400 print:text-black'
                                : 'border-stone-800 text-cyan-300 print:text-black'
                            }`}>
                              <span>{Number(item.dispatchTemp !== undefined ? item.dispatchTemp : 3.5).toFixed(1)} C</span>
                            </div>
                          </td>
                          <td className="py-2 px-1.5 text-right print:hidden w-7">
                            {(item.isCustom || isExtraBatch || !item.productName) ? (
                              <button
                                type="button"
                                onClick={() => removeRow(item.id)}
                                className="text-stone-500 hover:text-red-400 p-1 cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="inline-flex p-1 text-stone-600 cursor-not-allowed select-none">
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transit Notes */}
            <div className="border border-stone-700 print:border-black rounded-xl p-4 bg-stone-850/60 print:bg-white">
              <label className="block text-xs font-bold text-white print:text-black mb-1.5">
                Transit & Quality Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Insulated transit containers sealed with ice packs. Maximum 2-hour transit maintained."
                className="w-full p-2.5 bg-stone-900 print:bg-white border border-stone-700 print:border-black rounded-lg text-xs text-stone-200 print:text-black placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Form Action Bar */}
          <div className="bg-stone-900 border border-stone-800 p-4 sm:p-5 rounded-2xl print:hidden shadow-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-800 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-stone-400">Dispatch Summary:</span>
                <span className="bg-stone-800 px-2.5 py-1 rounded-lg text-white font-mono font-bold">
                  {activeItemsCount} Products with Qty
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-mono font-bold">
                  {totalUnits} Total Units
                </span>
              </div>
              <div className="text-stone-400 font-mono text-[11px]">
                Driver: <strong className="text-stone-200">{selectedDriverName}</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-stone-400">
                Submitting this dispatch log will <strong>automatically reduce stock</strong> from the respective batches in real-time.
              </div>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleResetEntireForm}
                  className="px-3.5 py-2.5 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-amber-400 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLineItems(prev => prev.map(r => ({ ...r, quantity: 0 })))}
                  className="px-4 py-2.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Clear Quantities
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-extrabold rounded-xl text-xs shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting & Adjusting Inventory...' : 'Submit Dispatch & Deduct Stock'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
