import { Outlet } from 'react-router-dom'
import ShellBar from './ShellBar'
import SideNav from './SideNav'

export default function Layout() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--kbt-bg)' }}>
      <ShellBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <SideNav />
        <main style={{
          flex: 1, overflowY: 'auto', padding: '24px',
          background: `radial-gradient(circle at 20% 20%, rgba(0,200,122,0.03) 0%, transparent 50%),
                       radial-gradient(circle at 80% 80%, rgba(59,130,246,0.03) 0%, transparent 50%),
                       var(--kbt-bg)`,
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
