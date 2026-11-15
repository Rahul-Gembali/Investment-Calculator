export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
  isIndianSystem: boolean;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    label: 'INR',
    locale: 'en-IN',
    isIndianSystem: true,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'USD',
    locale: 'en-US',
    isIndianSystem: false,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: 'EUR',
    locale: 'en-IE',
    isIndianSystem: false,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    label: 'GBP',
    locale: 'en-GB',
    isIndianSystem: false,
  },
};

export function formatCurrency(value: number, currency: CurrencyCode, decimals = 0): string {
  if (!Number.isFinite(value)) return `${CURRENCIES[currency].symbol}0`;
  const cfg = CURRENCIES[currency];
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(decimals === 0 ? Math.round(abs) : abs);
  return `${sign}${cfg.symbol}${formatted}`;
}

export function formatCompactCurrency(value: number, currency: CurrencyCode): string {
  if (!Number.isFinite(value)) return `${CURRENCIES[currency].symbol}0`;
  const cfg = CURRENCIES[currency];
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (cfg.isIndianSystem) {
    if (abs >= 1e7) {
      return `${sign}${cfg.symbol}${(abs / 1e7).toFixed(2).replace(/\.00$/, '')} Cr`;
    }
    if (abs >= 1e5) {
      return `${sign}${cfg.symbol}${(abs / 1e5).toFixed(2).replace(/\.00$/, '')} L`;
    }
    if (abs >= 1e3) {
      return `${sign}${cfg.symbol}${(abs / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return `${sign}${cfg.symbol}${Math.round(abs)}`;
  }

  if (abs >= 1e9) {
    return `${sign}${cfg.symbol}${(abs / 1e9).toFixed(2).replace(/\.00$/, '')}B`;
  }
  if (abs >= 1e6) {
    return `${sign}${cfg.symbol}${(abs / 1e6).toFixed(2).replace(/\.00$/, '')}M`;
  }
  if (abs >= 1e3) {
    return `${sign}${cfg.symbol}${(abs / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `${sign}${cfg.symbol}${Math.round(abs)}`;
}

export function formatAxisCurrency(value: number, currency: CurrencyCode): string {
  if (!Number.isFinite(value) || value === 0) return `${CURRENCIES[currency].symbol}0`;
  const cfg = CURRENCIES[currency];
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (cfg.isIndianSystem) {
    if (abs >= 1e7) return `${sign}${cfg.symbol}${(abs / 1e7).toFixed(1).replace(/\.0$/, '')}Cr`;
    if (abs >= 1e5) return `${sign}${cfg.symbol}${(abs / 1e5).toFixed(1).replace(/\.0$/, '')}L`;
    if (abs >= 1e3) return `${sign}${cfg.symbol}${(abs / 1e3).toFixed(0)}K`;
    return `${sign}${cfg.symbol}${Math.round(abs)}`;
  }

  if (abs >= 1e9) return `${sign}${cfg.symbol}${(abs / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (abs >= 1e6) return `${sign}${cfg.symbol}${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1e3) return `${sign}${cfg.symbol}${(abs / 1e3).toFixed(0)}K`;
  return `${sign}${cfg.symbol}${Math.round(abs)}`;
}

export function formatPercent(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '0.00%';
  return `${value.toFixed(decimals)}%`;
}
