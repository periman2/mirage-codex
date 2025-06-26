'use client'

import { useState } from 'react'
import { Avatar } from './ui/avatar'
import { Button } from './ui/button'
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from './ui/sheet'
import { useAuth } from '@/lib/auth-context'
import { User, Settings, LogOut, CreditCard } from 'lucide-react'

export function UserMenu() {
  const { user, profile, signOut } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  if (!user) return null

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User'
  const avatar = profile?.avatar_url

  return (
    <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {avatar ? (
              <img 
                src={avatar} 
                alt={displayName}
                className="aspect-square h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-sm font-medium">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
          </Avatar>
        </Button>
      </SheetTrigger>
      
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Account</SheetTitle>
          <SheetDescription>
            Manage your MirageCodex account settings
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* User Info */}
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-12 w-12">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={displayName}
                  className="aspect-square h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-medium">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </Avatar>
            <div>
              <p className="font-medium">{displayName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                // TODO: Open profile settings
                setIsProfileOpen(false)
              }}
            >
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                // TODO: Open billing
                setIsProfileOpen(false)
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Billing & Credits
            </Button>

            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                // TODO: Open settings
                setIsProfileOpen(false)
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>

          <div className="border-t pt-4">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={async () => {
                await signOut()
                setIsProfileOpen(false)
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 