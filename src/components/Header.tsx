import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  Sparkles, 
  Settings, 
  User,
  LogOut,
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import aiAvatar from '@/assets/ai-avatar.jpg';
import homyworkLogo from '@/assets/homywork_logo.svg';

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className={`bg-background border-b border-border ${className}`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center min-w-[180px]">
          <span className="text-2xl font-bold text-foreground">AI Image Studio</span>
        </div>
        {/* Status & Actions */}
        <div className="flex items-center gap-4">
          {/* AI Status */}
          <Badge variant="outline" className="border-status-success/30 text-status-success hidden sm:flex">
            <div className="w-2 h-2 bg-status-success rounded-full mr-2 animate-pulse"></div>
            AI Ready
          </Badge>
          {/* Quick Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <Zap className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-secondary text-foreground">
                    U
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover border-border" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-foreground text-sm">
                    U
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">User</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'demo@example.com'}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="cursor-pointer hover:bg-destructive/10 text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;