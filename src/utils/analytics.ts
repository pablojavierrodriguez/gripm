import { isSandboxMode } from '../data/detect.ts';

/**
 * DEV-358: Guardrail de telemetría y privacidad local-first.
 *
 * Gripm es una herramienta local-first para desarrolladores. Cuando se ejecuta
 * de forma local (mediante CLI, daemon o servidor de desarrollo), la telemetría
 * debe estar terminantemente inactiva (cero eventos enviados, cero llamadas externas).
 *
 * Vercel Web Analytics solo debe activarse si:
 * 1. La aplicación se encuentra en modo sandbox (isSandboxMode() === true, sin daemon local).
 * 2. El host no corresponde a localhost, loopback ni direcciones de red privadas.
 * 3. Se ejecuta en un despliegue web público de Vercel (ej. *.vercel.app) o dominio de producción.
 */
export function isAnalyticsAllowed(
  sandbox = isSandboxMode(),
  hostname = typeof window !== 'undefined' ? window.location.hostname : ''
): boolean {
  if (!sandbox || !hostname) {
    return false;
  }

  // Descartar localhost y loopbacks
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  ) {
    return false;
  }

  // Descartar rangos de IP privadas (RFC 1918 / LANs)
  if (
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    return false;
  }

  return true;
}
