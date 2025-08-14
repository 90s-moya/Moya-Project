// src/components/ui/tabs.tsx
import * as React from "react"

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
  className?: string
}) {
  return <div className={className}>{children}</div>
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex gap-2 ${className}`}>{children}</div>
}

export function TabsTrigger({
  value,
  children,
  className,
  onClick,
}: {
  value: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-sm border ${className}`}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  activeValue,
  children,
  className,
}: {
  value: string
  activeValue: string
  children: React.ReactNode
  className?: string
}) {
  if (value !== activeValue) return null
  return <div className={className}>{children}</div>
}
