import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Store, 
  Plus, 
  Edit, 
  Trash2, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  X,
  FileSpreadsheet,
  Search,
  Lock,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { Outlet } from '../types';
import { 
  addOutlet, 
  updateOutlet, 
  deleteOutlet, 
  deleteAllOutlets, 
  bulkAddOutlets,
  syncOfficialOutlets,
  getNextOutletCode
} from '../services/dataService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useModal } from '../context/ModalDialogContext';

interface OutletsViewProps {
  outlets: Outlet[];
}

export const OutletsView: React.FC<OutletsViewProps> = ({ outlets }) => {
  const { role } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const isAdmin = role === 'admin' || role === 'editor';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [outletToDelete, setOutletToDelete] = useState<Outlet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const [newName, setNewName] = useState('');
  const [newActive, setNewActive] = useState(true);

  const nextAssignedCode = useMemo(() => {
    return getNextOutletCode(outlets);
  }, [outlets]);

  const filteredOutlets = useMemo(() => {
    return outlets.filter((outlet) => {
      const matchesSearch = 
        outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        outlet.outletId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (outlet.phone && outlet.phone.includes(searchTerm));
      
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? outlet.active :
        !outlet.active;

      return matchesSearch && matchesStatus;
    });
  }, [outlets, searchTerm, statusFilter]);

  if (role === 'viewer') {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Lock className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h3 className="text-lg font-bold text-white">Access Restricted: Viewer Profile</h3>
          <p className="text-xs text-stone-400 mt-1">
            Your account is assigned the Viewer role. Under Central Kitchen security guidelines, Viewers only have access to Reports and Printing. Outlets registry is restricted to system administrators.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators have permission to add new retail outlets.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }

    const trimmed = newName.trim();
    if (!trimmed) {
      showAlert('Outlet Name is compulsory.', {
        title: 'Validation Error',
        type: 'warning'
      });
      return;
    }

    setSubmitting(true);
    try {
      await addOutlet({
        name: trimmed,
        active: newActive
      });
      setNewName('');
      setNewActive(true);
      setShowAddModal(false);
      showAlert(`Outlet "${trimmed}" successfully added to the registry.`, {
        title: 'Outlet Created',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error adding outlet: ' + err.message, {
        title: 'Operation Failed',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators have permission to edit outlet details.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }
    if (!editingOutlet) return;

    const trimmed = editingOutlet.name.trim();
    if (!trimmed) {
      showAlert('Outlet Name is compulsory.', {
        title: 'Validation Error',
        type: 'warning'
      });
      return;
    }

    setSubmitting(true);
    try {
      await updateOutlet(editingOutlet.id, {
        name: trimmed,
        active: editingOutlet.active
      });
      setEditingOutlet(null);
      showAlert(`Outlet "${trimmed}" updated successfully.`, {
        title: 'Outlet Updated',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error updating outlet: ' + err.message, {
        title: 'Update Failed',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteOutlet = async () => {
    if (!outletToDelete) return;
    setIsDeleting(true);
    try {
      await deleteOutlet(outletToDelete.id);
      setOutletToDelete(null);
      showAlert('Retail outlet successfully removed.', {
        title: 'Outlet Deleted',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error removing outlet: ' + err.message, {
        title: 'Delete Failed',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResyncAllOfficial = async () => {
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators can synchronize official outlets.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }

    const confirmed = await showConfirm(
      'Sync all outlets to the database?',
      {
        title: 'Sync Outlets',
        confirmText: 'Sync Outlets',
        type: 'info'
      }
    );
    if (!confirmed) {
      return;
    }

    setSyncing(true);
    try {
      await syncOfficialOutlets(true);
      showAlert('All outlets synced.', {
        title: 'Success',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error syncing outlets: ' + (err.message || 'Please check network connection.'), {
        title: 'Sync Failed',
        type: 'error'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClearAllOutlets = async () => {
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators can clear the outlet registry.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }

    const confirmed = await showConfirm(
      `Are you sure you want to remove ALL ${outlets.length} current outlets from the database? This action cannot be reversed.`,
      {
        title: 'Clear Outlets Registry',
        confirmText: 'Yes, Clear All Outlets',
        type: 'danger'
      }
    );
    if (confirmed) {
      try {
        await deleteAllOutlets();
        showAlert('All retail outlets have been cleared from the database.', {
          title: 'Registry Cleared',
          type: 'success'
        });
      } catch (err: any) {
        showAlert('Error removing outlets: ' + err.message, {
          title: 'Operation Failed',
          type: 'error'
        });
      }
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators have permission to import outlets.', {
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
      showAlert('Please enter at least one outlet name.', {
        title: 'Empty List',
        type: 'warning'
      });
      return;
    }

    setBulkSubmitting(true);
    try {
      const itemsToImport = lines.map(line => {
        const parts = line.split(/[,\t]/).map(p => p.trim());
        return {
          name: parts[0],
          phone: parts[1] || ''
        };
      });
      await bulkAddOutlets(itemsToImport);
      setBulkText('');
      setShowBulkModal(false);
      showAlert(`Successfully imported ${itemsToImport.length} outlets!`, {
        title: 'Import Complete',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error importing outlets: ' + err.message, {
        title: 'Import Failed',
        type: 'error'
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const toggleActiveStatus = async (outlet: Outlet) => {
    if (!isAdmin) {
      showAlert('Security Policy: Only Administrators have permission to suspend or activate retail outlets.', {
        title: 'Access Denied',
        type: 'security'
      });
      return;
    }
    try {
      await updateOutlet(outlet.id, { active: !outlet.active });
    } catch (err: any) {
      showAlert('Error updating outlet status: ' + err.message, {
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
            <h2 className="text-xl sm:text-2xl font-bold text-white">Barista Retail Outlets</h2>
            <span className="text-xs bg-amber-500/20 text-amber-400 font-mono font-bold px-2.5 py-0.5 rounded border border-amber-500/30">
              {outlets.length} Branches
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1 max-w-2xl">
            {isAdmin 
              ? 'Administrator Authority: You have full permission to add, edit, suspend, activate, and delete retail outlets.'
              : 'Read-Only Mode: Outlets are destination nodes for Central Kitchen dispatches. Only Administrators can add, edit, suspend, or delete outlets.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <>
              <button
                onClick={handleResyncAllOfficial}
                disabled={syncing}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                title="Synchronize official Barista outlets"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Outlets'}</span>
              </button>
              {outlets.length > 0 && (
                <button
                  onClick={handleClearAllOutlets}
                  className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 font-semibold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  title="Delete all outlets in the database"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear Registry</span>
                </button>
              )}
              <button
                onClick={() => setShowBulkModal(true)}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-750 text-amber-400 border border-amber-500/30 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                title="Paste list of branch names"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Quick Import</span>
              </button>
              <button
                onClick={() => {
                  setNewName('');
                  setNewActive(true);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition flex items-center space-x-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Single Outlet</span>
              </button>
            </>
          ) : (
            <div className="px-3 py-1.5 bg-stone-800/80 border border-stone-700/80 rounded-xl text-xs text-stone-400 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin-Managed Registry (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-3.5 flex items-center space-x-3 text-xs text-stone-400">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            You are viewing outlets in read-only mode. Adding new branches, updating names, changing active/suspended states, and deleting outlets require Administrator privileges.
          </span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-900 border border-stone-800 rounded-xl p-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search branch name or code (e.g. BIA, Ella, OUT-15)..."
            className="w-full pl-9 pr-4 py-1.5 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
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

        <div className="flex items-center space-x-2">
          <div className="flex rounded-lg bg-stone-800 p-0.5 border border-stone-700 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'all'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All ({outlets.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'active'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Active ({outlets.filter(o => o.active).length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'inactive'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Suspended ({outlets.filter(o => !o.active).length})
            </button>
          </div>
          <span className="text-[11px] text-stone-500 font-mono hidden md:inline">
            Showing {filteredOutlets.length} of {outlets.length}
          </span>
        </div>
      </div>

      {/* Outlets Grid */}
      {filteredOutlets.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 bg-stone-800 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Store className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">
              {outlets.length === 0 ? 'No Retail Outlets Registered' : 'No matching outlets found'}
            </h3>
            <p className="text-xs text-stone-400">
              {outlets.length === 0
                ? isAdmin 
                  ? 'Click "Sync Outlets" to restore all Barista outlets, or click "Add Single Outlet" to register a branch.'
                  : 'No outlets registered in the database. Please contact an Administrator.'
                : `No outlets matched the query "${searchTerm}". Clear search or adjust status filter.`}
            </p>
          </div>
          {outlets.length === 0 && isAdmin && (
            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={handleResyncAllOfficial}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs transition flex items-center space-x-2 shadow cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sync Outlets</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {filteredOutlets.map((outlet) => (
            <div
              key={outlet.id}
              className="bg-stone-900 border border-stone-800 hover:border-amber-600/40 rounded-xl p-4 shadow-sm flex flex-col justify-between transition group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
                      {outlet.outletId}
                    </span>
                    {isAdmin ? (
                      <button
                        onClick={() => toggleActiveStatus(outlet)}
                        className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-1.5 py-0.5 rounded transition cursor-pointer ${
                          outlet.active
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900'
                        }`}
                        title="Administrator: Click to toggle active / suspended status"
                      >
                        {outlet.active ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                        <span>{outlet.active ? 'Active' : 'Suspended'}</span>
                      </button>
                    ) : (
                      <div
                        className={`inline-flex items-center space-x-1 text-[10px] font-semibold px-1.5 py-0.5 rounded select-none ${
                          outlet.active
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {outlet.active ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                        <span>{outlet.active ? 'Active' : 'Suspended'}</span>
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setEditingOutlet(outlet)}
                        className="p-1 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition cursor-pointer"
                        title="Edit Outlet Name"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setOutletToDelete(outlet)}
                        className="p-1 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded transition cursor-pointer"
                        title="Delete Outlet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-white text-sm tracking-tight mb-2 leading-snug">
                  {outlet.name}
                </h3>
                {outlet.phone ? (
                  <div className="flex items-center space-x-1.5 text-[11px] text-stone-400">
                    <Phone className="w-3 h-3 text-stone-500 shrink-0" />
                    <span>{outlet.phone}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-600 italic">
                    Central Kitchen Route
                  </div>
                )}
              </div>
              <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                <span>Dispatch Status</span>
                <span className={outlet.active ? 'text-emerald-400' : 'text-rose-400'}>
                  {outlet.active ? 'Accepting Orders' : 'Delivery Suspended'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD SINGLE OUTLET MODAL */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Store className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Add New Barista Outlet</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOutlet} className="space-y-4">
              <div className="p-3 bg-stone-800/80 border border-stone-700 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-stone-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Outlet Code (Auto-Assigned)</span>
                  </span>
                  <span className="text-xs bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30">
                    {nextAssignedCode}
                  </span>
                </div>
                <p className="text-[10px] text-stone-500">
                  Outlet codes are automatically sequenced by the system and cannot be manually modified.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1">
                  Outlet / Branch Name <span className="text-amber-400 font-bold">* (Compulsory)</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Barista One Galle Face"
                  className="w-full px-3.5 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2.5 pt-1">
                <input
                  type="checkbox"
                  id="activeNewCheck"
                  checked={newActive}
                  onChange={(e) => setNewActive(e.target.checked)}
                  className="rounded border-stone-700 bg-stone-800 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="activeNewCheck" className="text-xs text-stone-300 font-medium cursor-pointer">
                  Outlet active and ready to receive dispatches
                </label>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-medium cursor-pointer hover:bg-stone-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newName.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT OUTLET MODAL */}
      {editingOutlet && isAdmin && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Edit Outlet Details</h3>
              </div>
              <button 
                onClick={() => setEditingOutlet(null)} 
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOutlet} className="space-y-4">
              <div className="p-3 bg-stone-800/80 border border-stone-700 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-stone-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Outlet Code (Permanent)</span>
                  </span>
                  <span className="text-xs bg-amber-500/20 text-amber-300 font-mono font-bold px-2.5 py-0.5 rounded border border-amber-500/30">
                    {editingOutlet.outletId}
                  </span>
                </div>
                <p className="text-[10px] text-stone-500">
                  Branch ID code is permanent and locked to maintain historical dispatch log traceability.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-200 mb-1">
                  Outlet / Branch Name <span className="text-amber-400 font-bold">* (Compulsory)</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editingOutlet.name}
                  onChange={(e) => setEditingOutlet({ ...editingOutlet, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2.5 pt-1">
                <input
                  type="checkbox"
                  id="editActiveCheck"
                  checked={editingOutlet.active}
                  onChange={(e) => setEditingOutlet({ ...editingOutlet, active: e.target.checked })}
                  className="rounded border-stone-700 bg-stone-800 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="editActiveCheck" className="text-xs text-stone-300 font-medium cursor-pointer">
                  Branch active and operational for dispatch (uncheck to suspend)
                </label>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingOutlet(null)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-medium cursor-pointer hover:bg-stone-750"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !editingOutlet.name.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK BULK IMPORT MODAL */}
      {showBulkModal && isAdmin && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Quick Import Outlets</h3>
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
                <label className="block text-xs font-semibold text-stone-200 mb-1">
                  Paste Outlet Names (One per line) <span className="text-amber-400">*</span>
                </label>
                <p className="text-[11px] text-stone-400 mb-2">
                  Address and phone numbers are completely ignored. Paste outlet names below:
                </p>
                <textarea
                  rows={8}
                  required
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="e.g.&#10;Barista Cinnamon Gardens&#10;Barista World Trade Center&#10;Barista Mount Lavinia"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="p-3 bg-stone-800/60 border border-stone-700 rounded-xl text-[11px] text-stone-300 space-y-1">
                <div className="flex items-center space-x-1.5 font-semibold text-amber-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Automatic Code Assignment</span>
                </div>
                <p className="text-stone-400">
                  Consecutive codes (OUT-102, OUT-103...) will be generated automatically and locked.
                </p>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting || !bulkText.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {bulkSubmitting ? 'Importing...' : 'Import Outlets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!outletToDelete}
        title="Delete Retail Outlet"
        itemName={outletToDelete ? `${outletToDelete.name} (${outletToDelete.outletId})` : ''}
        itemType="Retail Outlet"
        description="Are you sure you want to permanently remove this retail branch from the dispatch network? This action cannot be undone."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteOutlet}
        onClose={() => setOutletToDelete(null)}
      />
    </div>
  );
};
