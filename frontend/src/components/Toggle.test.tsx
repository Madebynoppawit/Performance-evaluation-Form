// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import Toggle from './Toggle'

afterEach(cleanup) // unmount between tests so getByRole sees a single element

describe('<Toggle>', () => {
  it('renders an accessible switch that reflects the checked state', () => {
    render(<Toggle label="Email alerts" checked onChange={() => {}} />)
    const sw = screen.getByRole('switch', { name: 'Email alerts' })
    expect(sw).toBeInTheDocument()
    expect(sw).toHaveAttribute('aria-checked', 'true')
    expect(sw).toHaveClass('on')
  })

  it('is visually and semantically off when unchecked', () => {
    render(<Toggle label="Email alerts" checked={false} onChange={() => {}} />)
    const sw = screen.getByRole('switch', { name: 'Email alerts' })
    expect(sw).toHaveAttribute('aria-checked', 'false')
    expect(sw).not.toHaveClass('on')
  })

  it('calls onChange with the toggled value when clicked', async () => {
    const onChange = vi.fn()
    render(<Toggle label="Email alerts" checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('toggles back off from a checked state', async () => {
    const onChange = vi.fn()
    render(<Toggle label="Email alerts" checked onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
