import {
  DEFAULT_SETTINGS,
  GENERAL_SETTINGS,
  MASTER_KEY,
  SETTINGS_KEY,
  SHORTCUT_GROUPS,
  isEnabled,
  type ShortcutId,
  type ShortcutSettings,
} from '@/utils/shortcuts';
import {
  APPEARANCE_GROUPS,
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  PRESETS,
  activePreset,
  normalizeAppearance,
  type AppearanceSettings,
  type PresetId,
} from '@/utils/appearance';

const groupsEl = document.getElementById('groups')!;
const generalEl = document.getElementById('general-rows')!;
const masterEl = document.getElementById('master') as HTMLInputElement;
const shortcutsTab = document.getElementById('tab-shortcuts')!;

let settings: ShortcutSettings = {};

const save = () => browser.storage.sync.set({ [SETTINGS_KEY]: settings });

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function toggle(checked: boolean, onChange: (v: boolean) => void, label: string) {
  const wrap = el('label', 'switch');
  const input = el('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.setAttribute('aria-label', label);
  input.addEventListener('change', () => onChange(input.checked));
  wrap.append(input, el('span', 'track'));
  return { wrap, input };
}

function renderKeys(keys: string) {
  const span = el('span', 'keys');
  keys.split(/\s*\+\s*/).forEach((part, i) => {
    if (i) span.append(el('span', 'plus', '+'));
    span.append(el('kbd', undefined, part));
  });
  return span;
}

function rowText(label: string, description: string) {
  const text = el('div', 'row-text');
  text.append(el('div', 'row-label', label), el('div', 'row-desc', description));
  return text;
}

function renderGeneral() {
  generalEl.replaceChildren();
  for (const s of GENERAL_SETTINGS) {
    const li = el('li', 'row row-general');
    const t = toggle(
      isEnabled(settings, s.id),
      (v) => {
        settings[s.id] = v;
        void save();
      },
      s.label,
    );
    li.append(rowText(s.label, s.description), t.wrap);
    generalEl.append(li);
  }
}

function renderShortcuts() {
  groupsEl.replaceChildren();
  for (const group of SHORTCUT_GROUPS) {
    const section = el('section', 'group');
    const head = el('div', 'group-head');
    const titles = el('div');
    titles.append(el('h3', undefined, group.label));
    if (group.description) titles.append(el('p', 'group-desc', group.description));

    const allOn = group.shortcuts.every((s) => isEnabled(settings, s.id));
    const groupToggle = toggle(
      allOn,
      (v) => {
        group.shortcuts.forEach((s) => (settings[s.id] = v));
        void save();
        renderShortcuts();
      },
      `Toggle all ${group.label} shortcuts`,
    );
    head.append(titles, groupToggle.wrap);
    section.append(head);

    const list = el('ul', 'rows');
    for (const s of group.shortcuts) {
      const li = el('li', 'row');
      const t = toggle(
        isEnabled(settings, s.id),
        (v) => {
          settings[s.id as ShortcutId] = v;
          void save();
          groupToggle.input.checked = group.shortcuts.every((x) => isEnabled(settings, x.id));
        },
        s.label,
      );
      li.append(renderKeys(s.keys), rowText(s.label, s.description), t.wrap);
      list.append(li);
    }
    section.append(list);
    groupsEl.append(section);
  }
}

// ---- Appearance
let appearance: AppearanceSettings = { ...DEFAULT_APPEARANCE };
const presetsEl = document.getElementById('presets')!;
const presetStatusEl = document.getElementById('preset-status')!;
const appearanceGroupsEl = document.getElementById('appearance-groups')!;

const saveAppearance = () => browser.storage.sync.set({ [APPEARANCE_KEY]: appearance });

/** A tiny wireframe of Gmail for a preset card. Purely decorative. */
function skeleton(kind: PresetId): HTMLElement {
  const box = el('span', `skel skel-${kind}`);
  box.setAttribute('aria-hidden', 'true');
  const div = (cls: string, ...kids: HTMLElement[]) => {
    const d = el('span', cls);
    d.append(...kids);
    return d;
  };
  const minimal = kind === 'minimal';

  const top = div(
    'skel-top',
    ...(minimal ? [] : [div('skel-menu')]),
    div('skel-logo'),
    div('skel-search'),
    div(
      'skel-icons',
      ...(minimal ? [div('skel-dot'), div('skel-avatar')] : [div('skel-dot'), div('skel-dot'), div('skel-pill'), div('skel-dot'), div('skel-dot'), div('skel-avatar')]),
    ),
  );

  const rows = Array.from({ length: 4 }, () =>
    div('skel-row', div('skel-check'), ...(minimal ? [] : [div('skel-star')]), div('skel-sender'), div('skel-subject')),
  );

  const body = div(
    'skel-body',
    ...(minimal ? [] : [div('skel-rail', div('skel-dot'), div('skel-dot'))]),
    div('skel-nav', div('skel-nav-active'), div('skel-nav-line'), div('skel-nav-line'), ...(minimal ? [] : [div('skel-nav-line short'), div('skel-nav-line short')])),
    div('skel-list', ...rows),
    ...(minimal ? [] : [div('skel-side', div('skel-sq'), div('skel-sq'), div('skel-sq'))]),
  );

  box.append(top, body);
  return box;
}

function renderAppearance() {
  const active = activePreset(appearance);

  presetsEl.replaceChildren();
  for (const id of Object.keys(PRESETS) as PresetId[]) {
    const p = PRESETS[id];
    const card = el('button', `preset${active === id ? ' active' : ''}`);
    card.type = 'button';
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', String(active === id));
    const footer = el('span', 'preset-footer');
    const text = el('span', 'preset-text');
    text.append(el('span', 'preset-name', p.label), el('span', 'preset-desc', p.description));
    footer.append(text, el('span', 'preset-check'));
    card.append(skeleton(id), footer);
    card.addEventListener('click', () => {
      appearance = { ...p.settings };
      void saveAppearance();
      renderAppearance();
    });
    presetsEl.append(card);
  }
  presetStatusEl.textContent = active === 'custom' ? 'Custom: your switches no longer match a preset.' : '';

  appearanceGroupsEl.replaceChildren();
  for (const group of APPEARANCE_GROUPS) {
    const section = el('section', 'group');
    const head = el('div', 'group-head');
    head.append(el('h3', undefined, group.label));
    section.append(head);
    const list = el('ul', 'rows');
    for (const s of group.switches) {
      const li = el('li', 'row row-general');
      const t = toggle(
        appearance[s.id],
        (v) => {
          appearance[s.id] = v;
          void saveAppearance();
          renderAppearance();
        },
        s.label,
      );
      li.append(rowText(s.label, s.description), t.wrap);
      list.append(li);
    }
    section.append(list);
    appearanceGroupsEl.append(section);
  }
}

// ---- Theme: System (prefers-color-scheme) / Light / Dark, remembered.
type ThemeChoice = 'system' | 'light' | 'dark';
const THEME_KEY = 'gmailPlusTheme';

function applyTheme(choice: ThemeChoice) {
  if (choice === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', choice);
  document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.themeChoice === choice));
  });
}

