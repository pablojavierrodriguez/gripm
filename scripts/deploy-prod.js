#!/usr/bin/env node

/**
 * scripts/deploy-prod.js
 *
 * Mechanical Guardrail (Anti-Dev-Production-Deploy - DEV-340)
 *
 * Ensures that production deployments to Vercel (https://gripm.vercel.app)
 * can ONLY be executed from the canonical 'main' trunk and with a completely clean
 * working tree. Prevents accidental deployments of unverified dev branches.
 */

import { execSync } from 'node:child_process';
import process from 'node:process';

/**
 * Validates whether the current git working tree and branch are eligible for production deployment.
 * @param {object} [options]
 * @param {Function} [options.exec] - Optional exec implementation for testing
 * @returns {{ ok: boolean, branch: string, error?: string }}
 */
export function validateDeployEnvironment({ exec = execSync } = {}) {
  let branch = '';
  try {
    branch = exec('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (err) {
    return { ok: false, branch: '', error: 'Failed to determine current git branch: ' + err.message };
  }

  if (branch !== 'main') {
    const errorMsg = [
      '========================================================================',
      '❌ [DEPLOY ABORTED] Anti-Dev-Production Guardrail Violation!',
      '========================================================================',
      `Current git branch: "${branch}"`,
      '',
      'Production deployments to Vercel are strictly restricted to the canonical',
      '\'main\' trunk. Deploying from \'dev\' or working branches causes state lies',
      'and marks Vercel production history with development branches.',
      '',
      'Canonical Release & Deployment Flow:',
      '  1. Complete QA and verify clean pyramid on \'dev\'',
      '  2. Integrate \'dev\' into \'main\':',
      '     git checkout main',
      '     git merge dev --ff-only',
      '     git push origin main',
      '  3. Execute production deployment:',
      '     npm run deploy:prod',
      '  4. Return to integration trunk:',
      '     git checkout dev',
      '========================================================================'
    ].join('\n');

    return { ok: false, branch, error: errorMsg };
  }

  let status = '';
  try {
    status = exec('git status --porcelain', { encoding: 'utf8' }).trim();
  } catch (err) {
    return { ok: false, branch, error: 'Failed to inspect git status: ' + err.message };
  }

  if (status.length > 0) {
    const errorMsg = [
      '========================================================================',
      '❌ [DEPLOY ABORTED] Dirty Working Tree Detected!',
      '========================================================================',
      'The git working tree has uncommitted or unstaged changes.',
      'Production deployments must be 100% reproducible and committed to \'main\'.',
      '',
      'Pending changes:',
      status,
      '========================================================================'
    ].join('\n');

    return { ok: false, branch, error: errorMsg };
  }

  return { ok: true, branch };
}

/**
 * Main execution flow
 */
export function runDeploy(args = process.argv.slice(2), { exec = execSync } = {}) {
  const isDryRun = args.includes('--dry-run');
  const skipBuild = args.includes('--skip-build');

  console.log('🔒 Verificando guardrail de despliegue a producción (Anti-Dev-Production-Deploy)...');
  const validation = validateDeployEnvironment({ exec });

  if (!validation.ok) {
    console.error(validation.error);
    process.exit(1);
  }

  console.log(`✅ Trunk verificado: '${validation.branch}' (Working tree limpio).`);

  if (!skipBuild) {
    console.log('📦 Compilando bundle de producción (npm run build)...');
    exec('npm run build', { stdio: 'inherit' });
  }

  console.log('🚀 Iniciando despliegue de Producción en Vercel...');
  if (isDryRun) {
    console.log('ℹ️  [dry-run] npx vercel --prod --yes no ejecutado.');
  } else {
    exec('npx vercel --prod --yes', { stdio: 'inherit' });
    console.log('\n✅ Despliegue de producción completado exitosamente.');
    console.log('🌐 URL Canónica: https://gripm.vercel.app');
  }
}

import { basename } from 'node:path';

// Execute when invoked directly
if (process.argv[1] && basename(process.argv[1]) === 'deploy-prod.js') {
  runDeploy();
}
