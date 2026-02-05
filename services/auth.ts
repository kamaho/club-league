import { User, UserRole } from '../types';
import { getApiUrl, setToken, getToken, fetchApi } from './api';
import { mockDb } from './db';

const STORAGE_KEY = 'club_league_user_id';
const USER_KEY = 'club_league_user';

function useApi(): boolean {
  return !!getApiUrl();
}

export const authService = {
  login: async (email: string, password?: string): Promise<User | undefined> => {
    if (useApi()) {
      if (!password) return undefined;
      try {
        const res = await fetchApi<{ user: User; token: string }>('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        setToken(res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        return res.user;
      } catch {
        return undefined;
      }
    }
    const users = mockDb.getUsers();
    const user = users.find((u: User) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      localStorage.setItem(STORAGE_KEY, user.id);
      return user;
    }
    return undefined;
  },

  register: async (data: Partial<User> & { password?: string }): Promise<User> => {
    if (useApi()) {
      const res = await fetchApi<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: {
          email: data.email,
          password: data.password,
          name: data.name,
          phone: data.phone,
          clubId: data.clubId,
          utr: data.utr,
          preferences: data.preferences,
        },
      });
      setToken(res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      return res.user;
    }
    const newUser: User = {
      id: `u-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name || 'New Player',
      email: data.email || '',
      phone: data.phone,
      role: UserRole.PLAYER,
      clubId: data.clubId || 'club-1',
      utr: data.utr || 1.0,
      avatarUrl: data.avatarUrl,
      preferences: data.preferences || {
        matchFrequency: '1_per_2_weeks',
        opponentGender: 'both',
        availability: {},
        skipNextRound: false,
      },
    };
    const usersList = mockDb.getUsers();
    usersList.push(newUser);
    localStorage.setItem(STORAGE_KEY, newUser.id);
    return newUser;
  },

  loginWithProvider: (_provider: 'google' | 'apple'): Promise<User> => {
    if (useApi()) {
      return Promise.reject(new Error('SSO not implemented for API'));
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        const u = mockDb.getUsers()[0];
        localStorage.setItem(STORAGE_KEY, u.id);
        resolve(u);
      }, 1000);
    });
  },

  logout: () => {
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser: (): User | undefined => {
    if (useApi()) {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as User;
      } catch {
        return undefined;
      }
    }
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) return undefined;
    const u = mockDb.getUser(id);
    if (!u) {
      localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return u;
  },

  isAuthenticated: (): boolean => {
    if (useApi()) return !!getToken();
    return !!localStorage.getItem(STORAGE_KEY);
  },
};
