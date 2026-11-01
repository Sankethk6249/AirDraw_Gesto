import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/studio', label: 'Studio' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300' : 'text-slate-600 hover:bg-slate-500/10 dark:text-slate-300'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-[#070b17]/60">
      <nav className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 sm:px-6" aria-label="Main">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold" onClick={() => setOpen(false)}>
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          AirDraw
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>)}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={toggle} className="btn-ghost !px-2.5" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/studio?camera=1" className="btn-primary hidden sm:inline-flex">Start Drawing</Link>
          <button type="button" className="btn-ghost !px-2.5 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="flex flex-col gap-1 border-t border-slate-200/60 px-4 py-3 dark:border-white/10 md:hidden">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} onClick={() => setOpen(false)}>{l.label}</NavLink>
          ))}
          <Link to="/studio?camera=1" className="btn-primary mt-1" onClick={() => setOpen(false)}>Start Drawing</Link>
        </div>
      )}
    </header>
  );
}