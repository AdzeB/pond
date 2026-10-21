; Per-user registrations for the native messaging host. The packaged app only
; writes the manifests these keys point at, so it never shells out to reg.exe,
; which antivirus behavior engines flag in a freshly installed app.
; Keep the keys in sync with manifests.ts
; (WINDOWS_NATIVE_MESSAGING_REGISTRY_KEYS and WINDOWS_FIREFOX_REGISTRY_KEYS).
; The manifests live in the app's userData folder, %APPDATA%\<productName>.
!define POND_NMH_DIR "$APPDATA\${PRODUCT_NAME}\native-messaging"

!macro customInstall
  WriteRegStr HKCU "Software\Google\Chrome\NativeMessagingHosts\so.pond.host" "" "${POND_NMH_DIR}\so.pond.host.json"
  WriteRegStr HKCU "Software\Google\Chrome SxS\NativeMessagingHosts\so.pond.host" "" "${POND_NMH_DIR}\so.pond.host.json"
  WriteRegStr HKCU "Software\Chromium\NativeMessagingHosts\so.pond.host" "" "${POND_NMH_DIR}\so.pond.host.json"
  WriteRegStr HKCU "Software\Microsoft\Edge\NativeMessagingHosts\so.pond.host" "" "${POND_NMH_DIR}\so.pond.host.json"
  WriteRegStr HKCU "Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\so.pond.host" "" "${POND_NMH_DIR}\so.pond.host.json"
  WriteRegStr HKCU "Software\Vivaldi\NativeMessagingHosts\so.pond.host" "" "${POND_NMH_DIR}\so.pond.host.json"
  WriteRegStr HKCU "Software\Mozilla\NativeMessagingHosts\so.pond.host" "" "${POND_NMH_DIR}\so.pond.host.firefox.json"
  WriteRegStr HKCU "Software\LibreWolf\NativeMessagingHosts\so.pond.host" "" "${POND_NMH_DIR}\so.pond.host.firefox.json"
  WriteRegStr HKCU "Software\Floorp\NativeMessagingHosts\so.pond.host" "" "${POND_NMH_DIR}\so.pond.host.firefox.json"
!macroend

; Per-user uninstall cleanup for registrations the app and installer write.
; The Library lives outside the install directory and is never touched here.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegKey HKCU "Software\Classes\pond"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Pond"
  ${endIf}
  DeleteRegKey HKCU "Software\Google\Chrome\NativeMessagingHosts\so.pond.host"
  DeleteRegKey HKCU "Software\Google\Chrome SxS\NativeMessagingHosts\so.pond.host"
  DeleteRegKey HKCU "Software\Chromium\NativeMessagingHosts\so.pond.host"
  DeleteRegKey HKCU "Software\Microsoft\Edge\NativeMessagingHosts\so.pond.host"
  DeleteRegKey HKCU "Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\so.pond.host"
  DeleteRegKey HKCU "Software\Vivaldi\NativeMessagingHosts\so.pond.host"
  DeleteRegKey HKCU "Software\Mozilla\NativeMessagingHosts\so.pond.host"
  DeleteRegKey HKCU "Software\LibreWolf\NativeMessagingHosts\so.pond.host"
  DeleteRegKey HKCU "Software\Floorp\NativeMessagingHosts\so.pond.host"
!macroend
