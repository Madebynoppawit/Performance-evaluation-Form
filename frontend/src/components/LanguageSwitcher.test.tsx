// @vitest-environment jsdom
import { afterEach, describe, it, expect } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import LanguageSwitcher from './LanguageSwitcher'

afterEach(() => { cleanup(); localStorage.clear() })

const renderSwitcher = () =>
  render(
    <LanguageProvider>
      <LanguageSwitcher />
    </LanguageProvider>,
  )

describe('<LanguageSwitcher>', () => {
  it('renders one button per supported locale (EN/TH/FR)', () => {
    renderSwitcher()
    for (const label of ['EN', 'TH', 'FR']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('marks the clicked locale active and sets <html lang>', async () => {
    renderSwitcher()
    const th = screen.getByRole('button', { name: 'TH' })
    await userEvent.click(th)
    expect(th).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.lang).toBe('th')
  })

  it('switches the active locale between buttons', async () => {
    renderSwitcher()
    const fr = screen.getByRole('button', { name: 'FR' })
    const en = screen.getByRole('button', { name: 'EN' })
    await userEvent.click(fr)
    expect(fr).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(en)
    expect(en).toHaveAttribute('aria-pressed', 'true')
    expect(fr).toHaveAttribute('aria-pressed', 'false')
  })
})
