import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Store, 
  Users, 
  BarChart3, 
  LogOut, 
  Menu, 
  X, 
  ThermometerSnowflake,
  UtensilsCrossed,
  Database
} from 'lucide-react';
import { UserRole } from '../types';
import { BaristaLogo } from './BaristaLogo';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenBackup?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenBackup }) => {
  const { userProfile, role, logout, hasAccess } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: hasAccess('dashboard', 'view') },
    { id: 'inventory', label: 'Inventory', icon: Package, visible: hasAccess('inventory', 'view') },
    { id: 'forms', label: 'Dispatch Forms', icon: FileText, visible: hasAccess('forms', 'view') },
    { id: 'outlets', label: 'Outlets', icon: Store, visible: hasAccess('outlets', 'view') },
    { id: 'products', label: 'Products', icon: UtensilsCrossed, visible: hasAccess('products', 'view') },
    { id: 'reports', label: 'Reports', icon: BarChart3, visible: hasAccess('reports', 'view') },
    { id: 'users', label: 'Users & Access', icon: Users, visible: hasAccess('users', 'view') },
  ];

  const getRoleBadgeColor = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'bg-[#ED5338]/20 text-[#FF7056] border-[#ED5338]/40';
      case 'editor':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'driver':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'viewer':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <header className="bg-[#14100E] text-white shadow-xl sticky top-0 z-40 border-b border-[#2D231F]">
      <div className="bg-[#201511] text-[#F3C4BA] text-xs px-3 sm:px-6 py-1.5 flex items-center justify-between border-b border-[#3A2620]">
        <div className="flex items-center space-x-2 truncate">
          <ThermometerSnowflake className="w-3.5 h-3.5 text-[#ED5338] shrink-0 animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-[11px] sm:text-xs text-white">
            HACCP Central Kitchen Compliant
          </span>
          <span className="hidden md:inline text-[#E8A599] text-[11px]">
            | Doc No: BCL/REC/HACCP/32 | Cold-Chain Transit: &lt;= 5.0 C
          </span>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0">
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Real-time Active</span>
          </span>
          <span className="text-stone-400 text-[11px] hidden sm:inline">Enterprise QA Portal:</span>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-[#ED5338] font-mono tracking-wider">
            Barista Sri Lanka
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          <div 
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer shrink-0 group" 
            onClick={() => setCurrentTab(role === 'viewer' ? 'reports' : 'dashboard')}
            title={role === 'viewer' ? "Go to Reports" : "Go to Dashboard"}
          >
            <BaristaLogo className="w-9 h-9 sm:w-10 sm:h-10 ring-2 ring-[#ED5338]/40 shadow-lg" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black tracking-widest text-base sm:text-lg text-[#ED5338] group-hover:text-white transition">BARISTA</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-[#251B17] text-[#F3C4BA] rounded border border-[#3E2B24]">SRI LANKA</span>
              </div>
              <p className="text-[10px] text-stone-400 uppercase tracking-wider font-mono hidden sm:block">Central Kitchen Dispatch</p>
            </div>
          </div>

          <nav className="hidden xl:flex items-center space-x-1">
            {navItems.filter(item => item.visible).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-[#ED5338] text-white font-bold shadow-lg shadow-[#ED5338]/20'
                      : 'text-stone-300 hover:bg-[#251D1A] hover:text-[#ED5338]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {onOpenBackup && (
              <button
                type="button"
                onClick={onOpenBackup}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:bg-[#251D1A] hover:text-[#ED5338] transition cursor-pointer"
                title="System Backup & Recovery"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Backup</span>
              </button>
            )}
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div 
              onClick={() => {
                if (hasAccess('users', 'view')) {
                  setCurrentTab('users');
                }
              }}
              className={`flex items-center space-x-2 bg-[#1C1614] border border-[#382B25] rounded-xl px-2.5 py-1.5 transition shadow-sm ${
                hasAccess('users', 'view') ? 'hover:bg-[#271F1B] cursor-pointer group' : 'cursor-default'
              }`}
              title={hasAccess('users', 'view') ? 'Click to view User Profile & Access settings' : `Logged in as ${userProfile?.displayName || userProfile?.username || 'Staff'}`}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#ED5338] text-white font-black flex items-center justify-center text-xs shadow-md shrink-0 group-hover:scale-105 transition-transform">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'B'}
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-white max-w-[110px] sm:max-w-[170px] truncate leading-tight">
                    {userProfile?.displayName || userProfile?.username || 'Barista Staff'}
                  </span>
                  {role === 'admin' && (
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeColor(role)}`}>
                      {role}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-stone-400 font-mono leading-tight flex items-center space-x-1">
                  <span className="text-[#ED5338] font-bold">{userProfile?.userIdCode || 'USR-ADM-01'}</span>
                  <span className="text-stone-300 font-semibold"> - {userProfile?.username || 'admin'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 text-stone-400 hover:text-red-400 hover:bg-[#251D1A] rounded-xl border border-[#382B25] transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <div className="xl:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-stone-200 hover:text-white bg-[#1C1614] hover:bg-[#271F1B] border border-[#382B25] focus:outline-none flex items-center space-x-1.5 transition cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-[#ED5338]" />
                ) : (
                  <Menu className="w-5 h-5 text-[#ED5338]" />
                )}
                <span className="text-xs font-bold hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#110D0B] border-b border-[#2D231F] px-4 pt-2 pb-4 space-y-2 shadow-2xl animate-in slide-in-from-top duration-150">
          <div className="py-2.5 px-3 bg-[#1C1614] border border-[#382B25] rounded-xl mb-2 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#ED5338] text-white font-black flex items-center justify-center text-xs shadow-md">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'B'}
              </div>
              <div>
                <p className="text-xs font-bold text-white">{userProfile?.displayName || 'Barista Staff'}</p>
                <p className="text-[10px] text-stone-400 font-mono">{userProfile?.username || 'admin'} - ({userProfile?.userIdCode || 'USR-ADM-01'})</p>
              </div>
            </div>
            {role === 'admin' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getRoleBadgeColor(role)}`}>
                {role}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {navItems.filter(item => item.visible).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#ED5338] text-white font-bold shadow-lg shadow-[#ED5338]/20'
                      : 'text-stone-300 hover:bg-[#1F1917] hover:text-[#ED5338] border border-transparent hover:border-[#382B25]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {onOpenBackup && (
              <button
                type="button"
                onClick={() => {
                  onOpenBackup();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-stone-300 hover:bg-[#1F1917] hover:text-[#ED5338] border border-transparent hover:border-[#382B25] transition text-left cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>Backup</span>
              </button>
            )}
          </div>
          <div className="pt-2 border-t border-[#2D231F] flex justify-end items-center text-xs">
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 bg-[#1C1614] hover:bg-[#251D1A] rounded-lg border border-[#382B25] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
