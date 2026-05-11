import { useSettingsStore, RestaurantSettings as RS } from '../store/settingsStore';

export const DEFAULT_SETTINGS = useSettingsStore.getState().settings;
export type RestaurantSettings = RS;

export function useSettings() {
  const settings = useSettingsStore((state) => state.settings);
  const loading = useSettingsStore((state) => state.loading);
  return { settings, loading };
}
