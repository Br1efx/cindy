// @vitest-environment jsdom

/**
 * WindowBehaviorSection 的深链关联修复行(#300)。
 *
 * 契约:Windows 才出现;点「修复」才写注册表;失败时给出可读的错误。
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const repair = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { WindowBehaviorSection } from '../WindowBehaviorSection';

function setPlatform(platform: string): void {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      platform,
      deepLink: { repair },
      // 同一 section 里的其它行会读这些 API；本测试只关心深链修复那一行。
      windowBehavior: {
        getWindowsCloseBehavior: () => Promise.resolve(null),
        getLinuxCloseBehavior: () => Promise.resolve(null),
        getLoginItem: () => Promise.resolve({ enabled: false, available: false }),
        getMenubarState: () => Promise.resolve({ available: false, enabled: false }),
        getAwayGuardState: () => Promise.resolve({ available: false, enabled: false }),
      },
    },
  });
}

describe('WindowBehaviorSection deep link repair row', () => {
  beforeEach(() => {
    repair.mockReset();
    setPlatform('win32');
  });

  it('shows the repair action on Windows and repairs only after a click', async () => {
    repair.mockResolvedValue({ cindy: true, 'xdt-maker': true });
    await act(async () => {
      render(<WindowBehaviorSection />);
    });

    expect(repair).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'settings.windowBehavior.deepLinkRepair.repair' }),
      );
    });

    await waitFor(() => expect(repair).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByText('settings.windowBehavior.deepLinkRepair.repaired'),
      ).toBeTruthy(),
    );
  });

  it('hides the row on platforms without a Windows protocol association', async () => {
    setPlatform('darwin');
    await act(async () => {
      render(<WindowBehaviorSection />);
    });

    expect(
      screen.queryByRole('button', { name: 'settings.windowBehavior.deepLinkRepair.repair' }),
    ).toBeNull();
  });

  it('shows the failure notice when the repair fails', async () => {
    repair.mockRejectedValue(new Error('[PERMISSION_DENIED]'));
    await act(async () => {
      render(<WindowBehaviorSection />);
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'settings.windowBehavior.deepLinkRepair.repair' }),
      );
    });

    await waitFor(() =>
      expect(
        screen.getByText('settings.windowBehavior.deepLinkRepair.repairFailed'),
      ).toBeTruthy(),
    );
  });
});
