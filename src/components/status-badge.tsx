import { cn } from '@/lib/utils'
import { statusLabels, type OrderStatus } from '@/lib/catalog'

const tones: Record<OrderStatus, string> = {
  placed: 'bg-secondary text-secondary-foreground',
  confirmed: 'bg-accent/60 text-accent-foreground',
  out_for_delivery: 'bg-chart-3/25 text-foreground',
  delivered: 'bg-chart-4/20 text-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
}

const dots: Record<OrderStatus, string> = {
  placed: 'bg-primary',
  confirmed: 'bg-chart-2',
  out_for_delivery: 'bg-chart-3',
  delivered: 'bg-chart-4',
  cancelled: 'bg-destructive',
}

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        tones[status],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dots[status])} aria-hidden />
      {statusLabels[status]}
    </span>
  )
}
