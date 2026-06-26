/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Feather, 
  Menu, 
  X, 
  PlusCircle, 
  LayoutDashboard, 
  User, 
  LogOut, 
  ShieldCheck,
  Compass,
  BookOpen
} from 'lucide-react';

export default function Header() {
  const { profile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const baseStyles = "text-sm font-medium transition-all duration-200 cursor-pointer px-3 py-1.5 rounded-lg flex items-center gap-1.5";
  const activeStyles = "text-[#0f5132] bg-[#e8f5e9] font-semibold";
  const inactiveStyles = "text-gray-600 hover:text-[#0f5132] hover:bg-gray-50";

  return (
    <header className="sticky top-0 z-50 bg-[#faf9f6]/95 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full" id="app-header">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center gap-2 group cursor-pointer" id="brand-logo">
        <div className="bg-[#0f5132] text-[#faf9f6] p-2 rounded-xl transition-transform duration-300 group-hover:scale-105 shadow-md shadow-emerald-950/10">
          <Feather className="h-5 w-5" />
        </div>
        <span className="font-sans font-extrabold text-xl tracking-tight text-gray-900 group-hover:text-[#0f5132] transition-colors">
          SageInk
        </span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-2" id="desktop-nav">
        <Link 
          to="/" 
          className={`${baseStyles} ${isActive('/') ? activeStyles : inactiveStyles}`}
        >
          <Compass className="h-4 w-4" />
          Explore
        </Link>
        
        {profile ? (
          <>
            <Link 
              to="/create" 
              className={`${baseStyles} ${isActive('/create') ? activeStyles : inactiveStyles}`}
            >
              <PlusCircle className="h-4 w-4" />
              Write
            </Link>

            <Link 
              to="/dashboard" 
              className={`${baseStyles} ${isActive('/dashboard') ? activeStyles : inactiveStyles}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Cockpit
            </Link>

            <Link 
              to="/profile" 
              className={`${baseStyles} ${isActive('/profile') ? activeStyles : inactiveStyles}`}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>

            {isAdmin && (
              <Link 
                to="/admin" 
                className={`${baseStyles} ${isActive('/admin') ? "text-emerald-800 bg-[#e8efeb] font-semibold" : "text-emerald-700 hover:text-emerald-800 hover:bg-[#f0f5f2]"}`}
              >
                <ShieldCheck className="h-4 w-4" />
                Moderator
              </Link>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 ml-4">
            <Link 
              to="/login" 
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 cursor-pointer transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/register" 
              className="bg-[#0f5132] hover:bg-[#0c4028] text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-all duration-200 cursor-pointer"
            >
              Join Free
            </Link>
          </div>
        )}

        {profile && (
          <div className="flex items-center gap-4 border-l border-gray-100 pl-4 ml-2">
            <Link to="/profile" className="flex items-center gap-2 group">
              <img 
                src={profile.photoURL} 
                alt={profile.displayName} 
                className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-[#0f5132] transition-all"
                referrerPolicy="no-referrer"
              />
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-gray-800 leading-none group-hover:text-[#0f5132] transition-colors">{profile.displayName}</p>
                <p className="text-[10px] text-gray-400 capitalize">{isAdmin ? 'Admin' : 'Writer'}</p>
              </div>
            </Link>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </nav>

      {/* Mobile Menu Icon */}
      <div className="md:hidden flex items-center gap-4">
        {profile && (
          <Link to="/profile">
            <img 
              src={profile.photoURL} 
              alt={profile.displayName} 
              className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100"
              referrerPolicy="no-referrer"
            />
          </Link>
        )}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer text-gray-600"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="absolute top-16 left-0 w-full bg-[#faf9f6]/98 backdrop-blur-md border-b border-gray-200 shadow-xl py-4 px-6 md:hidden flex flex-col gap-3 transition-all">
          <Link 
            to="/" 
            onClick={() => setIsOpen(false)}
            className={`${baseStyles} ${isActive('/') ? activeStyles : inactiveStyles}`}
          >
            <Compass className="h-4 w-4" />
            Explore Feed
          </Link>

          {profile ? (
            <>
              <Link 
                to="/create" 
                onClick={() => setIsOpen(false)}
                className={`${baseStyles} ${isActive('/create') ? activeStyles : inactiveStyles}`}
              >
                <PlusCircle className="h-4 w-4" />
                Write Post
              </Link>

              <Link 
                to="/dashboard" 
                onClick={() => setIsOpen(false)}
                className={`${baseStyles} ${isActive('/dashboard') ? activeStyles : inactiveStyles}`}
              >
                <LayoutDashboard className="h-4 w-4" />
                My Cockpit
              </Link>

              <Link 
                to="/profile" 
                onClick={() => setIsOpen(false)}
                className={`${baseStyles} ${isActive('/profile') ? activeStyles : inactiveStyles}`}
              >
                <User className="h-4 w-4" />
                My Profile
              </Link>

              {isAdmin && (
                <Link 
                  to="/admin" 
                  onClick={() => setIsOpen(false)}
                  className={`${baseStyles} ${isActive('/admin') ? "text-emerald-800 bg-[#e8efeb]" : "text-emerald-700"}`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Moderator Space
                </Link>
              )}

              <div className="h-px bg-gray-100 my-2" />

              <button 
                onClick={() => { setIsOpen(false); handleLogout(); }}
                className={`${baseStyles} text-red-600 hover:bg-red-50 w-full`}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              <Link 
                to="/login" 
                onClick={() => setIsOpen(false)}
                className="w-full text-center border border-gray-300 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign In
              </Link>
              <Link 
                to="/register" 
                onClick={() => setIsOpen(false)}
                className="w-full text-center bg-[#0f5132] py-2.5 rounded-xl text-sm font-medium text-white shadow-sm hover:bg-[#0c4028]"
              >
                Join SageInk
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
