import { ipcMain } from 'electron';

import { DEEP_LINK_REPAIR_CHANNEL } from '../shared/deepLinkRepair.js';
import { repairDeepLinkProtocol } from './deepLink.js';
import { assertTrustedAppRendererEvent } from './security/trustedAppRenderer.js';

/**
 * 深链关联修复的 IPC（#300）。
 *
 * 写注册表的动作只在这里发生一次，且必须由用户显式点击触发——启动路径
 * 只做只读核对（见 deepLink.ts 的 registerDeepLinkProtocol）。
 */
export function registerDeepLinkRepairIpc(): void {
  ipcMain.handle(DEEP_LINK_REPAIR_CHANNEL, async (event) => {
    assertTrustedAppRendererEvent(event);
    return repairDeepLinkProtocol();
  });
}
