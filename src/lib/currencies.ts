export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export interface Country {
  code: string;
  name: string;
  nameEn: string;
  currency: string;
  region: string;
  flag: string;
}

export const currencies: Currency[] = [
  { code: 'MZN', symbol: 'MT', name: 'Metical Moçambicano', locale: 'pt-MZ' },
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro', locale: 'pt-BR' },
];

export const countries: Country[] = [
  { code: 'MZ', name: 'Moçambique', nameEn: 'Mozambique', currency: 'MZN', region: 'africa', flag: '🇲🇿' },
  { code: 'BR', name: 'Brasil', nameEn: 'Brazil', currency: 'BRL', region: 'south_america', flag: '🇧🇷' },
];

export const regions = [
  { code: 'africa', name: 'África', nameEn: 'Africa' },
  { code: 'south_america', name: 'América do Sul', nameEn: 'South America' },
];

export const formatCurrency = (
  amount: number,
  currencyCode: string = 'MZN',
  locale: string = 'pt-MZ'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const getCurrencyByCode = (code: string): Currency | undefined => {
  return currencies.find(c => c.code === code);
};

export const getCountryByCode = (code: string): Country | undefined => {
  return countries.find(c => c.code === code);
};

export const getCountriesByRegion = (regionCode: string): Country[] => {
  return countries.filter(c => c.region === regionCode);
};
