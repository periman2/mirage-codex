'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Check, Crown, Zap, ArrowLeft, CreditCard, Calendar, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_SEARCH_CREDITS, DEFAULT_PAGE_GENERATION_CREDITS } from '@/lib/credit-constants'
import { CreditsDisplay } from '@/components/credits-display'

interface Plan {
  id: number
  name: string
  slug: string
  description: string
  credits_per_month: number
  price_cents: number
  is_active: boolean
}

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

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [billingInfo, setBillingInfo] = useState<UserBillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState<number | null>(null)

  // Redirect if not authenticated (only after auth loading is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }
  }, [user, authLoading, router])

  // Load billing data
  useEffect(() => {
    if (!user) return

    const loadBillingData = async () => {
      try {
        // Load plans
        const plansResponse = await fetch('/api/billing/plans')
        if (plansResponse.ok) {
          const plansData = await plansResponse.json()
          setPlans(plansData)
        }

        // Load user billing info
        const billingResponse = await fetch('/api/user/billing')
        if (billingResponse.ok) {
          const billingData = await billingResponse.json()
          setBillingInfo(billingData)
        }
      } catch (error) {
        console.error('Error loading billing data:', error)
        toast.error('Failed to load billing information')
      } finally {
        setLoading(false)
      }
    }

    loadBillingData()
  }, [user])

  const handlePlanChange = async (planId: number) => {
    if (!user || changingPlan) return

    setChangingPlan(planId)
    try {
      const response = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      })

      if (response.ok) {
        const updatedBilling = await response.json()
        setBillingInfo(updatedBilling)
        toast.success('Plan changed successfully!')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change plan')
      }
    } catch (error) {
      console.error('Error changing plan:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to change plan')
    } finally {
      setChangingPlan(null)
    }
  }

  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free'
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Calculate approximate operations based on default credit costs (actual costs vary by model)
  const calculateSearches = (credits: number) => Math.floor(credits / DEFAULT_SEARCH_CREDITS)
  const calculatePages = (credits: number) => Math.floor(credits / DEFAULT_PAGE_GENERATION_CREDITS)

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
          <p className="mt-4 text-mirage-text-secondary">Loading billing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mirage-gradient p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/profile')}
            className="h-10 w-10 p-0 bg-white/90 border-mirage-border-primary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-mirage-text-primary">
              Billing & Plans
            </h1>
            <p className="text-mirage-text-secondary">
              Manage your subscription and billing preferences
            </p>
          </div>
        </div>

        {/* Current Plan Overview */}
        {billingInfo && (
          <Card className="bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm text-mirage-text-muted">Plan</Label>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={billingInfo.plan_slug === 'free' ? 'outline' : 'default'}
                      style={billingInfo.plan_slug !== 'free' ? {
                        backgroundColor: 'rgb(217 119 6)',
                        color: 'white'
                      } : {}}
                    >
                      {billingInfo.plan_name}
                    </Badge>
                    {billingInfo.plan_slug !== 'free' && <Crown className="h-4 w-4 text-amber-500" />}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-mirage-text-muted">Available Credits</Label>
                  <CreditsDisplay 
                    variant="default" 
                    size="lg" 
                    className="text-2xl font-bold text-mirage-accent-primary"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-mirage-text-muted">Used This Month</Label>
                  <p className="text-lg font-semibold text-mirage-text-primary">
                    {billingInfo.credits_used_this_month}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-mirage-text-muted">Resets On</Label>
                  <p className="text-sm text-mirage-text-primary">
                    {formatDate(billingInfo.credits_reset_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-mirage-text-primary">
            Available Plans
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = billingInfo?.plan_slug === plan.slug
              const searches = calculateSearches(plan.credits_per_month)
              const pages = calculatePages(plan.credits_per_month)
              
              return (
                <Card 
                  key={plan.id} 
                  className={`bg-white/95 backdrop-blur-md border shadow-xl transition-all duration-200 ${
                    isCurrentPlan 
                      ? 'border-amber-500 ring-2 ring-amber-500/20' 
                      : 'border-mirage-border-primary hover:border-amber-300'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {plan.slug === 'free' ? (
                          <Zap className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Crown className="h-5 w-5 text-amber-500" />
                        )}
                        {plan.name}
                      </CardTitle>
                      {isCurrentPlan && (
                        <Badge 
                          variant="default"
                          style={{
                            backgroundColor: 'rgb(217 119 6)',
                            color: 'white'
                          }}
                        >
                          Current
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Price */}
                    <div className="text-center">
                      <div className="text-3xl font-bold text-mirage-text-primary">
                        {formatPrice(plan.price_cents)}
                      </div>
                      {plan.price_cents > 0 && (
                        <div className="text-sm text-mirage-text-muted">per month</div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Features */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-mirage-text-primary">
                          {plan.credits_per_month} credits per month
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-mirage-text-primary">
                          Up to {searches} searches
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-mirage-text-primary">
                          Up to {pages} pages generated
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-mirage-text-primary">
                          Access to all AI models
                        </span>
                      </div>
                      
                      {plan.slug !== 'free' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-mirage-text-primary">
                              Priority support
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-mirage-text-primary">
                              Early access to new features
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <Separator />
                    
                    {/* Action Button */}
                    <Button
                      onClick={() => handlePlanChange(plan.id)}
                      disabled={isCurrentPlan || changingPlan === plan.id}
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : "default"}
                      style={!isCurrentPlan ? {
                        backgroundColor: 'rgb(217 119 6)',
                        color: 'white'
                      } : {}}
                    >
                      {changingPlan === plan.id ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          Switching...
                        </div>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : plan.slug === 'free' ? (
                        'Switch to Free'
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </Button>
                    
                    {plan.slug !== 'free' && !isCurrentPlan && (
                      <p className="text-xs text-center text-mirage-text-muted">
                        * Full Stripe integration coming soon
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Credit Usage Guide */}
        <Card className="bg-white/95 backdrop-blur-md border border-mirage-border-primary shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Credit Usage Guide
            </CardTitle>
            <CardDescription>
              Understand how credits are used for different operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-mirage-text-primary">Search Operations</h4>
                <p className="text-sm text-mirage-text-secondary">
                  Each search uses <strong>3-10 credits</strong> (varies by AI model) to generate new books. 
                  Cached searches don't use any credits.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-mirage-text-primary">Page Generation</h4>
                <p className="text-sm text-mirage-text-secondary">
                  Each page generated uses <strong>2-8 credits</strong> (varies by AI model). 
                  Reading already generated pages is always free.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-sm text-mirage-text-muted">
              <p>
                <strong>💡 Pro Tip:</strong> Credits reset monthly, so make sure to use them before your reset date! 
                Unused credits don't roll over to the next month.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper Label component
function Label({ className, children, ...props }: { className?: string; children: React.ReactNode }) {
  return (
    <label className={`text-sm font-medium ${className}`} {...props}>
      {children}
    </label>
  )
} 