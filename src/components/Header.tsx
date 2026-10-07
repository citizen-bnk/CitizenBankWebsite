import { Building2, ChevronDown, User, Settings, LogOut, Home, UserCircle, Shield, Globe } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { useUser } from "@stackframe/react";
import { stackClientApp } from "app/auth";
import { useUserRoles } from "utils/useUserRoles";
import CurrencySelector from "./CurrencySelector";
import { MobileNav } from "./MobileNav";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";
import { NotificationBell } from "./NotificationBell";
import { getFrontendPath } from "utils/env";

const logoUrl = "/brand/logo.png";

export function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const { roles, loading: rolesLoading } = useUserRoles();

  const handleLogout = async () => {
    await stackClientApp.signOut();
    setShowUserMenu(false);
    navigate('/');
  };

  // Portal navigation based on roles
  const getPortalLinks = () => {
    const links = [];
    
    if (roles.includes('super_admin')) {
      links.push(
        { label: 'Admin Dashboard', path: '/admin-dashboard', icon: Settings },
        { label: 'Admin Setup Guide', path: '/admin-setup-guide', icon: Shield },
      );
    }
    
    if (roles.includes('super_admin') || roles.includes('staff')) {
      links.push(
        { label: 'Back Office', path: '/back-office-dashboard', icon: Building2 },
      );
    }
    
    if (roles.includes('board_member')) {
      links.push(
        { label: 'Board Portal', path: '/board-portal', icon: User },
      );
    }
    
    if (roles.includes('customer')) {
      links.push(
        { label: 'Customer Portal', path: '/customer-portal', icon: User },
      );
    }
    
    if (roles.includes('investor')) {
      links.push(
        { label: 'Investor Portal', path: '/invest', icon: User },
      );
    }
    
    return links;
  };

  return (
    <header className="sticky top-0 z-50 glassmorphism">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3 sm:py-4">
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <MobileNav />
          </div>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <img src={logoUrl} alt="Citizen Bank" className="h-8 sm:h-10 md:h-12 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-sm sm:text-base md:text-xl font-bold bg-gradient-to-r from-orange-600 via-pink-600 to-purple-700 bg-clip-text text-transparent">Citizen Bank</h1>
              <p className="text-[10px] sm:text-xs text-gray-500">Kingdom of Lesotho</p>
            </div>
          </Link>

          {/* Main Menu - Hidden on mobile, shown on large screens */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            <Link to="/demo" className="text-sm text-gray-700 hover:text-[#6d52a2] font-medium transition-colors">
              Demonstration
            </Link>
            <Link to={getFrontendPath("/invest")} className="text-sm text-gray-700 hover:text-[#6d52a2] font-medium transition-colors">
              Invest
            </Link>
            <Link to="/" className="text-sm text-gray-700 hover:text-[#6d52a2] font-medium transition-colors">
              About
            </Link>
            <Link to="/media" className="text-sm text-gray-700 hover:text-[#6d52a2] font-medium transition-colors">
              Media
            </Link>
            <Link to="/newsletters" className="text-sm text-gray-700 hover:text-[#6d52a2] font-medium transition-colors">
              Newsletters
            </Link>
            <Link to="/careers" className="text-sm text-gray-700 hover:text-[#6d52a2] font-medium transition-colors">
              Careers
            </Link>
          </nav>

          {/* Right Side: Currency Selector + Profile Bell + User Menu */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Currency Selector - Hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <CurrencySelector />
            </div>

            {/* Notification Bell - Show for all logged-in users */}
            {user && (
              <NotificationBell />
            )}

            {/* User Profile / Login Dropdown */}
            <div className="relative">
              {user ? (
                // Logged in - show user profile
                <>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-2.5 bg-[#6d52a2] text-white rounded-lg hover:bg-[#5a4289] transition-colors font-medium text-xs sm:text-sm"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline max-w-[80px] lg:max-w-[150px] truncate">{user.displayName || user.primaryEmail || 'User'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="font-medium text-gray-900 truncate">{user.displayName || 'User'}</p>
                        <p className="text-sm text-gray-500 truncate">{user.primaryEmail}</p>
                        {!rolesLoading && roles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {roles.map(role => (
                              <span key={role} className="text-xs px-2 py-0.5 bg-[#6d52a2] text-white rounded">
                                {role.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Portal Links */}
                      <div className="py-2">
                        <Link
                          to="/"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#6d52a2]"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Home className="h-4 w-4" />
                          Home
                        </Link>
                        
                        <Link
                          to="/profile"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#6d52a2]"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <UserCircle className="h-4 w-4" />
                          Profile
                        </Link>
                        
                        {getPortalLinks().map(link => (
                          <Link
                            key={link.path}
                            to={link.path}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#6d52a2]"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <link.icon className="h-4 w-4" />
                            {link.label}
                          </Link>
                        ))}
                      </div>
                      
                      {/* Logout */}
                      <div className="border-t border-gray-200 py-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            setShowLogoutDialog(true);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Not logged in - show login dropdown
                <>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#6d52a2] text-white rounded-lg hover:bg-[#5a4289] transition-colors font-medium"
                  >
                    <User className="h-4 w-4" />
                    <span>Login</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="py-2">
                        <Link
                          to="/auth/sign-in"
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#6d52a2]"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Customer Portal
                        </Link>
                        <Link
                          to="/auth/sign-in"
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#6d52a2]"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Investor Portal
                        </Link>
                        <Link
                          to="/auth/sign-in"
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#6d52a2]"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Board Portal
                        </Link>
                        <div className="border-t border-gray-200 my-1"></div>
                        <Link
                          to="/auth/sign-in"
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#6d52a2]"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Back Office Login
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <LogoutConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogout}
      />
    </header>
  );
}
