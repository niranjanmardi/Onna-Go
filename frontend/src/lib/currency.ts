export function formatPaise(amountPaise: number, currency = 'INR'): string {
  const isNegative = amountPaise < 0;
  const absPaise = Math.abs(amountPaise);
  const units = absPaise / 100;

  let formatted = '';
  if (currency === 'INR') {
    formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(units);
  } else {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(units);
  }

  return isNegative ? `-${formatted}` : formatted;
}

export function paiseToRupees(amountPaise: number): number {
  return Number((amountPaise / 100).toFixed(2));
}

export function rupeesToPaise(rupees: number | string): number {
  const val = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(val) || val <= 0) return 0;
  return Math.round(val * 100);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function getCurrencySymbol(currency = 'INR'): string {
  switch (currency.toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'AED':
      return 'د.إ';
    case 'INR':
    default:
      return '₹';
  }
}

