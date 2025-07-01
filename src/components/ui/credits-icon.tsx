import { Spark } from 'iconoir-react'

interface CreditsIconProps {
  className?: string
  style?: React.CSSProperties
}

export function CreditsIcon({ className = 'h-4 w-4', style }: CreditsIconProps) {
  return <Spark className={className} style={style} />
} 