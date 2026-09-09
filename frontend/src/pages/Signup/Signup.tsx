import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Chrome } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { signupApi } from '../../services/api';
import { useApp } from '../../context/AppContext';

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { setAuthSession } = useApp();
  const navigate = useNavigate();

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
      const res = await signupApi(name, email, password);
      setAuthSession(res.access_token, res.refresh_token, res.user);
      setIsLoading(false);
      navigate('/onboarding');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'Signup failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#090a0f] flex items-center justify-center p-4 selection:bg-purple-500 selection:text-white relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl border border-white/10 bg-[#12141d]/90 backdrop-blur-2xl shadow-2xl shadow-purple-950/50 overflow-hidden"
      >
        {/* Left Form */}
        <div className="p-8 md:p-10 flex flex-col justify-between space-y-6">
          <div>
            <NavLink to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-lg text-white">Growth<span className="text-gradient">OS</span></span>
            </NavLink>

            <h2 className="text-2xl font-bold text-white">Create Your Account</h2>
            <p className="text-xs text-slate-400 mt-1">Start curating your future self in under 2 minutes.</p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                  placeholder="Alex Rivera"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                  placeholder="alex@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                  placeholder="••••••••••••"
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
              Sign Up & Create Identity
            </Button>
          </form>

          <div className="space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#12141d] px-3 text-[10px] uppercase font-bold text-slate-500">Or continue with</span>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
            >
              <Chrome className="w-4 h-4 text-red-400" /> Continue with Google
            </button>

            <p className="text-center text-xs text-slate-400">
              Already have an account?{' '}
              <NavLink to="/login" className="text-purple-400 font-bold hover:underline">
                Sign In
              </NavLink>
            </p>
          </div>
        </div>

        {/* Right Info */}
        <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-black border-l border-white/10">
          <div className="space-y-4">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold rounded-full uppercase border border-indigo-500/30">
              Why GrowthOS?
            </span>
            <h3 className="text-2xl font-extrabold text-white">Your Personal AI Growth Strategist</h3>

            <div className="space-y-3 pt-4 text-xs text-slate-300">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Identity Twin Engine</strong> maps your current vs dream self in real time.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>MongoDB Atlas Cloud DB</strong> securely manages your user profile, skills, and memory states.</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>ML Risk Guard</strong> protects you against burnout & cognitive fatigue.</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
