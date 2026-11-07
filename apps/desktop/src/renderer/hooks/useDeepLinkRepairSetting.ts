import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 深链协议关联的修复动作（#300）。
 *
 * 关联由安装器一次性写入，启动路径只做只读核对；只有用户显式点「修复」时
 * 才写注册表。这里的写入是一次性的、用户明确要求的动作，不是启动副作用。
 */
export function useDeepLinkRepairSetting() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, boolean> | null>(null);
  const [error, setError] = useState<'repairFailed' | null>(null);
  const mounted = useRef(false);
  const running = useRef(false);
  const platform = window.electronAPI?.platform;
  // 只有 packaged 的 Windows 安装版需要修：协议关联是安装器写进注册表的，
  // dev 与其它平台没有这份注册表项。
  const supported = platform === 'win32';

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const repair = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const next = await window.electronAPI.deepLink.repair();
      if (mounted.current) setResult(next);
    } catch {
      if (mounted.current) {
        setResult(null);
        setError('repairFailed');
      }
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  // 全部 scheme 都写成功才算修好；任何一个失败都让用户看到失败提示。
  const repaired =
    result !== null && Object.values(result).length > 0 && Object.values(result).every(Boolean);

  return { busy, result, error, repair, repaired, supported };
}
