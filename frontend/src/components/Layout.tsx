import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import ShellBar from './ShellBar'
import SideNav from './SideNav'
import CommandPalette from './CommandPalette'
import RouteFallback from './RouteFallback'
import TopProgressBar from './TopProgressBar'
import { useCardSpotlight } from '@/hooks/useCardSpotlight'

export default function Layout() {
  const location = useLocation()
  useCardSpotlight()
  return (
    <div className="amw-app-shell">
      <div className="amw-aurora" aria-hidden="true" />
      <TopProgressBar />
      <ShellBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <SideNav />
        <main className="amw-app-main">
          {/* Suspense here keeps the header + sidebar mounted while a
              lazy page chunk loads — only the content area shows the fallback. */}
          <Suspense fallback={<RouteFallback />}>
            <div key={location.pathname} className="amw-route-view">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
