import {
  createPanePrefStore,
  type PanePref,
  usePanePref,
} from "@/lib/use-pane-pref";

const store = createPanePrefStore("inspector", { defaultOpen: true });

export function useInspector(): PanePref {
  return usePanePref(store);
}

export const setInspectorOpen = store.set;
export const toggleInspector = store.toggle;
