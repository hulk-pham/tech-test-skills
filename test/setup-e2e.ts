import { webcrypto } from 'node:crypto';

/** Jest + ts-jest đôi khi không gắn `globalThis.crypto` (TypeORM/Nest dùng khi khởi tạo). */
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto as typeof globalThis.crypto;
}

process.env.TYPEORM_MIGRATIONS_RUN =
  process.env.TYPEORM_MIGRATIONS_RUN ?? 'true';
process.env.TYPEORM_SYNC = process.env.TYPEORM_SYNC ?? 'false';
