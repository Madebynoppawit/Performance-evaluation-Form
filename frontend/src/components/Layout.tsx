import { Outlet } from 'react-router-dom'
import ShellBar from './ShellBar'
import SideNav from './SideNav'

export default function Layout() {
  return (
    <div className="amw-app-shell">
      <ShellBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <SideNav />
        <main className="amw-app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
