/**
 * DEV-245: Token efímero para autenticación en redes de área local (LAN).
 * Almacena en sessionStorage el token recibido en la URL inicial (?token=...)
 * y lo provee para cabeceras HTTP y conexiones SSE.
 */

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken && urlToken.trim()) {
      const cleanToken = urlToken.trim();
      window.sessionStorage.setItem('gripm_token', cleanToken);
      return cleanToken;
    }
    return window.sessionStorage.getItem('gripm_token');
  } catch {
    return null;
  }
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getStoredToken();
  if (token) {
    return { ...extraHeaders, 'X-Gripm-Token': token };
  }
  return extraHeaders;
}
