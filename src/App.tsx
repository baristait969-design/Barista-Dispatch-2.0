import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ModalDialogProvider } from './context/ModalDialogContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { MustResetPasswordModal } from './components/MustResetPasswordModal';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { FormsView } from './components/FormsView';
import { OutletsView } from './components/OutletsView';
import { ProductsView } from './components/ProductsView';
import { UsersView } from './components/UsersView';
import { ReportsView } from './components/ReportsView';
import { SystemBackupModal } from './components/SystemBackupModal';
import { 
  InventoryBatch, 
  Outlet, 
  Product,
  Driver, 
  DispatchLog, 
  BatchLog, 
  UserProfile,
  MonthlyDispatchCycle,
  DamagedItem 
} from './types';
import { 
  INITIAL_BATCHES, 
  INITIAL_OUTLETS, 
  INITIAL_PRODUCT_CATALOG,
  INITIAL_DRIVERS, 
  INITIAL_USERS 
} from './data/seedData';
import { 
  seedInitialDataIfNeeded, 
  syncOfficialOutlets,
  syncOfficialProducts,
  subscribeBatches, 
  subscribeOutlets, 
  subscribeProducts,
  subscribeDrivers, 
  subscribeDispatchLogs, 
  subscribeBatchLogs, 
  subscribeUsers,
  subscribeMonthlyCycle,
  subscribeDamagedItems,
  checkAndApplyAutomaticMonthlyReset,
  getDefaultMonthlyCycle,
  getAutoBackupScheduleConfig,
  executeAutoScheduledBackup
} from './services/dataService';
import { Loader2, ShieldAlert } from 'lucide-react';

