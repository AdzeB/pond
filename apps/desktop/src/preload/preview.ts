import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";
import type {
  PreviewNeighborRequest,
  PreviewWindowConfigure,
  PreviewWindowState,
} from "../shared/preview-window-contracts";

const IPC = {
  previewConfigure: "pond:preview-configure",
  previewNeighborRequest: "pond:preview-neighbor-request",
  previewClose: "pond:preview-close",
  previewState: "pond:preview-state",
  securityState: "pond:security-state",
} as const;

const api = {
  configure(input: PreviewWindowConfigure): Promise<void> {
    return ipcRenderer.invoke(IPC.previewConfigure, input);
  },
  close(windowId: number): Promise<void> {
    return ipcRenderer.invoke(IPC.previewClose, windowId);
  },
  requestNeighbor(input: PreviewNeighborRequest): Promise<void> {
    return ipcRenderer.invoke(IPC.previewNeighborRequest, input);
  },
  onState(callback: (state: PreviewWindowState) => void): () => void {
    const listener = (_event: IpcRendererEvent, state: PreviewWindowState) =>
      callback(state);
    ipcRenderer.on(IPC.previewState, listener);
    return () => ipcRenderer.off(IPC.previewState, listener);
  },
  onSecurityStateChanged(callback: () => void): () => void {
    const listener = () => callback();
    ipcRenderer.on(IPC.securityState, listener);
    return () => ipcRenderer.off(IPC.securityState, listener);
  },
};

contextBridge.exposeInMainWorld("pondPreview", api);

export type PondPreviewApi = typeof api;
