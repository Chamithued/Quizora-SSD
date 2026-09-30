frontend/src/context/AuthContext.js
import { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import api from '../services/api';
import { logoutSession } from '../services/logoutSession.mjs';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        user: null,
        token: null,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        error: null
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const initialized = useRef(false);

  useEffect(() => {
    // React StrictMode runs effects twice; completion cookies are single-use.
    if (initialized.current) return;
    initialized.current = true;
    const initAuth = async () => {
      const params = new URLSearchParams(window.location.search);
      if (window.location.pathname === '/login' && params.get('google') === 'complete') {
        window.history.replaceState({}, '', '/login');
        try {
          const { token, user } = await api.googleAuth('complete');
          localStorage.setItem('token', token);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
        } catch (error) {
          localStorage.removeItem('token');
          dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
        }
        return;
      }
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/profile');
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: response.user,
              token
            }
          });
        } catch (error) {
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        }
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response;
      
      localStorage.setItem('token', token);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      });
      
      return { success: true };
    } catch (error) {
      const message = error.message || 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      return { success: false, error: message };
    }
  };

  const logout = () => logoutSession(api, localStorage, () => {
    dispatch({ type: 'LOGOUT' });
  });

  const refreshProfile = async () => {
    const response = await api.get('/auth/profile');
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: response.user, token: localStorage.getItem('token') } });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    logout,
    refreshProfile,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
