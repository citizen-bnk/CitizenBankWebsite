import { useUserGuardContext } from "app/auth";
import { stackClientApp } from "app/auth";
import { useNavigate } from "react-router-dom";
import { useUserRoles } from "utils/useUserRoles";
import { useUserProfile, calculateProfileCompletion } from "utils/userProfile";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, User, LogOut, Home, TrendingUp, Shield } from "lucide-react";
import { LogoutConfirmDialog } from "./LogoutConfirmDialog";

export const ProfileDropdown = () => {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();
  const { isInvestor, isBoardMember } = useUserRoles();
  const { profile, fetchProfile } = useUserProfile();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []); // Empty array - zustand store functions are stable

  // Calculate completion percentage
  const completionPercentage = calculateProfileCompletion(profile);

  // Get user initials for avatar
  const getInitials = () => {
    const name = user.displayName || user.primaryEmail || "User";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await stackClientApp.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-600 text-white">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.displayName || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.primaryEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate("/customer-portal")}>
          <Home className="mr-2 h-4 w-4" />
          <span>Home</span>
        </DropdownMenuItem>

        {/* Board Member Portal */}
        {isBoardMember && (
          <DropdownMenuItem onClick={() => navigate("/board-portal")}>
            <Shield className="mr-2 h-4 w-4" />
            <span>Board Portal</span>
          </DropdownMenuItem>
        )}

        {/* Investor Portal */}
        {isInvestor && (
          <DropdownMenuItem onClick={() => navigate("/board-investment")}>
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>My Investments</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
          {completionPercentage < 100 && (
            <Badge 
              variant="secondary" 
              className="ml-auto text-xs"
            >
              {completionPercentage}%
            </Badge>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate("/profile?tab=notifications")}>
          <Bell className="mr-2 h-4 w-4" />
          <span>Notifications</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate("/profile?tab=messages")}>
          <Mail className="mr-2 h-4 w-4" />
          <span>Messages</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => setShowLogoutDialog(true)}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      
      <LogoutConfirmDialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        onConfirm={handleLogout}
      />
    </DropdownMenu>
  );
};
