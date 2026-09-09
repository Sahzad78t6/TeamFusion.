import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, ArrowRight, Github, Chrome, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { loginApi, claimAuthTicketApi } from '../../services/api';
import { useApp } from '../../context/AppContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { authToken, setAuthSession, isExchangingTicket } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (authToken && !isExchangingTicket) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const authError = searchParams.get('auth_error');
    if (authError) {
      setErrorMessage(decodeURIComponent(authError));
    }
  }, [authToken, isExchangingTicket, searchParams, navigate]);

  const handleGoogleLogin = () => {
    const googleClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
    const isDev = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
    const redirectUri = (import.meta as any).env?.VITE_GOOGLE_REDIRECT_URI || 'https://teamfusion-1.onrender.com';
    const state = isDev ? 'dev' : 'prod';

    if (googleClientId) {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        googleClientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${encodeURIComponent(
        'openid email profile'
      )}&state=${encodeURIComponent(state)}&prompt=select_account`;
      window.location.href = authUrl;
    } else {
      // Seamless fallback to backend Google OAuth initiation route
      const backendUrl = (import.meta as any).env?.VITE_API_URL || 'https://teamfusion-1.onrender.com';
      const cleanBackendUrl = backendUrl.replace(/\/api\/?$/, '');
      window.location.href = `${cleanBackendUrl}/auth/google/login?state=${state}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginApi(email, password);
      setAuthSession(res.access_token, res.refresh_token, res.user);
      setIsLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Login failed. Invalid email or password.');
    }
  };

  if (isExchangingTicket) {
    return (
      <div className="min-h-screen w-screen bg-[#090a0f] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Authenticating GrowthOS Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-[#090a0f] flex items-center justify-center p-4 selection:bg-purple-500 selection:text-white relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl border border-white/10 bg-[#12141d]/90 backdrop-blur-2xl shadow-2xl shadow-purple-950/50 overflow-hidden"
      >
        {/* Left Form Side */}
        <div className="p-8 md:p-10 flex flex-col justify-between space-y-6">
          <div>
            <NavLink to="/" className="inline-flex items-center gap-2 mb-8">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-lg text-white">Growth<span className="text-gradient">OS</span></span>
            </NavLink>

            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-xs text-slate-400 mt-1">Sign in to resume your AI growth trajectory.</p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">Password</label>
                <a href="#" className="text-purple-400 hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="glow"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Dashboard
            </Button>
          </form>

          <div className="space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#12141d] px-3 text-[10px] uppercase font-bold text-slate-500">Or continue with</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 transition-colors">
                <Github className="w-4 h-4" /> GitHub
              </button>
              <button 
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                <Chrome className="w-4 h-4 text-red-400" /> Google
              </button>
            </div>

            <p className="text-center text-xs text-slate-400">
              Don't have an account?{' '}
              <NavLink to="/signup" className="text-purple-400 font-bold hover:underline">
                Sign Up
              </NavLink>
            </p>
          </div>
        </div>

        {/* Right Showcase Art */}
        <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-black border-l border-white/10 relative overflow-hidden">
          <div className="space-y-4 z-10">
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-[10px] font-extrabold rounded-full uppercase border border-purple-500/30">
              Identity Twin AI 2.0
            </span>
            <h3 className="text-2xl font-extrabold text-white leading-snug">
              "GrowthOS transformed my career trajectory in 90 days."
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Our autonomous AI agents continuously align your daily tasks, learning resources, and hackathons with your dream role.
            </p>
          </div>

          <div className="z-10 pt-8 border-t border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-white font-bold">
              AR
            </div>
            <div>
              <p className="text-xs font-bold text-white">Alex Rivera</p>
              <p className="text-[10px] text-slate-400">Principal AI Architect</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
