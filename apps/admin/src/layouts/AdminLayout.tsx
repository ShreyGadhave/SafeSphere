import { NavLink, Outlet, useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/app/auth/authContext'
import { Logo } from '@/components/brand/Logo'
import { cn } from '@/lib/cn'
import { useNavCounts } from '@/lib/queries'
import { navItems, type NavItem } from './navItems'

function CountPill({ countKey, counts }: { countKey: NonNullable<NavItem['countKey']>; counts?: Record<string, number> }) {
  const value = counts?.[countKey]
  if (!value) return null
  return countKey === 'activeSos' ? (
    <span className="rounded-[9px] bg-danger px-[7px] py-px text-xs font-extrabold text-white">{value}</span>
  ) : (
    <span className="text-xs font-bold text-ink-2">{value}</span>
  )
}

/**
 * Sidebar shell from the mockup. On screens below `lg` the sidebar becomes a
 * top bar with a horizontally scrolling nav so content keeps the full width.
 */
export function AdminLayout() {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const { data: counts } = useNavCounts()

  async function handleSignOut() {
    await signOut()
    navigate('/sign-in', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ground lg:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r border-hairline bg-card px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav aria-label="Admin" className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-control p-2.5 text-sm no-underline transition-colors',
                  isActive ? 'bg-subtle font-bold text-ink' : 'font-semibold text-ink-2 hover:bg-ground hover:text-ink',
                )
              }
            >
              <item.icon aria-hidden="true" size={19} strokeWidth={1.8} />
              <span className="flex-1">{item.label}</span>
              {item.countKey && <CountPill countKey={item.countKey} counts={counts} />}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          {profile && (
            <span className="truncate px-2.5 text-xs text-ink-3">
              {profile.full_name || 'Signed in'} · {profile.role}
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex items-center gap-2.5 rounded-control p-2.5 text-sm font-semibold text-ink-2 hover:bg-ground hover:text-ink"
          >
            <LogOut aria-hidden="true" size={19} strokeWidth={1.8} />
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-hairline bg-card/95 px-4 pt-4 pb-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <Logo />
          <button
            type="button"
            onClick={() => void handleSignOut()}
            aria-label="Sign out"
            className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-ground"
          >
            <LogOut aria-hidden="true" size={19} strokeWidth={1.8} />
          </button>
        </div>
        <nav aria-label="Admin" className="-mx-4 flex gap-2 overflow-x-auto px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[13px] no-underline',
                  isActive ? 'bg-ink font-bold text-white' : 'bg-subtle font-semibold text-ink-2',
                )
              }
            >
              <item.icon aria-hidden="true" size={16} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex min-w-0 flex-1 flex-col gap-[22px] px-4 pt-6 pb-10 sm:px-8 sm:pt-7">
        <Outlet />
      </main>
    </div>
  )
}
