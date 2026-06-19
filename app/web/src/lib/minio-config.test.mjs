import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMinioEndpoint } from './minio-config.ts';

test('parses host and port from combined endpoint', () => {
  assert.deepEqual(parseMinioEndpoint('localhost:9000', '7000'), {
    endPoint: 'localhost',
    port: 9000,
  });
});

test('uses explicit port when endpoint has no port', () => {
  assert.deepEqual(parseMinioEndpoint('storage.local', '9100'), {
    endPoint: 'storage.local',
    port: 9100,
  });
});

test('falls back to localhost and default MinIO port', () => {
  assert.deepEqual(parseMinioEndpoint(undefined, undefined), {
    endPoint: 'localhost',
    port: 9000,
  });
});
