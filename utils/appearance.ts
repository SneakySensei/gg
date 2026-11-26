/**
 * Appearance switches: each one hides or adjusts part of Gmail's UI by
 * toggling a class on <html>, which assets/appearance.css styles.
 */

export const APPEARANCE_KEY = 'ggAppearance';

export const APPEARANCE_IDS = [
  'hideSupportButton',
  'hideGeminiButton',
  'hideUpgradeButton',
  'hideLeftAppBar',
  'hideRightPanel',
] as const;

export type AppearanceId = (typeof APPEARANCE_IDS)[number];
export type AppearanceSettings = Record<AppearanceId, boolean>;

export interface AppearanceDef {
  id: AppearanceId;
  label: string;
  description: string;
  /** Class added to <html> while the switch is on. */
  className: string;
}

export interface AppearanceGroup {
  label: string;
  switches: AppearanceDef[];
}

export const APPEARANCE_GROUPS: AppearanceGroup[] = [
  {
    label: 'Top bar',
    switches: [
      { id: 'hideSupportButton', label: 'Hide Support button', description: 'Remove the ? Support button from the top bar.', className: 'gp-hide-support' },
      { id: 'hideGeminiButton', label: 'Hide Try Gemini button', description: 'Remove the Gemini button from the top bar.', className: 'gp-hide-gemini' },
      { id: 'hideUpgradeButton', label: 'Hide Upgrade button', description: 'Remove the Upgrade / Google One storage prompt from the top bar.', className: 'gp-hide-upgrade' },
    ],
  },
  {
    label: 'Layout',
    switches: [
      { id: 'hideLeftAppBar', label: 'Hide left app bar', description: 'Remove the main menu (☰) button beside the Gmail logo.', className: 'gp-hide-left-app-bar' },
      { id: 'hideRightPanel', label: 'Hide right side panel', description: 'Remove the side panel with Calendar, Keep, Tasks and Contacts.', className: 'gp-hide-right-panel' },
    ],
  },
];

export const APPEARANCE_DEFS: AppearanceDef[] = APPEARANCE_GROUPS.flatMap((g) => g.switches);

const all = (v: boolean) => Object.fromEntries(APPEARANCE_IDS.map((id) => [id, v])) as AppearanceSettings;

export type PresetId = 'classic' | 'minimal';

export const PRESETS: Record<PresetId, { label: string; description: string; settings: AppearanceSettings }> = {
  classic: {
    label: 'Classic',
    description: 'Gmail as Google made it',
    settings: all(false),
  },
  minimal: {
    label: 'Minimal',
    description: 'Just your email, nothing extra',
    settings: {
      ...all(false),
      hideSupportButton: true,
      hideGeminiButton: true,
      hideUpgradeButton: true,
      hideLeftAppBar: true,
      hideRightPanel: true,
    },
  },
};

/** Classic is Gmail's default look. */
export const DEFAULT_APPEARANCE: AppearanceSettings = PRESETS.classic.settings;

export function normalizeAppearance(raw: unknown): AppearanceSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppearanceSettings>;
  return Object.fromEntries(APPEARANCE_IDS.map((id) => [id, src[id] === true])) as AppearanceSettings;
}

/** Which preset the switches currently match, or 'custom'. */
export function activePreset(s: AppearanceSettings): PresetId | 'custom' {
  for (const id of Object.keys(PRESETS) as PresetId[]) {
    if (APPEARANCE_IDS.every((k) => PRESETS[id].settings[k] === s[k])) return id;
  }
  return 'custom';
}
