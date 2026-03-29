import { NavLink } from 'react-router-dom'

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16l3-1.5L10 20l3-1.5 3 1.5 3-1.5L22 20V8zM14 2v6h6" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
      <circle cx="5" cy="7" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="5" cy="17" r="1.5" />
      <path d="M9 7h10M9 12h10M9 17h10" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="nav-icon" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="fab-icon" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function Nav() {
  const navClass = ({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <NavLink to="/" className={navClass}>
        <HomeIcon />
        <span>Home</span>
      </NavLink>
      <NavLink to="/receipts" className={navClass}>
        <ReceiptIcon />
        <span>Receipts</span>
      </NavLink>
      <NavLink to="/upload" className="fab-link" aria-label="Upload receipt">
        <PlusIcon />
      </NavLink>
      <NavLink to="/items" className={navClass}>
        <ListIcon />
        <span>Items</span>
      </NavLink>
      <NavLink to="/profile" className={navClass}>
        <ProfileIcon />
        <span>Profile</span>
      </NavLink>
    </nav>
  )
}

export default Nav
