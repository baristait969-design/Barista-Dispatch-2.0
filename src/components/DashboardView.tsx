import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  FileText, 
  Store, 
  Users, 
  BarChart3, 
  ThermometerSnowflake, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  UtensilsCrossed
} from 'lucide-react';
import { InventoryBatch, DispatchLog, Outlet, Product } from '../types';

interface DashboardViewProps {
  batches: InventoryBatch[];
  dispatchLogs: DispatchLog[];
  outlets: Outlet[];
  products?: Product[];
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  batches,
  dispatchLogs,
  outlets,
  products,
  onNavigate
}) => {
  const { userProfile, role, hasAccess } = useAuth();

  const totalStockUnits = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
  const lowStockCount = batches.filter(b => b.quantity <= 15).length;
  
  const today = new Date().toISOString().split('T')[0];
  const expiringSoonCount = batches.filter(b => {
    if (!b.useByDate) return false;
    const diffDays = (new Date(b.useByDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diffDays <= 3;
  }).length;

  const todayDispatches = dispatchLogs.filter(d => d.date === today || d.createdAt.startsWith(today)).length;

  const quickNav = [
    {
      id: 'inventory',
      title: 'Inventory Management',
      desc: 'Batch tracking, quantities, prod & future expiration dates, dispatch temp (<=5 C), and CSV export.',
      icon: Package,
      badge: `${batches.length} Batches`,
      color: 'from-[#ED5338] to-[#B02812]',
      visible: hasAccess('inventory', 'view')
    },
    {
      id: 'forms',
      title: 'Dispatch Forms (BCL/REC/HACCP/32)',
      desc: 'Issue dispatches with multi-outlet selection, auto-time, FIFO batches, real-time inventory deduction & driver logs.',
      icon: FileText,
      badge: 'HACCP Standard',
      color: 'from-[#3E1812] to-[#200B07]',
      visible: hasAccess('forms', 'view')
    },
    {
      id: 'outlets',
      title: 'Retail Outlets',
      desc: 'Manage Barista branch locations, outlet IDs, contacts, and delivery destinations.',
      icon: Store,
      badge: `${outlets.length} Branches`,
      color: 'from-[#2D201C] to-[#1A1210]',
      visible: hasAccess('outlets', 'view')
    },
    {
      id: 'products',
      title: 'Products Master Catalog',
      desc: 'Master product catalog with system-generated IDs (PRD-XX), categories, and cold-chain dispatch temperatures.',
      icon: UtensilsCrossed,
      badge: `${(products || []).length} Products`,
      color: 'from-[#ED5338] to-[#99220E]',
      visible: hasAccess('products', 'view')
    },
    {
      id: 'users',
      title: 'Users & Access Control',
      desc: 'Create users with ID codes, assign roles (Admin, Editor, Driver, Viewer), and manage granular module visibility.',
      icon: Users,
      badge: 'User Settings',
      color: 'from-[#3E1812] to-[#1C0A06]',
      visible: hasAccess('users', 'view')
    },
    {
      id: 'reports',
      title: 'Reports & Audit Log',
      desc: 'View submitted dispatch logs, export archives, and print official QA compliance records.',
      icon: BarChart3,
      badge: 'QA Compliance',
      color: 'from-[#D84228] to-[#781807]',
      visible: hasAccess('reports', 'view')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Personalized Welcome & Account Profile Card */}
      <div className="bg-gradient-to-r from-[#171311] via-[#1E1714] to-[#171311] border border-[#2E221E] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-[#ED5338]/5 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#ED5338] flex items-center justify-center text-white font-serif font-black text-2xl shadow-lg shrink-0">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'B'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Welcome, {userProfile?.displayName || userProfile?.email}!
                </h2>
                {role === 'admin' && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded border uppercase bg-[#ED5338]/20 text-[#FFA594] border-[#ED5338]/40">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400 mt-1">
                {userProfile?.designation || 'Central Kitchen Staff'} - {userProfile?.department || 'Quality Assurance & Kitchen Logistics'}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-stone-300">
                <span className="inline-flex items-center space-x-1 bg-[#1A1412] px-2.5 py-1 rounded-md border border-[#382B25] font-mono">
                  <span className="text-stone-400">User ID:</span>
                  <span className="text-[#FFA594] font-semibold">{userProfile?.userIdCode || 'USR-AUTH'}</span>
                </span>
                <span className="inline-flex items-center space-x-1 bg-[#1A1412] px-2.5 py-1 rounded-md border border-[#382B25]">
                  <span className="text-stone-400">Email:</span>
                  <span>{userProfile?.email}</span>
                </span>
                <span className="inline-flex items-center space-x-1 bg-[#1A1412] px-2.5 py-1 rounded-md border border-[#382B25]">
                  <ThermometerSnowflake className="w-3.5 h-3.5 text-[#ED5338]" />
                  <span>OPRP-2 Compliance: Active</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {hasAccess('forms', 'view') && (
              <button
                onClick={() => onNavigate('forms')}
                className="px-4 py-2 bg-[#ED5338] hover:bg-[#D84228] text-white font-bold rounded-lg text-sm shadow-md shadow-[#ED5338]/25 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>New Dispatch Log</span>
              </button>
            )}
            {hasAccess('inventory', 'view') && (
              <button
                onClick={() => onNavigate('inventory')}
                className="px-4 py-2 bg-[#221B18] hover:bg-[#2F2420] text-stone-200 border border-[#382B25] font-medium rounded-lg text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>Stock Overview</span>
              </button>
            )}
            {hasAccess('reports', 'view') && (
              <button
                onClick={() => onNavigate('reports')}
                className="px-4 py-2 bg-[#221B18] hover:bg-[#2F2420] text-stone-200 border border-[#382B25] font-medium rounded-lg text-sm transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-[#ED5338]" />
                <span>Audit Reports</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {hasAccess('inventory', 'view') && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span>Total Units In Kitchen</span>
              <Package className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-white">{totalStockUnits}</div>
            <div className="text-[11px] text-stone-400 mt-1 flex items-center space-x-1">
              <span>Across</span>
              <span className="text-amber-400 font-semibold">{batches.length} batches</span>
            </div>
          </div>
        )}

        {(hasAccess('forms', 'view') || hasAccess('reports', 'view')) && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span>Today's Dispatches</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{todayDispatches}</div>
            <div className="text-[11px] text-stone-400 mt-1">
              <span>Total recorded: </span>
              <span className="text-blue-400 font-semibold">{dispatchLogs.length} logs</span>
            </div>
          </div>
        )}

        {hasAccess('outlets', 'view') && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span>Active Outlets</span>
              <Store className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {outlets.filter(o => o.active).length}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">
              <span>Network branches ready</span>
            </div>
          </div>
        )}

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Cold-Chain Status</span>
            <ThermometerSnowflake className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-400 flex items-center space-x-1">
            <span>&lt;= 5.0 C</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            <span>100% HACCP Standard</span>
          </div>
        </div>
      </div>

      {/* Stock Health Alerts */}
      {hasAccess('inventory', 'view') && (lowStockCount > 0 || expiringSoonCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockCount > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-amber-200">
                    Low Stock Alert ({lowStockCount} Batches)
                  </div>
                  <div className="text-xs text-amber-300/80">
                    Some batches have dropped below the minimum 15 unit threshold.
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs bg-[#ED5338] hover:bg-[#D84228] text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
              >
                Inspect
              </button>
            </div>
          )}

          {expiringSoonCount > 0 && (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-rose-200">
                    Expiry Alert ({expiringSoonCount} Batches)
                  </div>
                  <div className="text-xs text-rose-300/80">
                    Batches reaching expiration date within 3 days. Prioritize in FIFO dispatches.
                  </div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg transition"
              >
                Check
              </button>
            </div>
          )}
        </div>
      )}

      {/* Module Shortcuts Grid */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-3">
          Central Kitchen System Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNav.filter(item => item.visible).map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="bg-[#171311] border border-[#2E221E] hover:border-[#ED5338]/60 rounded-xl p-5 shadow-sm transition-all hover:shadow-lg hover:shadow-[#ED5338]/5 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#221A17] border border-[#382B25] flex items-center justify-center text-[#ED5338] group-hover:scale-105 group-hover:bg-[#ED5338] group-hover:text-white transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#221A17] text-[#FFA594] border border-[#382B25] font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-base group-hover:text-[#FFA594] transition">
                    {item.title}
                  </h4>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#261D1A] flex items-center justify-between text-xs text-[#ED5338] font-semibold">
                  <span>Open Module</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Dispatches Section */}
      <div className="bg-[#171311] border border-[#2E221E] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#ED5338]" />
            <span>Recent Kitchen Dispatch Logs</span>
          </h3>
          {(hasAccess('reports', 'view') || hasAccess('forms', 'view')) && (
            <button
              onClick={() => onNavigate(hasAccess('reports', 'view') ? 'reports' : 'forms')}
              className="text-xs text-[#FFA594] hover:text-[#ED5338] transition font-semibold cursor-pointer"
            >
              View All ({dispatchLogs.length})
            </button>
          )}
        </div>
        {dispatchLogs.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-xs">
            No dispatch logs recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-[#261D1A]">
            {dispatchLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-xs">{log.docNo}</span>
                    <span className="text-[10px] bg-[#221A17] border border-[#382B25] px-1.5 py-0.2 rounded text-stone-300">
                      {log.date} @ {log.dispatchTime}
                    </span>
                    <span className="text-[10px] text-[#FFA594] font-semibold">
                      {log.outletNames.join(', ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Driver: <span className="text-stone-300">{log.driverName}</span> - Supervisor: <span className="text-stone-300">{log.supervisor}</span> - {log.items.length} product line(s)
                  </p>
                </div>
                {(hasAccess('reports', 'view') || hasAccess('forms', 'view')) && (
                  <button
                    onClick={() => onNavigate(hasAccess('reports', 'view') ? 'reports' : 'forms')}
                    className="text-xs bg-[#221A17] hover:bg-[#2C211D] border border-[#382B25] text-stone-300 hover:text-white px-2.5 py-1 rounded transition cursor-pointer"
                  >
                    Details
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
