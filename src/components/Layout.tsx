import { Outlet, NavLink } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-yellow-400 font-bold text-xl">🪙 Metals Tracker</span>
          <div className="flex gap-6">
            {[
              { to: '/', label: 'Dashboard' },
              { to: '/collection', label: 'Collection' },
              { to: '/pieces/new', label: '+ Add Piece' },
              { to: '/settings', label: 'Settings' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  isActive
                    ? 'text-yellow-400 font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
