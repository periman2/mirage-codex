'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, CreditCard, Calendar, TrendingUp, Edit3, Camera, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_SEARCH_CREDITS, DEFAULT_PAGE_GENERATION_CREDITS, getModelOperationsRemaining } from '@/lib/credit-constants'

interface UserBillingInfo {
  credits: number
  credits_used_this_month: number
  credits_reset_at: string
  plan_name: string
  plan_slug: string
  plan_description: string
  plan_credits_per_month: number
  plan_price_cents: number
}

interface UserProfile {
  display_name: string | null
  avatar_url: string | null
}

interface CreditTransaction {
  id: string
  amount: number
  transaction_type: string
  description: string
  created_at: string
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [billingInfo, setBillingInfo] = useState<UserBillingInfo | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedDisplayName, setEditedDisplayName] = useState('')

  // Redirect if not authenticated (only after auth loading is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }
  }, [user, authLoading, router])

  // Load user data
  useEffect(() => {
    if (!user) return

    const loadUserData = async () => {
      try {
        // Load billing info
        const billingResponse = await fetch('/api/user/billing')
        if (billingResponse.ok) {
          const billingData = await billingResponse.json()
          setBillingInfo(billingData)
        }

        // Load profile info
        const profileResponse = await fetch('/api/user/profile')
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setProfile(profileData)
          setEditedDisplayName(profileData.display_name || '')
        }

        // Load recent transactions
        const transactionsResponse = await fetch('/api/user/transactions')
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json()
          setTransactions(transactionsData)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [user])

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: editedDisplayName.trim() || null,
        }),
      })

      if (response.ok) {
        const updatedProfile = await response.json()
        setProfile(updatedProfile)
        setIsEditing(false)
        toast.success('Profile updated successfully!')
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'search':
        return 'Search'
      case 'page_generation':
        return 'Page Generation'
      case 'plan_credit':
        return 'Plan Credit'
      case 'bonus':
        return 'Bonus'
      case 'refund':
        return 'Refund'
      default:
        return type
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'search':
        return '🔍'
      case 'page_generation':
        return '📄'
      case 'plan_credit':
        return '🎁'
      case 'bonus':
        return '⭐'
      case 'refund':
        return '↩️'
      default:
        return '💰'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-mirage-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-mirage-accent-primary mx-auto"></div>
          <p className="mt-4 text-mirage-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-mirage-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-mirage-accent-primary mx-auto"></div>
          <p className="mt-4 text-mirage-text-secondary">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mirage-gradient p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-mirage-text-primary mb-2">
            Profile & Usage
          </h1>
          <p className="text-mirage-text-secondary">
            Manage your account and track your book generation usage
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-lg font-semibold">
                      {(profile?.display_name || user.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    disabled
                    title="Avatar upload coming soon"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Display Name */}
                <div className="text-center w-full">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editedDisplayName}
                        onChange={(e) => setEditedDisplayName(e.target.value)}
                        placeholder="Enter display name"
                        className="text-center"
                        maxLength={50}
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="flex-1"
                        >
                          {saving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false)
                            setEditedDisplayName(profile?.display_name || '')
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-mirage-text-primary">
                        {profile?.display_name || 'No name set'}
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                        className="text-xs"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit Name
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Account Info */}
              <div className="space-y-2 text-sm">
                <div>
                  <Label className="text-mirage-text-muted">Email</Label>
                  <p className="text-mirage-text-primary">{user.email}</p>
                </div>
                <div>
                  <Label className="text-mirage-text-muted">Member Since</Label>
                  <p className="text-mirage-text-primary">
                    {formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credits & Plan Card */}
          <Card className="bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Credits & Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {billingInfo ? (
                <>
                  {/* Current Plan */}
                  <div>
                    <Badge 
                      variant={billingInfo.plan_slug === 'free' ? 'outline' : 'default'}
                      className="mb-2"
                      style={billingInfo.plan_slug !== 'free' ? {
                        backgroundColor: 'rgb(217 119 6)',
                        color: 'white'
                      } : {}}
                    >
                      {billingInfo.plan_name}
                    </Badge>
                    <p className="text-sm text-mirage-text-secondary">
                      {billingInfo.plan_description}
                    </p>
                  </div>

                  <Separator />

                  {/* Credits */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-mirage-text-secondary">Available Credits</span>
                      <span className="text-2xl font-bold text-mirage-accent-primary">
                        {billingInfo.credits}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-mirage-text-muted">Used this month</span>
                        <span className="text-mirage-text-primary">{billingInfo.credits_used_this_month}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-mirage-text-muted">Monthly allowance</span>
                        <span className="text-mirage-text-primary">{billingInfo.plan_credits_per_month}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-mirage-text-muted">Resets on</span>
                        <span className="text-mirage-text-primary">
                          {formatDate(billingInfo.credits_reset_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Usage Projections */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-mirage-text-primary">With Current Credits</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-mirage-text-muted">Searches available</span>
                        <span className="text-mirage-text-primary">
                          ~{getModelOperationsRemaining(billingInfo.credits, DEFAULT_SEARCH_CREDITS)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mirage-text-muted">Pages you can generate</span>
                        <span className="text-mirage-text-primary">
                          ~{getModelOperationsRemaining(billingInfo.credits, DEFAULT_PAGE_GENERATION_CREDITS)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Button */}
                  <Button
                    onClick={() => router.push('/billing')}
                    className="w-full mt-4"
                    style={{
                      backgroundColor: 'rgb(217 119 6)',
                      color: 'white'
                    }}
                  >
                    Manage Billing & Plans
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-mirage-text-muted">Loading billing information...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your recent credit transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 8).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-mirage-border-secondary last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getTransactionIcon(transaction.transaction_type)}</span>
                        <div>
                          <p className="text-sm font-medium text-mirage-text-primary">
                            {formatTransactionType(transaction.transaction_type)}
                          </p>
                          <p className="text-xs text-mirage-text-muted">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-mirage-text-muted">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 