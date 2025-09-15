// Safe authentication token utilities to prevent corruption issues

export function getSafeAuthToken(): string | null {
  try {
    const token = localStorage.getItem('authToken');
    
    // Handle null, undefined, or empty strings
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
      return null;
    }
    
    // Remove any stray quotes or whitespace that might have been added
    const cleanToken = token.trim().replace(/^["']|["']$/g, '');
    
    // Basic JWT format validation (should have 3 parts separated by dots)
    if (!cleanToken.includes('.') || cleanToken.split('.').length !== 3) {
      console.warn('Invalid JWT token format detected, clearing token');
      localStorage.removeItem('authToken');
      return null;
    }
    
    return cleanToken;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getSafeAuthToken();
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export function isTokenValid(): boolean {
  return getSafeAuthToken() !== null;
}