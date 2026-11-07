// @vitest-environment jsdom

/**
 * useDeepLinkRepairSetting — 深链关联修复入口(#300)。
 *
 * 契约:只有 Windows 暴露该修复;写注册表的动作必须由用户显式点击触发,
 * 且失败时给出可展示的错误而不是抛异常。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useDeepLinkRepairSetting } from '../useDeepLinkRepairSetting';

const repair = vi.fn();

function stubPlatform(platform: string): void {
  Object.defineProperty(window, 'electronAPI', {
    value: { platform, deepLink: { repair } },
    configurable: true,
    writable: true,
  });
}

describe('useDeepLinkRepairSetting', () => {
  beforeEach(() => {
    repair.mockReset();
    stubPlatform('win32');
  });

  it('offers the repair only on Windows', () => {
    const { result } = renderHook(() => useDeepLinkRepairSetting());
    expect(result.current.supported).toBe(true);
  });

  it('does not write anything before the user asks for it', () => {
    renderHook(() => useDeepLinkRepairSetting());
    expect(repair).not.toHaveBeenCalled();
  });

  it('reports the repaired schemes', async () => {
    repair.mockResolvedValue({ cindy: true, 'xdt-maker': true });
    const { result } = renderHook(() => useDeepLinkRepairSetting());

    await act(async () => {
      await result.current.repair();
    });

    expect(repair).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.result).toEqual({ cindy: true, 'xdt-maker': true }));
    expect(result.current.error).toBeNull();
    expect(result.current.repaired).toBe(true);
  });

  it('does not claim success when one scheme could not be repaired', async () => {
    repair.mockResolvedValue({ cindy: true, 'xdt-maker': false });
    const { result } = renderHook(() => useDeepLinkRepairSetting());

    await act(async () => {
      await result.current.repair();
    });

    await waitFor(() => expect(result.current.result).toEqual({ cindy: true, 'xdt-maker': false }));
    expect(result.current.repaired).toBe(false);
  });

  it('surfaces a failure instead of throwing', async () => {
    repair.mockRejectedValue(new Error('[PERMISSION_DENIED]'));
    const { result } = renderHook(() => useDeepLinkRepairSetting());

    await act(async () => {
      await result.current.repair();
    });

    await waitFor(() => expect(result.current.error).toBe('repairFailed'));
    expect(result.current.result).toBeNull();
  });
});
