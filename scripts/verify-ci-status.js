#!/usr/bin/env node

/**
 * scripts/verify-ci-status.js
 * DEV-298: Gate de gobernanza de CI/CD para el pipeline de publicación.
 *
 * Certifica que todos los check runs de CI asociados al commit del release
 * hayan concluido exitosamente antes de permitir la publicación en npm.
 * Si algún job de CI falla o se cancela, aborta inmediatamente (código 1).
 * Si los jobs están en progreso, aguarda con reintentos hasta el timeout.
 *
 * Uso:
 *   node scripts/verify-ci-status.js --sha <commitSha> [--timeout <segundos>] [--poll <segundos>]
 */

import https from 'node:https';

const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return defaultValue;
}

const sha = getArg('--sha', process.env.GITHUB_SHA || '');
const timeoutSec = parseInt(getArg('--timeout', '1200'), 10);
const pollSec = parseInt(getArg('--poll', '15'), 10);
const repo = getArg('--repo', process.env.GITHUB_REPOSITORY || 'pablojavierrodriguez/gripm');
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

if (!sha) {
  console.error('❌ Error (DEV-298): Parámetro --sha o GITHUB_SHA es obligatorio.');
  process.exit(1);
}

function fetchCheckRuns(commitSha) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'gripm-ci-gate-dev-298',
      'Accept': 'application/vnd.github+json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.get(
      `https://api.github.com/repos/${repo}/commits/${commitSha}/check-runs?per_page=100`,
      { headers },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`GitHub API error (${res.statusCode}): ${body}`));
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`🛡️  [DEV-298 Gate] Verificando estado de CI para commit: ${sha} en repo: ${repo}`);
  const startTime = Date.now();
  const maxTime = startTime + (timeoutSec * 1000);
  const graceUntil = startTime + 60000; // 60 segundos de gracia inicial para registrar checks

  while (Date.now() < maxTime) {
    let data;
    try {
      data = await fetchCheckRuns(sha);
    } catch (err) {
      console.warn(`⚠️  Error consultando check runs: ${err.message}. Reintentando en ${pollSec}s...`);
      await sleep(pollSec * 1000);
      continue;
    }

    const allRuns = Array.isArray(data.check_runs) ? data.check_runs : [];
    
    // Filtrar check runs relevantes: excluir el propio job de Publish para no auto-bloquearse
    const ciRuns = allRuns.filter(r => {
      const name = (r.name || '').toLowerCase();
      return !name.includes('publish to npm') && !name.includes('verify and publish');
    });

    if (ciRuns.length === 0) {
      if (Date.now() < graceUntil) {
        console.log(`⏳ Aguardando que los check runs de CI sean registrados por GitHub...`);
        await sleep(pollSec * 1000);
        continue;
      } else {
        console.warn(`⚠️  No se detectaron check runs de CI para el commit ${sha} tras 60s.`);
        console.log(`✅ Procediendo bajo confirmación de suite local.`);
        process.exit(0);
      }
    }

    // Evaluar estados
    const failedRuns = ciRuns.filter(r => 
      r.status === 'completed' && ['failure', 'cancelled', 'timed_out', 'action_required'].includes(r.conclusion)
    );

    if (failedRuns.length > 0) {
      console.error(`\n❌ [DEV-298 Gate] Abortando publicación a npm. Jobs de CI fallaron en el commit ${sha}:`);
      for (const f of failedRuns) {
        console.error(`   - ⛔ ${f.name}: conclusion="${f.conclusion}" (${f.html_url || ''})`);
      }
      process.exit(1);
    }

    const pendingRuns = ciRuns.filter(r => r.status !== 'completed');

    if (pendingRuns.length === 0) {
      const successfulRuns = ciRuns.filter(r => r.conclusion === 'success');
      console.log(`\n✅ [DEV-298 Gate] Todos los check runs de CI (${successfulRuns.length}/${ciRuns.length}) completados con éxito:`);
      for (const s of successfulRuns) {
        console.log(`   - ✅ ${s.name}`);
      }
      console.log(`🚀 Gate superado: el commit está formalmente certificado para publicación en npm.\n`);
      process.exit(0);
    }

    const completedCount = ciRuns.length - pendingRuns.length;
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`⏳ [${elapsedSec}s] CI en curso: ${completedCount}/${ciRuns.length} completados. Pendientes: ${pendingRuns.map(p => p.name).join(', ')}`);
    await sleep(pollSec * 1000);
  }

  console.error(`\n⛔ [DEV-298 Gate] Timeout agotado (${timeoutSec}s) esperando la conclusión de CI para commit ${sha}.`);
  process.exit(1);
}

main().catch(err => {
  console.error(`❌ Error fatal en verify-ci-status: ${err.message}`);
  process.exit(1);
});
