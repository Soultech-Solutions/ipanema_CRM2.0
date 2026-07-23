export function formatCurrency (value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} mi`
    }
    if (Math.abs(value) >= 1000) {
      return `R$ ${(value / 1000).toLocaleString('pt-BR', {
        maximumFractionDigits: 0,
      })} mil`
    }
  }

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

export function formatPercent (value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatDate (iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function healthColor (score: number): string {
  if (score >= 85) {
    return 'success'
  }
  if (score >= 70) {
    return 'info'
  }
  if (score >= 50) {
    return 'warning'
  }
  return 'error'
}

export function priorityColor (priority: string): string {
  switch (priority) {
    case 'alta': {
      return 'error'
    }
    case 'media': {
      return 'warning'
    }
    default: {
      return 'info'
    }
  }
}

export function severityColor (severity: string): string {
  switch (severity) {
    case 'critical': {
      return 'error'
    }
    case 'warning': {
      return 'warning'
    }
    default: {
      return 'info'
    }
  }
}