function setTheme(choice: ThemeChoice) {
  applyTheme(choice);
  try {
    localStorage.setItem(THEME_KEY, choice); // read before first paint by theme-init.js
  } catch {}
  void browser.storage.sync.set({ [THEME_KEY]: choice });
}

const isThemeChoice = (v: unknown): v is ThemeChoice => v === 'system' || v === 'light' || v === 'dark';

function initTheme(synced: unknown) {
  let local: string | null = null;
  try {
    local = localStorage.getItem(THEME_KEY);
  } catch {}
  // Synced choice wins (e.g. set on another device); keep localStorage in step.
  const choice: ThemeChoice = isThemeChoice(synced) ? synced : isThemeChoice(local) ? local : 'system';
  if (choice !== local) {
    try {
      localStorage.setItem(THEME_KEY, choice);
    } catch {}
  }
  applyTheme(choice);
  document.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach((b) =>
    b.addEventListener('click', () => setTheme(b.dataset.themeChoice as ThemeChoice)),
  );
}

// ---- Tabs (remembered in the URL hash, e.g. options.html#shortcuts)
const TABS = ['general', 'appearance', 'shortcuts'] as const;
type Tab = (typeof TABS)[number];

function showTab(tab: Tab) {
  for (const t of TABS) {
    document.getElementById(`tab-${t}`)!.hidden = t !== tab;
  }
  document.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((b) => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', String(active));
  });
  if (location.hash !== `#${tab}`) history.replaceState(null, '', `#${tab}`);
}

function tabFromHash(): Tab {
  const h = location.hash.slice(1);
  return (TABS as readonly string[]).includes(h) ? (h as Tab) : 'general';
}

document.querySelectorAll<HTMLButtonElement>('.nav-btn').forEach((b) =>
  b.addEventListener('click', () => showTab(b.dataset.tab as Tab)),
);
window.addEventListener('hashchange', () => showTab(tabFromHash()));

async function init() {
  const data = await browser.storage.sync.get([SETTINGS_KEY, MASTER_KEY, APPEARANCE_KEY, THEME_KEY]);
  initTheme(data[THEME_KEY]);
  settings = (data[SETTINGS_KEY] as ShortcutSettings) ?? {};
  appearance = normalizeAppearance(data[APPEARANCE_KEY]);
  masterEl.checked = data[MASTER_KEY] !== false;
  shortcutsTab.classList.toggle('disabled', !masterEl.checked);
  masterEl.addEventListener('change', () => {
    shortcutsTab.classList.toggle('disabled', !masterEl.checked);
    void browser.storage.sync.set({ [MASTER_KEY]: masterEl.checked });
  });
  document.getElementById('reset')!.addEventListener('click', () => {
    settings = { ...DEFAULT_SETTINGS };
    appearance = { ...DEFAULT_APPEARANCE };
    void save();
    void saveAppearance();
    renderGeneral();
    renderAppearance();
    renderShortcuts();
  });
  renderGeneral();
  renderAppearance();
  renderShortcuts();
  showTab(tabFromHash());
}

void init();
