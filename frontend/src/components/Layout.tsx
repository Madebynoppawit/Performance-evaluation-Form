import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ShellBar from './ShellBar'
import SideNav from './SideNav'
import CommandPalette from './CommandPalette'
import RouteFallback from './RouteFallback'
import TopProgressBar from './TopProgressBar'
import CorporateBar from './CorporateBar'
import CorporateFooter from './CorporateFooter'
import { useCardSpotlight } from '@/hooks/useCardSpotlight'
import { useSideNav } from './sideNavStore'

export default function Layout() {
  const location = useLocation()
  useCardSpotlight()
  const { open, setOpen } = useSideNav()

  return (
    <div className="amw-app-shell">
      <a href="#app-main" className="amw-skip-link">Skip to content</a>
      <div className="amw-aurora" aria-hidden="true" />
      <TopProgressBar />
      <ShellBar />
      {open && <div className="kbt-sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="amw-shell-body">
        <SideNav />
        <div className="amw-workspace-frame">
          <CorporateBar />
          <main id="app-main" className="amw-app-main">
            <Suspense fallback={<RouteFallback />}>
              <div key={location.pathname} className="amw-route-view">
                <Outlet />
              </div>
            </Suspense>
            <CorporateFooter />
          </main>
        </div>
      </div>
      <CommandPalette />
    </div>
  )
}
