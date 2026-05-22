import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toFixed(0)
}

export function formatPercentage(num: number): string {
  return `${Math.round(num)}%`
}

export function timeRemaining(endDate: Date | string | null): string {
  if (!endDate) return 'Ongoing'
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 30) return `${Math.floor(days / 30)}mo`
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

export function generateSparkline(length: number = 12): number[] {
  const data: number[] = []
  let value = 50 + Math.random() * 30
  for (let i = 0; i < length; i++) {
    value += (Math.random() - 0.5) * 10
    value = Math.max(5, Math.min(95, value))
    data.push(value)
  }
  return data
}
