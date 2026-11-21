import { useEffect, useState } from 'react';
import { useT } from '../i18n/useT';
import './fear.css';
import { isReducedMotion, readMotion, writeMotion, type MotionSetting } from '../lib/motion.ts';

const QUERY = '(prefers-reduced-motion: reduce)';

/** The effective reduced-motion flag: the stored setting, else the system. Starts false on the server and corrects on mount. */
export function useReducedMotion(): { reduced: boolean; setSetting: (v: MotionSetting) => void } {
  const [setting, setSettingState] = useState<MotionSetting | null>(null);
  const [system, setSystem] = useState(false);
  useEffect(() => {
    setSettingState(readMotion(localStorage));
    const mq = window.matchMedia(QUERY);
    setSystem(mq.matches);
    const on = (e: MediaQueryListEvent) => setSystem(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return {
    reduced: isReducedMotion(setting, system),
    setSetting: (v) => {
      writeMotion(localStorage, v);
      setSettingState(v);
    },
  };
}

/** The settings-menu checkbox. Checked means reduced; the first change stores an explicit choice. */
export function MotionToggle({ reduced, onChange }: { reduced: boolean; onChange: (v: MotionSetting) => void }) {
  const t = useT();
  return (
    <label className="motion-toggle">
      <input type="checkbox" checked={reduced} onChange={(e) => onChange(e.target.checked ? 'reduce' : 'full')} />
      <span>{t('settings.motion')}</span>
    </label>
  );
}
