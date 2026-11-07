import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ handle: vi.fn(), guard: vi.fn(), repair: vi.fn() }));
vi.mock('electron', () => ({ ipcMain: { handle: mocks.handle } }));
vi.mock('../security/trustedAppRenderer.js', () => ({
  assertTrustedAppRendererEvent: mocks.guard,
}));
vi.mock('../deepLink.js', () => ({
  repairDeepLinkProtocol: mocks.repair,
}));

import { DEEP_LINK_REPAIR_CHANNEL } from '../../shared/deepLinkRepair.js';
import { registerDeepLinkRepairIpc } from '../deep-link-repair-ipc.js';

describe('deep link repair IPC authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    registerDeepLinkRepairIpc();
  });

  it('rejects untrusted senders before touching the registry', async () => {
    const handler = mocks.handle.mock.calls.find(
      ([name]) => name === DEEP_LINK_REPAIR_CHANNEL,
    )![1];
    mocks.guard.mockImplementation(() => {
      throw new Error('[PERMISSION_DENIED]');
    });
    await expect(handler({})).rejects.toThrow('[PERMISSION_DENIED]');
    expect(mocks.repair).not.toHaveBeenCalled();
  });

  it('repairs the registration only for trusted senders', async () => {
    const event = {};
    const handler = mocks.handle.mock.calls.find(
      ([name]) => name === DEEP_LINK_REPAIR_CHANNEL,
    )![1];
    mocks.repair.mockResolvedValue({ cindy: true, 'xdt-maker': true });
    await expect(handler(event)).resolves.toEqual({ cindy: true, 'xdt-maker': true });
    expect(mocks.guard).toHaveBeenCalledWith(event);
    expect(mocks.repair).toHaveBeenCalledTimes(1);
  });
});
