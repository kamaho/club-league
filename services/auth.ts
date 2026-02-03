import { User, UserRole } from '../types';
import { db } from './db';

const STORAGE_KEY = 'club_league_user_id';

export const authService = {
  login: (email: string): User | undefined => {
    const user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      localStorage.setItem(STORAGE_KEY, user.id);
      return user;
    }
    return undefined;
  },

  register: (data: Partial<User> & { password?: string }): User => {
    // In a real app, this would validate with backend and hash password
    
    const newUser: User = {
        id: `u-${Math.random().toString(36).substr(2, 9)}`,
        name: data.name || 'New Player',
        email: data.email || '',
        role: UserRole.PLAYER,
        clubId: data.clubId || 'club-1',
        utr: data.utr || 1.0,
        avatarUrl: data.avatarUrl,
        preferences: data.preferences || {
            matchFrequency: '1_per_2_weeks',
            opponentGender: 'both',
            availability: {},
            skipNextRound: false
        }
    };
    
    // Push to mock DB (in memory only for this demo)
    const users = db.getUsers();
    users.push(newUser);
    
    localStorage.setItem(STORAGE_KEY, newUser.id);
    return newUser;
  },

  loginWithProvider: (_provider: 'google' | 'apple'): Promise<User> => {
      // Mock async SSO
      return new Promise((resolve) => {
          setTimeout(() => {
            const user = db.getUsers()[0]; // Just return admin for demo
            localStorage.setItem(STORAGE_KEY, user.id);
            resolve(user);
          }, 1000);
      });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  getCurrentUser: (): User | undefined => {
    const id = localStorage.getItem(STORAGE_KEY);
    if (!id) return undefined;
    
    // Handle case where mock data reset but ID persists
    const user = db.getUser(id);
    if (!user) {
        localStorage.removeItem(STORAGE_KEY);
        return undefined;
    }
    return user;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(STORAGE_KEY);
  }
};