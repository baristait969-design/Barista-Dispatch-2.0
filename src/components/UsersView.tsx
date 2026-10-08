import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  ShieldCheck, 
  Edit, 
  Trash2, 
  Check, 
  Sliders, 
  CheckCircle2, 
  Lock, 
  AlertCircle,
  KeyRound, 
  ShieldAlert, 
  Sparkles,
  Search,
  UserCheck,
  UserX,
  Filter,
  X
} from 'lucide-react';
import { UserProfile, UserRole, ModulePermissions } from '../types';
import { 
  createNewUser, 
  updateUserRoleAndPermissions, 
  deleteUserRecord,
  toggleUserStatus
} from '../services/dataService';
import { INITIAL_USERS } from '../data/seedData';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { UserPasswordResetModal } from './UserPasswordResetModal';
import { useModal } from '../context/ModalDialogContext';

interface UsersViewProps {
  usersList: UserProfile[];
}

export const UsersView: React.FC<UsersViewProps> = ({ usersList }) => {
  const { role, userProfile } = useAuth();
  const { showAlert } = useModal();
  const isAdmin = role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Automatically dismiss success banners after 4 seconds
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => {
        setActionSuccess(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  const generateSystemUserId = (targetRole: UserRole = 'editor', list: UserProfile[] = usersList) => {
    const rolePrefix = targetRole === 'admin' ? 'ADM' : targetRole === 'editor' ? 'EDT' : targetRole === 'driver' ? 'DRV' : 'VIW';
    const numbers = list
      .map(u => {
        const match = u.userIdCode?.match(/\d+/g);
        return match ? parseInt(match[match.length - 1], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);
    const highest = numbers.length > 0 ? Math.max(...numbers) : 3;
    const nextNum = Math.max(highest + 1, list.length + 1);
    return `USR-${rolePrefix}-${String(nextNum).padStart(2, '0')}`;
  };

  const generateRandomTempPass = () => {
    const digits = Math.floor(1000 + Math.random() * 9000);
    return `Barista#${digits}`;
  };

  const getDefaultPermissionsForRole = (r: UserRole): ModulePermissions => {
    switch (r) {
      case 'admin':
        return {
          dashboard: { view: true, edit: true },
          inventory: { view: true, edit: true },
          forms: { view: true, edit: true },
          outlets: { view: true, edit: true },
          products: { view: true, edit: true },
          reports: { view: true, edit: true },
          users: { view: true, edit: true }
        };
      case 'editor':
        return {
          dashboard: { view: true, edit: false },
          inventory: { view: true, edit: true },
          forms: { view: true, edit: true },
          outlets: { view: false, edit: false },
          products: { view: false, edit: false },
          reports: { view: true, edit: false },
          users: { view: false, edit: false }
        };
      case 'driver':
        return {
          dashboard: { view: true, edit: false },
          inventory: { view: false, edit: false },
          forms: { view: false, edit: false },
          outlets: { view: false, edit: false },
          products: { view: false, edit: false },
          reports: { view: true, edit: false },
          users: { view: false, edit: false }
        };
      case 'viewer':
      default:
        return {
          dashboard: { view: false, edit: false },
          inventory: { view: false, edit: false },
          forms: { view: false, edit: false },
          outlets: { view: false, edit: false },
          products: { view: false, edit: false },
          reports: { view: true, edit: false },
          users: { view: false, edit: false }
        };
    }
  };

  const [formData, setFormData] = useState(() => ({
    userIdCode: `USR-EDT-${String(Math.max(4, usersList.length + 1)).padStart(2, '0')}`,
    username: '',
    displayName: '',
    email: '',
    password: generateRandomTempPass(),
    role: 'editor' as UserRole,
    designation: 'Pastry Kitchen Supervisor',
    department: 'Central Kitchen & Logistics',
    permissions: getDefaultPermissionsForRole('editor')
  }));

  const [editUserStatus, setEditUserStatus] = useState<'active' | 'suspended'>('active');

  const isUsernameTaken = useMemo(() => {
    const clean = formData.username.trim().toLowerCase().replace(/\s+/g, '_');
    if (!clean) return false;
    return (
      usersList.some((u) => (u.username || '').toLowerCase() === clean || (u.userIdCode || '').toLowerCase() === clean) ||
      INITIAL_USERS.some((u) => (u.username || '').toLowerCase() === clean || (u.userIdCode || '').toLowerCase() === clean)
    );
  }, [formData.username, usersList]);

  const handleRoleChangeInForm = (newRole: UserRole) => {
    const perms = getDefaultPermissionsForRole(newRole);
    setFormData(prev => ({
      ...prev,
      role: newRole,
      userIdCode: generateSystemUserId(newRole, usersList),
      permissions: perms,
      designation: newRole === 'admin' ? 'QA Executive / Admin' : newRole === 'editor' ? 'Pastry Kitchen Supervisor' : newRole === 'driver' ? 'Refrigerated Logistics Driver' : 'Store Auditor',
      department: newRole === 'driver' ? 'Central Kitchen Logistics & Distribution' : prev.department
    }));
  };

  const handleOpenCreateModal = () => {
    const nextCode = generateSystemUserId(formData.role, usersList);
    setFormData(prev => ({
      ...prev,
      userIdCode: nextCode,
      username: '',
      displayName: '',
      email: '',
      password: generateRandomTempPass(),
      permissions: getDefaultPermissionsForRole(prev.role)
    }));
    setShowAddModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showAlert('Security violation: Only Administrators can create staff users.', {
        title: 'Access Restricted',
        type: 'security'
      });
      return;
    }

    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanUsername) {
      showAlert('Please enter a valid staff username (no spaces).', {
        title: 'Validation Error',
        type: 'warning'
      });
      return;
    }

    if (isUsernameTaken) {
      showAlert(`The username "${cleanUsername}" is already in use by another staff member. Please choose a different username.`, {
        title: 'Username Conflict',
        type: 'warning'
      });
      return;
    }

    const userPassword = formData.password.trim();
    if (!userPassword) {
      showAlert('Please provide a password for the user.', {
        title: 'Password Required',
        type: 'warning'
      });
      return;
    }

    setSubmitting(true);
    setActionSuccess(null);
    try {
      const assignedUserIdCode = formData.userIdCode || generateSystemUserId(formData.role, usersList);
      await createNewUser({
        uid: `usr-${Date.now()}`,
        username: cleanUsername,
        userIdCode: assignedUserIdCode,
        displayName: formData.displayName.trim(),
        email: formData.email.trim().toLowerCase() || `${cleanUsername}@barista.lk`,
        password: userPassword,
        mustResetPassword: true,
        isFirstLogin: true,
        tempPasswordSetAt: new Date().toISOString(),
        status: 'active',
        role: formData.role,
        designation: formData.designation,
        department: formData.department,
        permissions: formData.permissions,
        createdAt: new Date().toISOString()
      });
      
      const createdMsg = `Staff account created! Username: ${cleanUsername} | Assigned Password: "${userPassword}" (User will set personal password on first login).`;
      setActionSuccess(createdMsg);
      setShowAddModal(false);
      showAlert(`Staff account "${cleanUsername}" created successfully! Initial Password: "${userPassword}". The user will be prompted to create their own personal password on their first login.`, {
        title: 'Staff User Created',
        type: 'success'
      });

      const nextRole = 'editor';
      setFormData({
        userIdCode: generateSystemUserId(nextRole, [...usersList, { id: 'temp', userIdCode: assignedUserIdCode } as any]),
        username: '',
        displayName: '',
        email: '',
        password: generateRandomTempPass(),
        role: nextRole,
        designation: 'Pastry Kitchen Supervisor',
        department: 'Central Kitchen & Logistics',
        permissions: getDefaultPermissionsForRole(nextRole)
      });
    } catch (err: any) {
      showAlert('Error creating user: ' + err.message, {
        title: 'Operation Failed',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !isAdmin) {
      showAlert('Security violation: Only Administrators can update user roles and permissions.', {
        title: 'Access Restricted',
        type: 'security'
      });
      return;
    }
    setSubmitting(true);
    try {
      await updateUserRoleAndPermissions(
        editingUser.id,
        editingUser.role,
        editingUser.permissions,
        editingUser.userIdCode,
        undefined,
        {
          displayName: editingUser.displayName,
          designation: editingUser.designation,
          department: editingUser.department,
          status: editUserStatus
        }
      );
      setActionSuccess(`Permissions and account details updated successfully for ${editingUser.displayName}!`);
      setEditingUser(null);
      showAlert(`Permissions and account details updated successfully for ${editingUser.displayName}!`, {
        title: 'User Profile Updated',
        type: 'success'
      });
    } catch (err: any) {
      showAlert('Error updating user: ' + err.message, {
        title: 'Update Failed',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserActiveStatus = async (user: UserProfile) => {
    if (!isAdmin) {
      showAlert('Security violation: Only Administrators can change staff account status.', {
        title: 'Access Restricted',
        type: 'security'
      });
      return;
    }
    if (userProfile?.id === user.id) {
      showAlert('Safety Lock: You cannot suspend your own active Administrator session.', {
        title: 'Safety Lock Active',
        type: 'warning'
      });
      return;
    }
    const currentStatus = user.status || 'active';
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await toggleUserStatus(user.id, nextStatus, user);
      setActionSuccess(`Account for "${user.displayName}" is now ${nextStatus.toUpperCase()}. ${nextStatus === 'suspended' ? 'Access has been revoked immediately.' : 'User can now sign in.'}`);
      showAlert(`Account for "${user.displayName}" is now ${nextStatus.toUpperCase()}. ${nextStatus === 'suspended' ? 'Access has been revoked immediately.' : 'User can now sign in.'}`, {
        title: `Account ${nextStatus === 'suspended' ? 'Suspended' : 'Reactivated'}`,
        type: nextStatus === 'suspended' ? 'warning' : 'success'
      });
    } catch (err: any) {
      showAlert('Error updating status: ' + err.message, {
        title: 'Operation Failed',
        type: 'error'
      });
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    if (userProfile?.id === userToDelete.id) {
      showAlert('Safety Lock: You cannot delete your own active Administrator account.', {
        title: 'Safety Lock Active',
        type: 'warning'
      });
      setUserToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await deleteUserRecord(userToDelete.id);
      setActionSuccess(`User account "${userToDelete.displayName}" has been permanently removed.`);
      showAlert(`User account "${userToDelete.displayName}" has been permanently removed.`, {
        title: 'User Deleted',
        type: 'success'
      });
      setUserToDelete(null);
    } catch (err: any) {
      showAlert('Error removing user: ' + err.message, {
        title: 'Delete Failed',
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePermission = (module: keyof ModulePermissions, type: 'view' | 'edit') => {
    if (!isAdmin) return;
    if (module === 'outlets' && type === 'edit') {
      showAlert('Security Policy: Only Administrators can create, edit, suspend, or delete retail outlets.', {
        title: 'Access Restricted',
        type: 'security'
      });
      return;
    }
    if (editingUser) {
      setEditingUser(prev => {
        if (!prev) return null;
        const currentPerms = (prev.permissions || {}) as any;
        const modulePerms = currentPerms[module] || { view: false, edit: false };
        const updatedVal = !modulePerms[type];
        
        const newView = type === 'view' ? updatedVal : (updatedVal ? true : modulePerms.view);
        const newEdit = type === 'edit' ? updatedVal : (updatedVal ? modulePerms.edit : false);
        return {
          ...prev,
          permissions: {
            ...currentPerms,
            [module]: {
              view: newView,
              edit: newEdit
            }
          }
        };
      });
    } else {
      setFormData(prev => {
        const currentPerms = prev.permissions as any;
        const modulePerms = currentPerms[module] || { view: false, edit: false };
        const updatedVal = !modulePerms[type];
        const newView = type === 'view' ? updatedVal : (updatedVal ? true : modulePerms.view);
        const newEdit = type === 'edit' ? updatedVal : (updatedVal ? modulePerms.edit : false);
        return {
          ...prev,
          permissions: {
            ...currentPerms,
            [module]: {
              view: newView,
              edit: newEdit
            }
          }
        };
      });
    }
  };

  const modulesList: { key: keyof ModulePermissions; label: string; desc: string }[] = [
    { key: 'dashboard', label: 'Dashboard Module', desc: 'KPI summaries, quick navigation, daily metrics' },
    { key: 'inventory', label: 'Inventory (Batches, Stock, Dates)', desc: 'Batches, stock levels, production & use-by dates' },
    { key: 'forms', label: 'Dispatch Forms (BCL/REC/HACCP/32)', desc: 'Dispatch creation, cold-chain checks, driver assignment' },
    { key: 'outlets', label: 'Outlets Directory', desc: 'Branch locations & destination management' },
    { key: 'products', label: 'Products Master Catalog', desc: 'Master product records, shelf lives, standard temperatures' },
    { key: 'reports', label: 'QA Compliance Reports', desc: 'Dispatched logs, temperature analytics, printable sheets' },
    { key: 'users', label: 'Users Settings & Creation', desc: 'Staff account provisioning, passwords, and access control' },
  ];

  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchSearch = 
        !searchTerm.trim() ||
        (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.userIdCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.designation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.department || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const status = u.status || 'active';
      const matchStatus = statusFilter === 'all' || status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [usersList, searchTerm, roleFilter, statusFilter]);

  const activeCount = usersList.filter(u => (u.status || 'active') === 'active').length;
  const suspendedCount = usersList.filter(u => u.status === 'suspended').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Staff Users & Access Control</h2>
            <span className="text-xs bg-stone-800 px-2.5 py-0.5 rounded-full text-amber-400 font-mono font-bold">
              {usersList.length} Accounts
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Enterprise administration: Provision staff accounts, set passwords, suspend/reactivate access, and configure granular module visibility.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isAdmin ? (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs transition flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New Staff User</span>
            </button>
          ) : (
            <div className="text-xs text-stone-400 flex items-center space-x-1.5 bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Only Administrator can manage permissions</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics & Filter Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by staff name, username, ID, designation..."
              className="w-full pl-9 pr-3 py-2 bg-stone-850 border border-stone-750 rounded-xl text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-white text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              style={{ colorScheme: 'dark' }}
              className="bg-stone-850 border border-stone-750 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option className="bg-stone-900 text-stone-100" value="all">All Roles ({usersList.length})</option>
              <option className="bg-stone-900 text-stone-100" value="admin">Admins</option>
              <option className="bg-stone-900 text-stone-100" value="editor">Editors</option>
              <option className="bg-stone-900 text-stone-100" value="driver">Drivers</option>
              <option className="bg-stone-900 text-stone-100" value="viewer">Viewers</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{ colorScheme: 'dark' }}
              className="bg-stone-850 border border-stone-750 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option className="bg-stone-900 text-stone-100" value="all">All Statuses</option>
              <option className="bg-stone-900 text-stone-100" value="active">Active Only ({activeCount})</option>
              <option className="bg-stone-900 text-stone-100" value="suspended">Suspended Only ({suspendedCount})</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-stone-400 pt-1 border-t border-stone-800/80">
          <span>Showing <strong>{filteredUsers.length}</strong> of <strong>{usersList.length}</strong> staff accounts</span>
          <span className="text-stone-600">|</span>
          <span className="text-emerald-400 font-medium flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>{activeCount} Active</span>
          </span>
          <span className="text-stone-600">|</span>
          <span className="text-rose-400 font-medium flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <span>{suspendedCount} Suspended</span>
          </span>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-200 text-xs flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-400 hover:text-white text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Users List Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-850 bg-stone-800/60 text-stone-400 uppercase tracking-wider font-semibold border-b border-stone-800">
              <tr>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Staff Username</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Password</th>
                <th className="py-3 px-4">Module Permissions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500 text-xs">
                    No staff accounts match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userRole = user.role || 'viewer';
                  const perms = user.permissions || {};
                  const isCurrentUser = userProfile?.id === user.id || userProfile?.username === user.username;
                  const isSuspended = user.status === 'suspended';

                  return (
                    <tr key={user.id} className={`hover:bg-stone-800/40 transition ${isSuspended ? 'bg-rose-950/15' : ''}`}>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                        {user.userIdCode || `USR-${user.id.slice(0, 5)}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center space-x-1.5">
                          <span>{user.displayName}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-normal border border-amber-500/30">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {user.designation || 'Staff'} {user.department ? `- ${user.department}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-amber-300 font-mono font-bold text-xs bg-stone-850 px-2 py-0.5 rounded border border-stone-750">
                          {user.username || user.userIdCode?.toLowerCase() || 'user'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          userRole === 'admin'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                            : userRole === 'editor'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                            : userRole === 'driver'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        }`}>
                          {userRole}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          {isSuspended ? (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <UserX className="w-3 h-3 text-rose-400 shrink-0" />
                              <span>Suspended</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <UserCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Active</span>
                            </span>
                          )}
                          {isAdmin && !isCurrentUser && (
                            <button
                              onClick={() => handleToggleUserActiveStatus(user)}
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold transition cursor-pointer border ${
                                isSuspended
                                  ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60'
                                  : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-700/60'
                              }`}
                            >
                              {isSuspended ? 'Reactivate' : 'Suspend'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                            <Check className="w-3 h-3 shrink-0 text-emerald-400" />
                            <span>Active</span>
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => setPasswordModalUser(user)}
                              className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                              title="Administrator reset user password"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {(['dashboard', 'inventory', 'forms', 'outlets', 'products', 'reports', 'users'] as const).map((mod) => {
                            const modPerm = (perms as any)[mod];
                            const canView = modPerm !== undefined ? !!modPerm.view : (userRole === 'admin' || (userRole === 'editor' && ['dashboard', 'inventory', 'forms', 'outlets', 'products', 'reports'].includes(mod)) || (userRole === 'driver' && mod === 'reports') || (userRole === 'viewer' && mod === 'reports'));
                            const canEdit = modPerm !== undefined ? !!modPerm.edit : (userRole === 'admin' || (userRole === 'editor' && ['inventory', 'forms'].includes(mod)));
                            if (!canView) return null;
                            return (
                              <span
                                key={mod}
                                className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                  canEdit
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-stone-800 text-stone-300 border border-stone-700'
                                }`}
                                title={`${mod.toUpperCase()}: ${canEdit ? 'View & Edit' : 'View Only'}`}
                              >
                                {mod} {canEdit ? '(E)' : '(V)'}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {isAdmin ? (
                            <>
                              <button
                                onClick={() => handleToggleUserActiveStatus(user)}
                                disabled={isCurrentUser}
                                className={`p-1.5 rounded transition cursor-pointer ${
                                  isCurrentUser
                                    ? 'opacity-30 cursor-not-allowed text-stone-600'
                                    : isSuspended
                                    ? 'text-emerald-400 hover:bg-emerald-950/60'
                                    : 'text-rose-400 hover:bg-rose-950/60'
                                }`}
                                title={isCurrentUser ? "Cannot suspend own account" : isSuspended ? "Reactivate user account" : "Suspend user account"}
                              >
                                {isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setPasswordModalUser(user)}
                                className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition cursor-pointer"
                                title="Reset Password"
                              >
                                <KeyRound className="w-4 h-4 text-amber-400" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditUserStatus(user.status || 'active');
                                }}
                                className="p-1.5 text-stone-400 hover:text-blue-400 hover:bg-stone-800 rounded transition cursor-pointer"
                                title="Edit User Details & Module Permissions"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setUserToDelete(user)}
                                disabled={isCurrentUser}
                                className={`p-1.5 rounded transition ${
                                  isCurrentUser
                                    ? 'opacity-30 cursor-not-allowed text-stone-600'
                                    : 'text-stone-400 hover:text-red-400 hover:bg-stone-800 cursor-pointer'
                                }`}
                                title={isCurrentUser ? "Cannot delete own account" : "Delete User"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-stone-600 flex items-center space-x-1">
                              <Lock className="w-3 h-3" />
                              <span>Protected</span>
                            </span>
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

      {passwordModalUser && (
        <UserPasswordResetModal
          user={passwordModalUser}
          isOpen={!!passwordModalUser}
          onClose={() => setPasswordModalUser(null)}
          onSuccess={(msg) => setActionSuccess(msg)}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Provision New Staff User</h3>
                  <p className="text-[11px] text-stone-400">
                    Administrator authority: assign User ID, unique username, password, & module access
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span>User ID Code</span>
                    <span className="text-[10px] text-amber-400 font-medium flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>System Generated</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={formData.userIdCode}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-xs text-amber-400 font-mono font-bold cursor-not-allowed select-none opacity-90 shadow-inner"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">Permanent unique system identifier</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    System Role Preset
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChangeInForm(e.target.value as UserRole)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-bold cursor-pointer"
                  >
                    <option className="bg-stone-900 text-stone-100" value="admin">Admin (Full Control & User Management)</option>
                    <option className="bg-stone-900 text-stone-100" value="editor">Editor (Kitchen & Forms Creation)</option>
                    <option className="bg-stone-900 text-stone-100" value="driver">Driver (Logistics Driver - Report Only)</option>
                    <option className="bg-stone-900 text-stone-100" value="viewer">Viewer (Read-Only Audit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Full Name / Staff Designation
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      displayName: newName,
                      username: prev.username ? prev.username : newName.trim().toLowerCase().replace(/\s+/g, '_')
                    }));
                  }}
                  placeholder="e.g. Kasun Silva"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Staff Username (for Login)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => {
                      const clean = e.target.value.toLowerCase().replace(/[@\s]/g, '_');
                      setFormData({ ...formData, username: clean });
                    }}
                    placeholder="e.g. kasun_s or dineth"
                    className={`w-full px-3 py-2 bg-stone-800 border rounded-lg text-xs text-stone-100 focus:outline-none font-mono ${
                      isUsernameTaken
                        ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                        : 'border-stone-700 focus:border-amber-500'
                    }`}
                  />
                  {isUsernameTaken ? (
                    <p className="text-[10px] text-red-400 mt-1 font-semibold flex items-center space-x-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>Username is already taken!</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-stone-500 mt-1">Unique login username</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-300">
                      Staff Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, password: generateRandomTempPass() })}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-medium flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="e.g. Barista#4829"
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Initial temporary password
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Contact Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ksilva@barista.lk (optional)"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-amber-400 mb-1.5 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configured Module Visibility & Edit Levels:</span>
                </label>
                <div className="bg-stone-850 p-3 rounded-xl border border-stone-800 space-y-2">
                  {modulesList.map((m) => {
                    const currentPerm = (formData.permissions as any)[m.key] || { view: false, edit: false };
                    return (
                      <div key={m.key} className="flex items-center justify-between text-xs py-1.5 border-b border-stone-800/60 last:border-b-0">
                        <div>
                          <div className="text-stone-200 font-semibold">{m.label}</div>
                          <div className="text-[10px] text-stone-400">{m.desc}</div>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0">
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!currentPerm.view}
                              onChange={() => togglePermission(m.key, 'view')}
                              className="rounded border-stone-700 bg-stone-800 text-amber-500"
                            />
                            <span className="text-[11px] text-stone-300">View</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!currentPerm.edit}
                              disabled={!currentPerm.view || (m.key === 'outlets' && formData.role !== 'admin')}
                              onChange={() => togglePermission(m.key, 'edit')}
                              className="rounded border-stone-700 bg-stone-800 text-amber-500 disabled:opacity-30"
                            />
                            <span className={`text-[11px] ${!currentPerm.view ? 'text-stone-600' : 'text-stone-300'}`}>Edit</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || isUsernameTaken || !formData.username.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Provisioning Account...' : 'Provision User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    Manage Access: {editingUser.displayName}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Username: <span className="text-amber-300 font-mono font-bold">{editingUser.username || editingUser.userIdCode}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
                    <span>User ID Code</span>
                    <span className="text-[10px] text-amber-400 font-medium flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={editingUser.userIdCode || `USR-${editingUser.id.slice(0, 5)}`}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-xs text-amber-400 font-mono font-bold cursor-not-allowed select-none opacity-90 shadow-inner"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">Permanent system identifier</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Role Preset
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserRole;
                      const rolePerms = getDefaultPermissionsForRole(newRole);
                      setEditingUser({ ...editingUser, role: newRole, permissions: rolePerms });
                    }}
                    style={{ colorScheme: 'dark' }}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 font-bold focus:outline-none cursor-pointer"
                  >
                    <option className="bg-stone-900 text-stone-100" value="admin">Admin (Full Control)</option>
                    <option className="bg-stone-900 text-stone-100" value="editor">Editor (Kitchen & Forms)</option>
                    <option className="bg-stone-900 text-stone-100" value="driver">Driver (Logistics Driver - Report Only)</option>
                    <option className="bg-stone-900 text-stone-100" value="viewer">Viewer (Read-only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Account Status
                </label>
                <select
                  value={editUserStatus}
                  onChange={(e) => setEditUserStatus(e.target.value as any)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option className="bg-stone-900 text-stone-100" value="active">Active (Permitted to Log In)</option>
                  <option className="bg-stone-900 text-stone-100" value="suspended">Suspended (Access Blocked & Session Revoked)</option>
                </select>
                <p className="text-[10px] text-stone-500 mt-1">
                  Suspended accounts are locked and cannot sign into the system.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Staff Full Name
                  </label>
                  <input
                    type="text"
                    value={editingUser.displayName}
                    onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editingUser.designation || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-amber-400 mb-1.5 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Module Visibility & Edit Permissions:</span>
                </label>
                <div className="bg-stone-850 p-3 rounded-xl border border-stone-800 space-y-2">
                  {modulesList.map((m) => {
                    const currentPerm = (editingUser.permissions as any)?.[m.key] || { view: false, edit: false };
                    return (
                      <div key={m.key} className="flex items-center justify-between text-xs py-1.5 border-b border-stone-800/60 last:border-b-0">
                        <div>
                          <div className="text-stone-200 font-semibold">{m.label}</div>
                          <div className="text-[10px] text-stone-400">{m.desc}</div>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0">
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!currentPerm.view}
                              onChange={() => togglePermission(m.key, 'view')}
                              className="rounded border-stone-700 bg-stone-800 text-amber-500"
                            />
                            <span className="text-[11px] text-stone-300">View</span>
                          </label>
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!currentPerm.edit}
                              disabled={!currentPerm.view || (m.key === 'outlets' && editingUser.role !== 'admin')}
                              onChange={() => togglePermission(m.key, 'edit')}
                              className="rounded border-stone-700 bg-stone-800 text-amber-500 disabled:opacity-30"
                            />
                            <span className={`text-[11px] ${!currentPerm.view ? 'text-stone-600' : 'text-stone-300'}`}>Edit</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save User Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!userToDelete}
        title="Delete User Account"
        itemName={userToDelete ? `${userToDelete.displayName} (${userToDelete.username || userToDelete.userIdCode})` : ''}
        itemType="User Account"
        description="Are you sure you want to permanently delete this user account from Barista Central Kitchen? This action cannot be undone."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteUser}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
};
