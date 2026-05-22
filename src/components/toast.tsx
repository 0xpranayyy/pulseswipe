'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, Loader2, Info, ExternalLink } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'pending' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  orderId?: string
  duration?: number // ms, default 4000. 0 = persistent
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => string
  update: (id: string, t: Partial<Toast>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((t: Omit<Toast, 'id'>): string => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const newToast: Toast = { id, duration: 4000, ...t }
    setToasts((prev) => [...prev, newToast])
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id))
      }, newToast.duration)
    }
    return id
  }, [])

  const update = useCallback((id: string, t: Partial<Toast>) => {
    setToasts((prev) => prev.map((x) => (x.id === id ? { ...x, ...t } : x)))
    // If a duration was set on update, schedule dismissal
    if (t.duration && t.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id))
      }, t.duration)
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast, update, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 left-4 right-4 z-[100] max-w-md mx-auto pointer-events-none flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { type, title, message, orderId } = toast

  const config = {
    success: { Icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/[0.05]' },
    error: { Icon: XCircle, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/[0.05]' },
    pending: { Icon: Loader2, color: 'text-amber-400 animate-spin', border: 'border-amber-500/30', bg: 'bg-amber-500/[0.05]' },
    info: { Icon: Info, color: 'text-white/60', border: 'border-white/[0.1]', bg: 'bg-white/[0.03]' },
  }[type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className={`pointer-events-auto bg-[#0a0a0a]/95 backdrop-blur-xl border ${config.border} ${config.bg} rounded-2xl p-3 shadow-2xl shadow-black/50 cursor-pointer`}
      onClick={onDismiss}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <config.Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-white">{title}</p>
          {message && <p className="text-[10px] text-white/50 mt-0.5 leading-relaxed">{message}</p>}
          {orderId && (
            <p className="text-[9px] text-white/25 mt-1 font-mono truncate">Order: {orderId}</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
