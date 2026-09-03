import { useCallback, useEffect, useState } from 'react'

/**
 * Sistema de temas seleccionáveis (estilo Calorist "Themes").
 * Cada tema muda a cor de destaque (acento) da app inteira via
 * data-theme no <html> — as CSS vars fazem o resto.
 *
 * Temas: gold (StatusAds dourado) · mint · lavanda · mono · coral
 */

export type ThemeSlug = 'gold' | 'mint' | 'lavanda' | 'mono' | 'coral'

export interface ThemeDef {
  slug: ThemeSlug
  name: string
  description: string
  /** Cor de amostra para o cartão do seletor */
  swatch: string
  /** Cor para a meta theme-color do browser */
  metaColor: string
}

export const THEMES: ThemeDef[] = [
  { slug: 'gold',    name: 'Dourado',  description: 'Identidade StatusAds',    swatch: '#D4AF37', metaColor: '#D4AF37' },
  { slug: 'mint',    name: 'Menta',    description: 'Fresco e discreto',       swatch: '#10B981', metaColor: '#0B3B2E' },
  { slug: 'lavanda', name: 'Lavanda',  description: 'Moderno e calmo',         swatch: '#8B5CF6', metaColor: '#221A3F' },
  { slug: 'mono',    name: 'Mono',     description: 'Preto e branco puro',     swatch: '#F5F5F4', metaColor: '#09090B' },
  { slug: 'coral',   name: 'Coral',    description: 'Energia e alerta',        swatch: '#F43F5E', metaColor: '#3F0A16' },
]

const STORAGE_KEY = 'statusads-theme'
const VALID = new Set(THEMES.map(t => t.slug))

function readStored(): ThemeSlug {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return VALID.has(v as ThemeSlug) ? (v as ThemeSlug) : 'gold'
  } catch {
    return 'gold'
  }
}

function applyTheme(slug: ThemeSlug) {
  const el = document.documentElement
  if (slug === 'gold') {
    el.removeAttribute('data-theme')
  } else {
    el.setAttribute('data-theme', slug)
  }
  const def = THEMES.find(t => t.slug === slug)
  if (def) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', def.metaColor)
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeSlug>(() => readStored())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((slug: ThemeSlug) => {
    if (!VALID.has(slug)) return
    try {
      localStorage.setItem(STORAGE_KEY, slug)
    } catch {
      /* storage indisponível — aplica só em memória */
    }
    setThemeState(slug)
  }, [])

  const current = THEMES.find(t => t.slug === theme) ?? THEMES[0]

  return { theme, setTheme, current, themes: THEMES }
}
