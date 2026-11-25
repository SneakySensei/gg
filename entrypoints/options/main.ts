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

// ---- Glyphs: small inline stroke icons (no icon fonts or remote assets).
const GLYPHS: Record<string, string> = {
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  panels: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M3.5 9.5h17M9 9.5v10"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="3"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8"/>',
  burst: '<path d="M7 17 17 7M9.5 7H17v7.5"/>',
  spark: '<path d="M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6.5 6.5l2.2 2.2M15.3 15.3l2.2 2.2M6.5 17.5l2.2-2.2M15.3 8.7l2.2-2.2"/>',
  monitor: '<rect x="3" y="4.5" width="18" height="12" rx="2.5"/><path d="M9 20h6M12 16.5V20"/>',
  sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z"/>',
  undo: '<path d="M4 5v5h5"/><path d="M4.6 14.5A8 8 0 1 0 6.3 6.3L4 10"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 6 8.5-6"/>',
  pen: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  pointer: '<path d="M6 3.5 19 10l-5.8 1.8L11 18 6 3.5Z"/>',
  topbar: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M3.5 9h17M6.5 6.8h.01M9 6.8h.01"/>',
  columns: '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M9 4.5v15M15 4.5v15"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
};

function glyph(name: string, cls = 'glyph') {
  const span = el('span', cls);
  fillGlyph(span, name);
  return span;
}

function fillGlyph(span: HTMLElement, name: string) {
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[name] ?? GLYPHS.keyboard}</svg>`;
}

document.querySelectorAll<HTMLElement>('[data-glyph]').forEach((s) => fillGlyph(s, s.dataset.glyph!));

const GROUP_GLYPHS: Record<string, string> = {
  navigation: 'arrow',
  emailActions: 'mail',
  compose: 'pen',
  rsvp: 'calendar',
  hoverActions: 'pointer',
  'Top bar': 'topbar',
  Layout: 'columns',
};

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
    head.append(glyph(GROUP_GLYPHS[group.id] ?? 'keyboard', 'glyph group-glyph'));
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
  presetStatusEl.replaceChildren();
  if (active === 'custom') presetStatusEl.append(glyph('info'), 'Custom: your switches no longer match a preset.');

  appearanceGroupsEl.replaceChildren();
  for (const group of APPEARANCE_GROUPS) {
    const section = el('section', 'group');
    const head = el('div', 'group-head');
    head.append(glyph(GROUP_GLYPHS[group.label] ?? 'panels', 'glyph group-glyph'), el('h3', undefined, group.label));
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
