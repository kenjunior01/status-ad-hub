import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { currencies, countries, formatCurrency, Currency, Country } from '@/lib/currencies';

interface LocalizationState {
  currency: string;
  country: string;
  region: string;
}

const STORAGE_KEY = 'statusads_localization_v2';
const OLD_STORAGE_KEY = 'statusads_localization';

const SUPPORTED_CURRENCIES = new Set(currencies.map(c => c.code));
const SUPPORTED_COUNTRIES = new Set(countries.map(c => c.code));
const SUPPORTED_REGIONS = new Set(['africa', 'south_america']);

const isValidState = (s: LocalizationState): boolean =>
  SUPPORTED_CURRENCIES.has(s.currency) &&
  SUPPORTED_COUNTRIES.has(s.country) &&
  SUPPORTED_REGIONS.has(s.region);

const detectUserLocale = (): LocalizationState => {
  const lang = navigator.language || 'en-US';
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

  const tzCountryMap: Record<string, string> = {
    'America/Sao_Paulo': 'BR', 'America/Fortaleza': 'BR', 'America/Recife': 'BR',
    'America/Bahia': 'BR', 'America/Belem': 'BR', 'America/Manaus': 'BR',
    'Africa/Maputo': 'MZ',
  };

  const langCountryMap: Record<string, string> = {
    'pt-BR': 'BR', 'pt-MZ': 'MZ', 'pt': 'BR',
  };

  const detectedCode = tzCountryMap[tz] || langCountryMap[lang] || 'MZ';
  const country = countries.find(c => c.code === detectedCode) || countries.find(c => c.code === 'MZ')!;

  return {
    currency: country.currency,
    country: country.code,
    region: country.region,
  };
};

export const useLocalization = () => {
  const { i18n } = useTranslation();

  const [state, setState] = useState<LocalizationState>(() => {
    if (typeof window === 'undefined') return { currency: 'MZN', country: 'MZ', region: 'africa' };

    // Clean up old storage key
    localStorage.removeItem(OLD_STORAGE_KEY);

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (isValidState(parsed)) return parsed;
      } catch { /* fall through */ }
    }

    return detectUserLocale();
  });

  useEffect(() => {
    const stored = localStorage.getItem('statusads_language');
    if (!stored) {
      const lang = navigator.language || 'en-US';
      const supported = ['pt-BR', 'en-US', 'es-ES'];
      const match = supported.find(s => lang.startsWith(s.split('-')[0]));
      if (match) i18n.changeLanguage(match);
    }
  }, [i18n]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setCurrency = useCallback((currencyCode: string) => {
    if (!SUPPORTED_CURRENCIES.has(currencyCode)) return;
    setState(prev => ({ ...prev, currency: currencyCode }));
  }, []);

  const setCountry = useCallback((countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      setState({
        country: countryCode,
        region: country.region,
        currency: country.currency,
      });
    }
  }, []);

  const setRegion = useCallback((regionCode: string) => {
    if (!SUPPORTED_REGIONS.has(regionCode)) return;
    setState(prev => ({ ...prev, region: regionCode }));
  }, []);

  const format = useCallback((amount: number): string => {
    const currency = currencies.find(c => c.code === state.currency);
    return formatCurrency(amount, state.currency, currency?.locale || 'en-US');
  }, [state.currency]);

  const getCurrentCurrency = useCallback((): Currency | undefined => {
    return currencies.find(c => c.code === state.currency);
  }, [state.currency]);

  const getCurrentCountry = useCallback((): Country | undefined => {
    return countries.find(c => c.code === state.country);
  }, [state.country]);

  return {
    currency: state.currency,
    country: state.country,
    region: state.region,
    setCurrency,
    setCountry,
    setRegion,
    format,
    getCurrentCurrency,
    getCurrentCountry,
    currencies,
    countries,
  };
};
