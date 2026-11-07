/**
 * 深链协议关联的修复入口（#300）。
 *
 * 协议关联由 NSIS 安装器一次性写入，运行时**不在启动路径**抢回——否则安全软件
 * （360 注册表防护）每次启动都会弹「有程序正在修改文件关联」。关联真被破坏时，
 * 由用户在设置里显式点「修复」走这个通道补回。
 *
 * 与登录项（loginItem）同一类：OS 级设置，只允许本机 app 内容触发，不进
 * device-link 能力面。
 */

/** 每个 scheme 的修复结果。 */
export type DeepLinkRepairResult = Record<string, boolean>;

export const DEEP_LINK_REPAIR_CHANNEL = 'deep-link:repair';
