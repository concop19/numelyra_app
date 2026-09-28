import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { settingsAtom, type Settings } from '../atoms/settings';

export const useSettings = () => {
  const [settingsState, setSettings] = useAtom(settingsAtom);
  // `getOnInit` guarantees a synchronous value; the Promise in the type is spurious.
  const settings = settingsState as Settings;

  const toggle = useCallback(
    (key: keyof Settings) =>
      setSettings((prev) => {
        const current = prev as Settings;
        return { ...current, [key]: !current[key] };
      }),
    [setSettings]
  );

  return { settings, setSettings, toggle };
};
