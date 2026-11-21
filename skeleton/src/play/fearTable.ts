// Hotspot fear changes (design: "Hotspot fear changes"). Keys are `<legend-id>:<raw hotspot id>`.
// Content text is prose, so nothing is parsed at runtime. A change applies once per Hotspot per Run, and only when the
// served role equals the authored role.
export const HOTSPOT_FEAR_STEP = 3; // "a little", "a tick"

export const HOTSPOT_FEAR: Readonly<Record<string, number>> = {
  'baba-yaga:h-05': +HOTSPOT_FEAR_STEP,
  'banshee:hs-cat': -HOTSPOT_FEAR_STEP,
  'banshee:hs-comb': +HOTSPOT_FEAR_STEP,
  'flying-dutchman:h-04': +HOTSPOT_FEAR_STEP,
};

/** Hotspots whose text mentions fear but whose tap changes nothing (covered by other amounts, or "unchanged"). */
export const HOTSPOT_FEAR_NONE: readonly string[] = [
  'baba-yaga:h-02',
  'baba-yaga:h-07',
  'jersey-devil:h-05',
  'baba-yaga:h-06',
  'jersey-devil:h-06',
  'vetala:h-11',
  'yuki-onna:h-03',
];
