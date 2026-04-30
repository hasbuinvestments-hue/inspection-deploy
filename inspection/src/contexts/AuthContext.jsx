import React, { useState, useEffect } from 'react';
import { apiFetch, setTokens, clearTokens } from '../lib/api';
import { logError, setLoggerUserContext } from '../lib/logger';
import { AuthContext } from './AuthContextStore';

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        const pData = await apiFetch('/users/me/');
        if (!isMounted) return;
        setProfile(pData);
        setLoggerUserContext(pData);
      } catch (error) {
        if (!isMounted) return;
        setProfile(null);
        setLoggerUserContext(null);
        // It's normal to fail if we have no token, so we just log silently
        // console.error('[AuthContext] Initial session load failed:', error.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (staffIdOrEmail, password) => {
    try {
      let email = staffIdOrEmail.trim();

      if (!email.includes('@')) {
        const resolveRes = await apiFetch('/users/resolve-email/', {
            method: 'POST',
            body: JSON.stringify({ email: email })
        });
        if (resolveRes && resolveRes.email) {
            email = resolveRes.email;
        } else {
            throw new Error('Staff ID not found or not linked to a login email.');
        }
      }

      const data = await apiFetch('/token/', {
        method: 'POST',
        body: JSON.stringify({ email: email, password: password })
      });
      
      setTokens(data.access, data.refresh);

      const profileData = await apiFetch('/users/me/');

      if (profileData.status !== 'active') {
        clearTokens();
        throw new Error('Your account is inactive. Contact the administrator.');
      }

      setProfile(profileData);
      setLoggerUserContext(profileData);
      return profileData;
    } catch (error) {
      logError(error, {
        source: 'auth.login',
        metadata: { identifier: staffIdOrEmail }
      });
      throw error;
    }
  };

  const logout = async () => {
    clearTokens();
    setProfile(null);
    setLoggerUserContext(null);
  };

  return (
    <AuthContext.Provider value={{ profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
