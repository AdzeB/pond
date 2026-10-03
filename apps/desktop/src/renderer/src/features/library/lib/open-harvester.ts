import type { HarvesterWindowLocation } from "@shared/harvester-window-contracts";

export function openHarvester(location: HarvesterWindowLocation = {}): void {
  void window.pond?.openHarvesterWindow?.(location);
}
