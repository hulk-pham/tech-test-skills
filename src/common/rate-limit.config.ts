import { ConfigService } from '@nestjs/config';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Env: RATE_LIMIT_ENABLED (default true), RATE_LIMIT_TTL_MS, RATE_LIMIT_MAX
 * TTL is milliseconds per throttler window.
 */
export function rateLimitModuleOptions(
  config: ConfigService,
): ThrottlerModuleOptions {
  const ttl = parsePositiveInt(
    config.get<string>('RATE_LIMIT_TTL_MS'),
    60_000,
  );
  const limit = parsePositiveInt(config.get<string>('RATE_LIMIT_MAX'), 100);
  const enabled =
    (config.get<string>('RATE_LIMIT_ENABLED') ?? 'true').toLowerCase() !==
    'false';

  return {
    throttlers: [{ name: 'default', ttl, limit }],
    skipIf: () => !enabled,
  };
}