const MainContent: React.FC = () => {
  const { userProfile, loading, hasAccess } = useAuth();

  const accessibleTabs = useMemo(() => {
    const list = [
      { id: 'dashboard', access: hasAccess('dashboard', 'view') },
      { id: 'inventory', access: hasAccess('inventory', 'view') },
      { id: 'forms', access: hasAccess('forms', 'view') },
      { id: 'outlets', access: hasAccess('outlets', 'view') },
      { id: 'products', access: hasAccess('products', 'view') },
      { id: 'reports', access: hasAccess('reports', 'view') },
      { id: 'users', access: hasAccess('users', 'view') },
    ];
    return list.filter(t => t.access).map(t => t.id);
  }, [hasAccess]);

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [targetFormLogId, setTargetFormLogId] = useState<string | null>(null);
  const [backupModalOpen, setBackupModalOpen] = useState<boolean>(false);

  const handleNavigate = (tab: string, targetId?: string) => {
    if (targetId && tab === 'forms') {
      setTargetFormLogId(targetId);
    }
    setCurrentTab(tab);
  };

  useEffect(() => {
    if (!userProfile) return;
    if (accessibleTabs.length > 0 && !accessibleTabs.includes(currentTab)) {
      setCurrentTab(accessibleTabs[0]);
    }
  }, [accessibleTabs, currentTab, userProfile]);

  const [batches, setBatches] = useState<InventoryBatch[]>(INITIAL_BATCHES);
  const [outlets, setOutlets] = useState<Outlet[]>(INITIAL_OUTLETS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCT_CATALOG);
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);
  const [batchLogs, setBatchLogs] = useState<BatchLog[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>(INITIAL_USERS);
  const [damagedItems, setDamagedItems] = useState<DamagedItem[]>([]);
  const [dispatchCycle, setDispatchCycle] = useState<MonthlyDispatchCycle>(getDefaultMonthlyCycle());

  useEffect(() => {
    seedInitialDataIfNeeded();
    checkAndApplyAutomaticMonthlyReset().then((c) => {
      if (c) setDispatchCycle(c);
    });

    const unsubBatches = subscribeBatches((data) => {
      setBatches(data || []);
    });

    const unsubDamaged = subscribeDamagedItems((data) => {
      setDamagedItems(data || []);
    });

    const unsubOutlets = subscribeOutlets((data) => {
      if (data && data.length > 0) {
        setOutlets(data);
      } else {
        syncOfficialOutlets(false);
      }
    });

    const unsubProducts = subscribeProducts((data) => {
      if (data && data.length > 0) {
        setProducts(data);
      } else {
        syncOfficialProducts(false);
      }
    });

    const unsubDrivers = subscribeDrivers((data) => {
      if (data && data.length > 0) setDrivers(data);
    });

    const unsubDispatch = subscribeDispatchLogs((data) => {
      setDispatchLogs(data || []);
    });

    const unsubLogs = subscribeBatchLogs((data) => {
      setBatchLogs(data || []);
    });

    const unsubUsers = subscribeUsers((data) => {
      setUsersList(data || []);
    });

    const unsubCycle = subscribeMonthlyCycle((cycle) => {
      if (cycle) setDispatchCycle(cycle);
    });

    // Automated Backup Scheduler Check (runs on mount and every 15 minutes)
    const checkAutoBackups = async () => {
      try {
        const config = await getAutoBackupScheduleConfig();
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const currentHour = now.getHours();
        const targetHour = parseInt((config.dailyTime || '23:59').split(':')[0], 10);

        // Daily Schedule Check
        if (config.dailyEnabled) {
          const lastDailyDate = config.lastDailyRun ? config.lastDailyRun.slice(0, 10) : '';
          if (lastDailyDate !== todayStr && currentHour >= targetHour) {
            console.log('[Auto-Backup] Executing scheduled daily backup...');
            await executeAutoScheduledBackup('daily', null, { autoDownloadOverride: false });
          }
        }

        // Monthly Schedule Check
        if (config.monthlyEnabled) {
          const currentMonthStr = todayStr.slice(0, 7);
          const lastMonthlyMonth = config.lastMonthlyRun ? config.lastMonthlyRun.slice(0, 7) : '';
          const dayOfMonth = now.getDate();
          
          if (lastMonthlyMonth !== currentMonthStr) {
            if (config.monthlyDay === '1st' && dayOfMonth === 1) {
              console.log('[Auto-Backup] Executing scheduled monthly backup (1st of month)...');
              await executeAutoScheduledBackup('monthly', null, { autoDownloadOverride: false });
            } else if (config.monthlyDay === 'last_day') {
              const tomorrow = new Date(now.getFullYear(), now.getMonth(), dayOfMonth + 1);
              if (tomorrow.getDate() === 1) {
                console.log('[Auto-Backup] Executing scheduled monthly backup (last day of month)...');
                await executeAutoScheduledBackup('monthly', null, { autoDownloadOverride: false });
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Auto-Backup] Scheduled run check:', err);
      }
    };

    checkAutoBackups();
    const backupInterval = setInterval(checkAutoBackups, 15 * 60 * 1000);

    return () => {
      unsubBatches();
      unsubDamaged();
      unsubOutlets();
      unsubProducts();
      unsubDrivers();
      unsubDispatch();
      unsubLogs();
      unsubUsers();
      unsubCycle();
      clearInterval(backupInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-200">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
        <p className="text-sm font-semibold tracking-wider uppercase font-mono">
          Connecting to Barista Central Kitchen...
        </p>
      </div>
    );
  }

  if (!userProfile) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      <MustResetPasswordModal />
      <SystemBackupModal isOpen={backupModalOpen} onClose={() => setBackupModalOpen(false)} />
      <Navbar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        onOpenBackup={() => setBackupModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {accessibleTabs.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center max-w-lg mx-auto my-12 space-y-3">
            <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">Access Restricted</h3>
            <p className="text-xs text-stone-400">
              No module view permissions are assigned to your staff account. Please contact a Barista System Administrator to configure your access permissions.
            </p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && hasAccess('dashboard', 'view') && (
              <DashboardView
                batches={batches}
                dispatchLogs={dispatchLogs}
                outlets={outlets}
                products={products}
                dispatchCycle={dispatchCycle}
                onNavigate={handleNavigate}
                onOpenBackup={() => setBackupModalOpen(true)}
              />
            )}

            {currentTab === 'inventory' && hasAccess('inventory', 'view') && (
              <InventoryView
                batches={batches}
                batchLogs={batchLogs}
                products={products}
                damagedItems={damagedItems}
              />
            )}

            {currentTab === 'forms' && hasAccess('forms', 'view') && (
              <FormsView
                batches={batches}
                outlets={outlets}
                drivers={drivers}
                usersList={usersList}
                dispatchLogs={dispatchLogs}
                products={products}
                initialLogId={targetFormLogId}
                onClearInitialLogId={() => setTargetFormLogId(null)}
              />
            )}

            {currentTab === 'outlets' && hasAccess('outlets', 'view') && (
              <OutletsView
                outlets={outlets}
              />
            )}

            {currentTab === 'products' && hasAccess('products', 'view') && (
              <ProductsView
                products={products}
              />
            )}

            {currentTab === 'users' && hasAccess('users', 'view') && (
              <UsersView
                usersList={usersList}
              />
            )}

            {currentTab === 'reports' && hasAccess('reports', 'view') && (
              <ReportsView
                dispatchLogs={dispatchLogs}
                batches={batches}
                outlets={outlets}
                drivers={drivers}
                usersList={usersList}
                onNavigate={handleNavigate}
                onOpenBackup={() => setBackupModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      <footer className="bg-stone-900 border-t border-stone-800 py-4 px-6 text-center text-xs text-stone-500 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Barista Central Kitchen Dispatch & Inventory Tracking System | Doc No: BCL/REC/HACCP/32
          </span>
          <span className="text-amber-500/80 font-mono">
            HACCP OPRP-2 Certified | Max Transit: &lt;= 5.0 C
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ModalDialogProvider>
        <MainContent />
      </ModalDialogProvider>
    </AuthProvider>
  );
}
