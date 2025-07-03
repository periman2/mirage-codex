'use client'

import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const loadingVariants = cva(
  "flex items-center justify-center gap-2 rounded-full backdrop-blur-sm border shadow-sm transition-all",
  {
    variants: {
      variant: {
        default: "bg-white/90 border-mirage-border-primary text-mirage-text-tertiary",
        overlay: "bg-black/20 border-white/30 text-white",
        card: "bg-amber-50/90 border-amber-200/50 text-amber-700",
        minimal: "bg-transparent border-none shadow-none text-mirage-text-secondary"
      },
      size: {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-sm", 
        lg: "px-4 py-2 text-base",
        xl: "px-6 py-3 text-lg"
      },
      spinner: {
        sm: "h-3 w-3",
        md: "h-4 w-4", 
        lg: "h-5 w-5",
        xl: "h-6 w-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      spinner: "md"
    }
  }
)

interface LoadingProps extends VariantProps<typeof loadingVariants> {
  className?: string
  message?: string
  showMessage?: boolean
  spinnerClassName?: string
}

export function Loading({ 
  className, 
  variant, 
  size, 
  spinner, 
  message = "Loading...", 
  showMessage = true,
  spinnerClassName,
  ...props 
}: LoadingProps) {
  const spinnerSize = spinner || size
  
  return (
    <div className={cn(loadingVariants({ variant, size }), className)} {...props}>
      {/* Animated Spinner */}
      <div 
        className={cn(
          "animate-spin rounded-full border-b-2",
          // Dynamic border color based on variant
          variant === "overlay" ? "border-white" :
          variant === "card" ? "border-amber-600" : 
          "border-mirage-accent-primary",
          loadingVariants({ spinner: spinnerSize }).replace(/^.*?(h-\d+\s+w-\d+).*$/, '$1'),
          spinnerClassName
        )} 
      />
      
      {/* Loading Message */}
      {showMessage && (
        <span className="font-medium truncate">
          {message}
        </span>
      )}
    </div>
  )
}

// Specific loading component for page transitions
export function PageTransitionLoading({ className }: { className?: string }) {
  return (
    <div className={cn("absolute top-2 right-2 z-10", className)}>
      <Loading 
        variant="default"
        size="sm" 
        message="Loading page..."
        className="shadow-sm"
      />
    </div>
  )
}

// Full page loading component
export function PageLoading({ 
  message = "Loading...", 
  className 
}: { 
  message?: string
  className?: string 
}) {
  return (
    <div className={cn("flex items-center justify-center h-64", className)}>
      <div className="text-center space-y-4">
        <Loading 
          variant="card"
          size="lg"
          spinner="lg"
          message={message}
          className="mx-auto"
        />
      </div>
    </div>
  )
}

// Inline loading for buttons or small components
export function InlineLoading({ 
  message = "Loading...", 
  className,
  showMessage = false 
}: { 
  message?: string
  className?: string
  showMessage?: boolean
}) {
  return (
    <Loading 
      variant="minimal"
      size="sm"
      spinner="sm" 
      message={message}
      showMessage={showMessage}
      className={className}
    />
  )
} 