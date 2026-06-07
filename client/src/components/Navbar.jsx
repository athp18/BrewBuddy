import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Coffee, Map, User, LogOut, Sparkles, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { dark, toggle } = useDarkMode();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLink = (to, icon, label) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors
          ${active
            ? 'text-espresso-500 dark:text-espresso-300'
            : 'text-espresso-300 hover:text-espresso-400 dark:text-espresso-500 dark:hover:text-espresso-300'}`}
      >
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-night/90 backdrop-blur-sm border-b border-cream-200 dark:border-night-border h-14 flex items-center px-5">
        <Link to="/" className="flex items-center gap-2 mr-auto">
          <Coffee size={22} className="text-espresso-400" strokeWidth={1.8} />
          <span className="font-display text-lg font-semibold text-roast-mid dark:text-cream-200">BrewBuddy</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-espresso-300 dark:text-espresso-400 hover:text-espresso-500 hover:bg-cream-100 dark:hover:bg-night-raised transition-colors"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user && (
            <>
              <span className="text-sm text-espresso-400 hidden sm:block">{user.name}</span>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-espresso-300 dark:text-espresso-400 hover:text-espresso-500 hover:bg-cream-100 dark:hover:bg-night-raised transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Bottom nav (mobile-style) */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-night/95 backdrop-blur-sm border-t border-cream-200 dark:border-night-border flex justify-around items-center py-2 px-4">
          {navLink('/', <Sparkles size={20} strokeWidth={1.8} />, 'Feed')}
          {navLink('/discover', <Map size={20} strokeWidth={1.8} />, 'Discover')}
          {navLink('/profile', <User size={20} strokeWidth={1.8} />, 'Profile')}
        </nav>
      )}
    </>
  );
};

export default Navbar;
