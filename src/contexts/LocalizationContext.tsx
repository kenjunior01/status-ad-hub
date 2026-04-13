import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useLocalization } from '@/hooks/useLocalization';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { Currency, Country, currencies, countries, formatCurrency } from '@/lib/currencies';

interface LocalizationContextType {
  currency: string;
  country: string;
  region: string;
  setCurrency: (code: string) => void;
  setCountry: (code: string) => void;
  setRegion: (code: string) => void;
  format: (amount: number) => string;
  /** Format an amount that is stored in USD, converting to user's currency */
  formatFromUSD: (amountInUSD: number) => string;
  /** Convert amount from one currency to another */
  convert: (amount: number, from: string, to: string) => number;
  /** Get exchange rate between two currencies */
  getRate: (from: string, to: string) => number;
  getCurrentCurrency: () => Currency | undefined;
  getCurrentCountry: () => Country | undefined;
  currencies: Currency[];
  countries: Country[];
  ratesLoading: boolean;
}

const defaultContext: LocalizationContextType = {
  currency: 'MZN',
  country: 'MZ',
  region: 'africa',
  setCurrency: () => {},
  setCountry: () => {},
  setRegion: () => {},
  format: (amount: number) => formatCurrency(amount, 'MZN', 'pt-MZ'),
  formatFromUSD: (amount: number) => formatCurrency(amount, 'MZN', 'pt-MZ'),
  convert: (amount: number) => amount,
  getRate: () => 1,
  getCurrentCurrency: () => currencies.find(c => c.code === 'MZN'),
  getCurrentCountry: () => countries.find(c => c.code === 'MZ'),
  currencies,
  countries,
  ratesLoading: false,
};

const LocalizationContext = createContext<LocalizationContextType>(defaultContext);

export const LocalizationProvider = ({ children }: { children: ReactNode }) => {
  const localization = useLocalization();
  const { convert, getRate, loading: ratesLoading } = useExchangeRates();

  const formatFromUSD = useMemo(() => {
    return (amountInUSD: number): string => {
      const converted = convert(amountInUSD, 'USD', localization.currency);
      return localization.format(converted);
    };
  }, [convert, localization.currency, localization.format]);

  const value = useMemo<LocalizationContextType>(() => ({
    ...localization,
    formatFromUSD,
    convert,
    getRate,
    ratesLoading,
  }), [
    localization.currency,
    localization.country,
    localization.region,
    localization.format,
    localization.setCurrency,
    localization.setCountry,
    localization.setRegion,
    localization.getCurrentCurrency,
    localization.getCurrentCountry,
    formatFromUSD,
    convert,
    getRate,
    ratesLoading,
  ]);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalizationContext = () => useContext(LocalizationContext);
