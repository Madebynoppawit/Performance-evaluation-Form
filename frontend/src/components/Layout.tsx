import { Outlet, useLocation } from 'react-router-dom'
import ShellBar from './ShellBar'
import SideNav from './SideNav'
import CommandPalette from './CommandPalette'

export default function Layout() {
  const location = useLocation()
  return (
    <div className="amw-app-shell">
      <ShellBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <SideNav />
        <main className="amw-app-main">
          <div key={location.pathname} className="amw-route-view">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
