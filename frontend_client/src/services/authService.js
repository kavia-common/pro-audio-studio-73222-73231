const STORAGE_KEY = 'demo-auth-user';

/**
 * Simple localStorage-based auth service placeholder.
 * Replace with real API integration. Uses email as ID.
 */
const authService = {
  // PUBLIC_INTERFACE
  async login(email, password) {
    const user = { id: email, email };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },
  // PUBLIC_INTERFACE
  async signup(email, password) {
    const user = { id: email, email };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },
  // PUBLIC_INTERFACE
  async logout() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
  // PUBLIC_INTERFACE
  async getCurrentUser() {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }
};

export default authService;
