import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMeApi } from '../../services/api';
import { useApp } from '../../context/AppContext';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthSession } = useApp();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');

    if (!token || !refresh) {
      setError('Authentication failed: Missing session token parameters.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    getMeApi(token)
      .then((user) => {
        setAuthSession(token, refresh, user);
        if (user.onboarding_completed) {
          if (user.role === 'INSTITUTION_ADMIN') {
            navigate('/institution/overview', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          navigate('/onboarding', { replace: true });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch user session in AuthCallback:', err);
        setError(err.message || 'Failed to authenticate user session.');
        setTimeout(() => navigate('/login'), 2000);
      });
  }, [searchParams, navigate, setAuthSession]);

  return (
    <div className="min-h-screen w-screen bg-[#090a0f] flex items-center justify-center p-4 selection:bg-purple-500 selection:text-white">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        {error ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs">
            {error}
          </div>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Signing you in...</h2>
              <p className="text-xs text-slate-400">Authenticating your Google session with GrowthOS twin engine.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
