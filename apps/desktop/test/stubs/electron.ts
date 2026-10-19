import { tmpdir } from "node:os";

export const app = {
  getPath: () => tmpdir(),
  getVersion: () => "0.0.0",
  isPackaged: false,
};
export const shell = {};
export const session = {};
export const net = {};
export class BrowserWindow {}
export class Notification {}
export default {};
