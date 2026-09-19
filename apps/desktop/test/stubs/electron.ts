import { tmpdir } from "node:os";

export const app = {
  getPath: () => tmpdir(),
  isPackaged: false,
};
export const shell = {};
export const session = {};
export const net = {};
export class BrowserWindow {}
export class Notification {}
export default {};
