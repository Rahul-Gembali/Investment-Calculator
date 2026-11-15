import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { CurrencyCode, formatCompactCurrency, formatCurrency } from '../../lib/currency';

export type MetricFormat = 'currency' | 'compactCurrency' | 'percent' | 'multiplier' | 'years';

interface OdometerMetricProps {
  value: number;
  currency?: CurrencyCode;
  format?: MetricFormat;
  decimals?: number;
  className?: string;
  compactThreshold?: number;
}

export function OdometerMetric({
  value,
  currency = 'INR',
  format = 'currency',
  decimals = 0,
  className = '',
  compactThreshold = 1e8,
}: OdometerMetricProps) {
  const elRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<{ val: number }>({ val: value });

  const formatOutput = (num: number): string => {
    if (!Number.isFinite(num)) return '—';
    switch (format) {
      case 'currency':
        if (Math.abs(num) >= compactThreshold) {
          return formatCompactCurrency(num, currency);
        }
        return formatCurrency(num, currency, decimals);
      case 'compactCurrency':
        return formatCompactCurrency(num, currency);
      case 'percent':
        return `${num.toFixed(decimals)}%`;
      case 'multiplier':
        return `${num.toFixed(decimals)}x`;
      case 'years':
        return `${num.toFixed(decimals)} yrs`;
      default:
        return String(num);
    }
  };

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !Number.isFinite(value)) {
      stateRef.current.val = value;
      el.textContent = formatOutput(value);
      return;
    }

    const tween = gsap.to(stateRef.current, {
      val: value,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
      onUpdate: () => {
        if (elRef.current) {
          elRef.current.textContent = formatOutput(stateRef.current.val);
        }
      },
      onComplete: () => {
        if (elRef.current) {
          elRef.current.textContent = formatOutput(value);
        }
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, currency, format, decimals, compactThreshold]);

  return (
    <span ref={elRef} className={`font-mono tabular-nums ${className}`}>
      {formatOutput(value)}
    </span>
  );
}
