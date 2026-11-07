; 深链 scheme 注册(Windows URL protocol)——安装器侧一次性写入,app 启动不再写。
; ---------------------------------------------------------------------------
; 背景:app 启动时调 setAsDefaultProtocolClient 会重写
; HKCU\Software\Classes\<scheme>\shell\open\command,安全软件(360 注册表防护)
; 会判成「有程序正在修改文件关联」并弹窗;用户点「阻止」后深链唤不起当前
; 版本,并存的多份安装还会反复互抢 handler。见 issue #300。
;
; 因此协议注册改由安装器一次性完成,app 启动时只做只读核对
; (main/deepLink.ts 的 registerDeepLinkProtocol)。
;
; 键形态必须与 Electron 的 setAsDefaultProtocolClient 逐字一致,否则 Electron 的
; isDefaultProtocolClient 读不到,启动时的只读核对会一直误判成「未注册」:
;   Software\Classes\<scheme>
;     (Default)    = "URL:<scheme>"
;     URL Protocol = ""
;     shell\open\command
;       (Default) = "<exe>" "%1"
;
; 整体加引号:安装目录默认在 C:\Program Files\ 下,路径含空格,不加引号
; Windows 解析不出 exe 路径。
;
; scheme 列表与运行时同源(shared/deepLinkSchemes.ts 的 DEEP_LINK_SCHEMES:
; 主 'cindy' + 历史 'xdt-maker'),这里写死字面量——NSIS 侧没有共享常量通道。

!include LogicLib.nsh

; 注册单个 scheme 到 HKCU\Software\Classes。
;
; 只写协议关联本身(默认 URL 声明 + URL Protocol + shell\open\command)。
; 展示名(Application\ApplicationName)仍由运行时写(main/deepLinkWindowsRegistration.ts):
; 那里的取值是统一后的品牌展示名(两区含 dev 都是 'Cindy'),与区域 exe 名
; (dev 是 'CindyDev')不是同一个值,放在安装器里写会写错 dev。
; 运行时那份先查后写、值一致就跳过,稳态下不产生写入。
!macro cindyRegisterDeepLinkScheme SCHEME
  WriteRegStr HKCU "Software\Classes\${SCHEME}" "" "URL:${SCHEME}"
  WriteRegStr HKCU "Software\Classes\${SCHEME}" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\${SCHEME}\shell\open\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
!macroend

; 卸载时清理 scheme 键,**但只在 handler 仍指向本安装目录时**才删:
; 同机可能并存 cn/global 另一份安装、或用户自己装过别的 cindy:// handler,
; 那些键不是本安装器拥有的,删了会把别人的深链打断。
!macro cindyRemoveDeepLinkScheme SCHEME
  Push $R0
  ReadRegStr $R0 HKCU "Software\Classes\${SCHEME}\shell\open\command" ""
  ${If} $R0 == '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
    DeleteRegKey HKCU "Software\Classes\${SCHEME}"
  ${EndIf}
  Pop $R0
!macroend
