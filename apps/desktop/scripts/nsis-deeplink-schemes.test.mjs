/**
 * Windows 深链协议注册的跨文件契约（#300）。
 *
 * app 启动时不再写系统关联，协议注册由安装器一次性完成。这里锁住两侧的
 * 契约边界：
 *   - 安装器（resources/installer.nsh + installer-deeplink-schemes.nsh）必须写出
 *     Electron 的 isDefaultProtocolClient 读得回来的那组键；
 *   - 运行时（src/main/deepLink.ts）只读核对，不得再调 setAsDefaultProtocolClient
 *     抢回 handler——那正是 360 注册表防护拦截的写入动作。
 *
 * 键形态取自 Electron v42 的 shell/browser/browser_win.cc：
 *   SetAsDefaultProtocolClient 写 HKCU\Software\Classes\<scheme> 的
 *   (Default)="URL:<scheme>"、"URL Protocol"=""，
 *   以及 shell\open\command 的 (Default)="<exe>" "%1"；
 *   IsDefaultProtocolClient 逐字比较 command 的默认值与
 *   AddQuoteForArg(exe) + " \"%1\""。路径含空格时整体加引号即可逐字对上
 *   （Chromium 的 AddQuoteForArg 只在路径含空格/制表符/引号时才加引号）。
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const installer = readFileSync(
  new URL('../resources/installer.nsh', import.meta.url),
  'utf8',
);
const schemes = readFileSync(
  new URL('../resources/installer-deeplink-schemes.nsh', import.meta.url),
  'utf8',
);
const deepLink = readFileSync(
  new URL('../src/main/deepLink.ts', import.meta.url),
  'utf8',
);

const SCHEMES = ['cindy', 'xdt-maker'];

describe('Windows deep-link protocol registration contract', () => {
  it('includes the scheme macros from the project resources directory', () => {
    expect(installer).toContain(
      '!include "${BUILD_RESOURCES_DIR}\\installer-deeplink-schemes.nsh"',
    );
  });

  it('writes the registry layout Electron reads back as a default protocol client', () => {
    expect(schemes).toContain(
      'WriteRegStr HKCU "Software\\Classes\\${SCHEME}" "" "URL:${SCHEME}"',
    );
    expect(schemes).toContain(
      'WriteRegStr HKCU "Software\\Classes\\${SCHEME}" "URL Protocol" ""',
    );
    expect(schemes).toContain(
      'WriteRegStr HKCU "Software\\Classes\\${SCHEME}\\shell\\open\\command" "" \'"$INSTDIR\\${APP_EXECUTABLE_FILENAME}" "%1"\'',
    );
  });

  it('registers every supported scheme on install and removes it on uninstall', () => {
    for (const scheme of SCHEMES) {
      expect(installer).toContain(`!insertmacro cindyRegisterDeepLinkScheme "${scheme}"`);
      expect(installer).toContain(`!insertmacro cindyRemoveDeepLinkScheme "${scheme}"`);
    }
  });

  it('keeps a handler owned by another install when uninstalling', () => {
    // 只删仍指向本安装目录的 handler：并存的 cn/global 安装或用户自装的
    // handler 不是本安装器拥有的，删了会把别人的深链打断。
    expect(schemes).toContain(
      'ReadRegStr $R0 HKCU "Software\\Classes\\${SCHEME}\\shell\\open\\command" ""',
    );
    expect(schemes).toContain(
      '${If} $R0 == \'"$INSTDIR\\${APP_EXECUTABLE_FILENAME}" "%1"\'',
    );
    expect(schemes).toContain('DeleteRegKey HKCU "Software\\Classes\\${SCHEME}"');
  });

  it('never rewrites the Windows association from the app process', () => {
    // 旧实现每次启动都调 setAsDefaultProtocolClient，安全软件会把它判成
    // 「有程序正在修改文件关联」并弹窗拦截（#300）。
    const windowsBranch = windowsStartupBranch(deepLink);
    expect(windowsBranch).not.toContain('app.setAsDefaultProtocolClient');
    expect(windowsBranch).toContain('app.isDefaultProtocolClient');
  });
});

/**
 * registerDeepLinkProtocol 里 Windows 只读分支的源码片段。
 *
 * 只取启动路径这一段：用户主动触发的 repairDeepLinkProtocol 仍然要调
 * setAsDefaultProtocolClient（那正是「修复」要做的写入），把它算进来会让
 * 「启动不写关联」这条契约失去意义。
 */
function windowsStartupBranch(source) {
  const marker = 'for (const scheme of DEEP_LINK_SCHEMES) {';
  const first = source.indexOf(marker);
  expect(first).toBeGreaterThan(-1);
  const second = source.indexOf(marker, first + marker.length);
  expect(second).toBeGreaterThan(-1);
  // 下一个顶层 export 之后就是另一个函数了，启动路径到此为止。
  const nextExport = source.indexOf('\nexport ', second);
  expect(nextExport).toBeGreaterThan(-1);
  return source.slice(second, nextExport);
}
