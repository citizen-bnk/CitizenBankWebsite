import { useState, useEffect } from 'react';
import { Link } from "./EcosystemLink";
import { useNavigate } from "react-router-dom";
import { X, Menu, User, Home, Building2, Shield, UserCircle, LogOut } from 'lucide-react';
import { useUser } from '@stackframe/react';
import { stackClientApp } from 'app/auth';
import { useUserRoles } from 'utils/useUserRoles';
import { useUserProfile, calculateProfileCompletion } from 'utils/userProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { LogoutConfirmDialog } from './LogoutConfirmDialog';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const user = useUser();
  const { roles } = useUserRoles();
  const { profile, fetchProfile } = useUserProfile();
  const navigate = useNavigate();

  // Fetch profile on mount
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user?.id]); // Only depend on user ID, not fetchProfile - zustand functions are stable

  // Calculate completion percentage
  const completionPercentage = calculateProfileCompletion(profile);

  const handleLogout = async () => {
    await stackClientApp.signOut();
    setIsOpen(false);
    navigate('/');
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const getPortalLinks = () => {
    const links = [];
    
    if (roles.includes('super_admin')) {
      links.push({ label: 'Admin Dashboard', path: '/admin-dashboard', icon: Shield });
    }
    
    if (roles.includes('super_admin') || roles.includes('staff')) {
      links.push({ label: 'Back Office', path: '/back-office-dashboard', icon: Building2 });
    }
    
    if (roles.includes('board_member')) {
      links.push({ label: 'Board Portal', path: '/board-portal', icon: User });
    }
    
    if (roles.includes('customer')) {
      links.push({ label: 'Customer Portal', path: '/customer-portal', icon: User });
    }
    
    if (roles.includes('investor')) {
      links.push({ label: 'Investor Portal', path: '/invest', icon: User });
    }
    
    return links;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="text-left">
            <Link to="/" onClick={handleLinkClick} className="flex items-center gap-2">
              <img 
                src="/brand/logo-sm.webp" 
                alt="Citizen Bank" 
                className="h-8 w-auto" 
              />
              <div>
                <div className="text-base font-bold bg-gradient-to-r from-orange-600 via-pink-600 to-purple-700 bg-clip-text text-transparent">Citizen Bank</div>
                <div className="text-xs text-gray-500 font-normal">Kingdom of Lesotho</div>
              </div>
            </Link>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* User Info Section */}
          {user && (
            <div className="space-y-2">
              <div className="px-2 py-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 truncate">{user.displayName || 'User'}</p>
                <p className="text-sm text-gray-500 truncate">{user.primaryEmail}</p>
                {roles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {roles.map(role => (
                      <span key={role} className="text-xs px-2 py-0.5 bg-[#6d52a2] text-white rounded">
                        {role.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <nav className="space-y-1">
            <Link
              to="/"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Home className="h-5 w-5" />
              <span>Home</span>
            </Link>
            
            <Link
              to="/invest"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Building2 className="h-5 w-5" />
              <span>Invest</span>
            </Link>

            <Link
              to="/foreign-exchange"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Building2 className="h-5 w-5" />
              <span>Foreign Exchange</span>
            </Link>
            
            <Link
              to="/media"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Building2 className="h-5 w-5" />
              <span>Media</span>
            </Link>

            <Link
              to="/contact"
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Building2 className="h-5 w-5" />
              <span>Contact</span>
            </Link>
          </nav>

          {/* Portal Links */}
          {user && getPortalLinks().length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
                  Your Portals
                </p>
                <Link
                  to="/profile"
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <UserCircle className="h-5 w-5" />
                  <span>Profile</span>
                  {completionPercentage < 100 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-auto text-xs"
                    >
                      {completionPercentage}%
                    </Badge>
                  )}
                </Link>
                {getPortalLinks().map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={handleLinkClick}
                    className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <link.icon className="h-5 w-5" />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Auth Section */}
          <Separator />
          <div className="space-y-2">
            {user ? (
              <Button
                onClick={() => {
                  setIsOpen(false);
                  setShowLogoutDialog(true);
                }}
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            ) : (
              <Link to="/auth/sign-in" onClick={handleLinkClick}>
                <Button className="w-full bg-[#6d52a2] hover:bg-[#5a4289]">
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </SheetContent>
      
      <LogoutConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogout}
      />
    </Sheet>
  );
}
