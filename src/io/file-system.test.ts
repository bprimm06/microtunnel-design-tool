import { describe, it, expect } from 'vitest';
import { ensureWritePermission, supportsFS } from './file-system';

function fakeHandle(permission: PermissionState, requestResult: PermissionState = 'granted') {
  return {
    queryPermission: async () => permission,
    requestPermission: async () => requestResult,
  } as unknown as FileSystemFileHandle;
}

describe('file-system', () => {
  it('reports no File System Access support in node', () => {
    expect(supportsFS()).toBe(false);
  });

  it('ensureWritePermission checks silently', async () => {
    await expect(
      ensureWritePermission(fakeHandle('granted'), { request: false }),
    ).resolves.toBe(true);
    await expect(
      ensureWritePermission(fakeHandle('denied'), { request: false }),
    ).resolves.toBe(false);
  });

  it('ensureWritePermission requests when allowed', async () => {
    await expect(
      ensureWritePermission(fakeHandle('prompt', 'granted'), { request: true }),
    ).resolves.toBe(true);
    await expect(
      ensureWritePermission(fakeHandle('prompt', 'denied'), { request: true }),
    ).resolves.toBe(false);
  });
});
