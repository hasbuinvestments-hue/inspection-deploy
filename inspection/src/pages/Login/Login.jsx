import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import nairobiLogo from '/nairobi_logo.png';
import loginBg from '/login_bg.png';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      const routes = {
        pho: '/pho',
        nccg_inspector: '/nccg',
        finance_manager: '/finance',
        admin: '/admin',
        super_admin: '/superadmin'
      };
      if (routes[profile.role]) {
        navigate(routes[profile.role], { replace: true });
      }
    }
  }, [profile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const loggedInProfile = await login(identifier, password);
      const routes = {
        pho: '/pho',
        nccg_inspector: '/nccg',
        finance_manager: '/finance',
        admin: '/admin',
        super_admin: '/superadmin'
      };
      if (loggedInProfile && routes[loggedInProfile.role]) {
        navigate(routes[loggedInProfile.role], { replace: true });
      }
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden font-outfitSelection">
      {/* Immersive Background */}
      <div 
        className="absolute inset-0 z-0 scale-105 animate-subtle-zoom"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.4)'
        }}
      />
      
      {/* Animated Gradient Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-900/60 via-transparent to-emerald-900/40" />

      {/* Login Container */}
      <div className="relative z-20 w-full max-w-md px-6 lg:px-0 fade-in-up">
        <div className="text-center mb-6">
          <div className="relative inline-block group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <img src={nairobiLogo} alt="Nairobi City County" className="relative h-16 w-auto mb-4 transition-transform duration-500 hover:scale-105" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter sm:text-3xl drop-shadow-2xl">
            System <span className="text-emerald-400">Login</span>
          </h1>
          <p className="mt-2 text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-[0.2em] opacity-80">
            Integrated Pest Control Management
          </p>
        </div>

        {/* Glassmorphism Card */}
        <div className="backdrop-blur-xl bg-white/10 p-6 sm:p-8 rounded-[2rem] border border-white/20 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-500/20 border border-rose-500/50 backdrop-blur-md rounded-xl p-3 text-xs text-rose-200 text-center animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative group">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5 block ml-1">Staff Access</label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email or Staff ID"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-300 text-base group-hover:bg-white/10"
                />
              </div>

              <div className="relative group">
                <label className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1.5 block ml-1">Secure Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-300 text-base group-hover:bg-white/10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded-lg border-white/20 bg-white/5 text-emerald-500 focus:ring-offset-slate-900" />
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">Remember device</span>
              </label>
              <a href="#" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                Help?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-4 px-6 rounded-2xl font-black text-base tracking-widest uppercase transition-all duration-300 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                color: '#0f172a',
                boxShadow: '0 0 0 2px #f59e0b, 0 8px 30px rgba(245, 158, 11, 0.5)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authorizing...
                </span>
              ) : 'Enter Dashboard'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-500 font-medium">
              &copy; {new Date().getFullYear()} Nairobi City County. All rights reserved.
            </p>
          </div>
        </div>

        {/* Support Pill */}
        <div className="mt-6 flex justify-center animate-bounce-slow">
           <div className="bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">IT SUPPORT: (020) 2224281</span>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes subtle-zoom {
          from { transform: scale(1.05); }
          to { transform: scale(1.15); }
        }
        .animate-subtle-zoom {
          animation: subtle-zoom 20s ease-in-out infinite alternate;
        }
        .animate-bounce-slow {
          animation: bounce 4s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50% { transform: translateY(0); animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
        .fade-in-up {
          animation: fadeInUp 1s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}} />
    </div>
  );
}

