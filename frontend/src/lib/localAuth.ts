export const LOCAL_AUTH_KEY = 'datapilot.localAuth.v1';

export function isLocalAuthenticated(): boolean {
  try {
    return localStorage.getItem(LOCAL_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setLocalAuthenticated(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(LOCAL_AUTH_KEY, 'true');
    } else {
      localStorage.removeItem(LOCAL_AUTH_KEY);
    }
  } catch {
    // ignore storage failures; route guards will keep the app protected
  }
}
