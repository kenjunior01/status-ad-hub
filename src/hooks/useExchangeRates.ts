import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExchangeRates {
  [currency: string]: number;
}

const CACHE_KEY = 'statusads_exchange_rates';
const CACHE_TTL = 3600_000; // 1 hour

export const useExchangeRates = () => {
  const FALLBACK_RATES: ExchangeRates = {
    USD: 1, BRL: 5.15, EUR: 0.92, GBP: 0.79, MZN: 63.5,
    AOA: 835, ARS: 875, MXN: 17.2, COP: 3950, PEN: 3.72, CLP: 925,
  };
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL) {
          setRates(parsed.rates);
          setLastUpdated(parsed.date || null);
          setLoading(false);
          return;
        }
      }
    } catch { /* ignore */ }

    try {
      const { data, error } = await supabase.functions.invoke('currency-rates', {
        body: null,
        method: 'GET',
      });

      // If edge function invoke doesn't support GET, try fetch directly
      let ratesData: ExchangeRates;
      let date: string | null = null;

      if (error || !data) {
        // Fallback: fetch directly
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/currency-rates`;
        const res = await fetch(url, {
          headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const json = await res.json();
        ratesData = json.rates;
        date = json.date;
      } else {
        ratesData = data.rates;
        date = data.date;
      }

      if (ratesData) {
        setRates(ratesData);
        setLastUpdated(date);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          rates: ratesData,
          date,
          timestamp: Date.now(),
        }));
      }
    } catch (err) {
      console.error('Failed to fetch exchange rates:', err);
      // Use fallback rates
      setRates({
        USD: 1, BRL: 5.15, EUR: 0.92, GBP: 0.79, MZN: 63.5,
        AOA: 835, ARS: 875, MXN: 17.2, COP: 3950, PEN: 3.72, CLP: 925,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convert = useCallback((amount: number, from: string, to: string): number => {
    if (from === to) return amount;
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    // Convert: amount in 'from' → USD → 'to'
    return (amount / fromRate) * toRate;
  }, [rates]);

  const getRate = useCallback((from: string, to: string): number => {
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;
    return toRate / fromRate;
  }, [rates]);

  return { rates, loading, lastUpdated, convert, getRate, refetch: fetchRates };
};
