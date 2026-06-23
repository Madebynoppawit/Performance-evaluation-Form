// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import { Inbox } from 'lucide-react'
import EmptyState from './EmptyState'

afterEach(cleanup)

describe('<EmptyState>', () => {
  it('renders the title and description', () => {
    render(<EmptyState icon={Inbox} title="No evaluations" description="Nothing here yet" />)
    expect(screen.getByText('No evaluations')).toBeInTheDocument()
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('renders no action when none is provided', () => {
    render(<EmptyState icon={Inbox} title="t" description="d" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('fires the onClick action button', async () => {
    const onClick = vi.fn()
    render(<EmptyState icon={Inbox} title="t" description="d" action={{ label: 'Retry', onClick }} />)
    await userEvent.click(screen.getByRole('button', { name: /Retry/ }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a link action pointing at the target route', () => {
    render(
      <MemoryRouter>
        <EmptyState icon={Inbox} title="t" description="d" action={{ label: 'Go to evaluations', to: '/evaluations' }} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Go to evaluations/ })).toHaveAttribute('href', '/evaluations')
  })
})
