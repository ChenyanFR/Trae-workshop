export const MODES = {
  CURATOR: 'curator',
  VISITOR: 'visitor',
};

let _mode = MODES.CURATOR;
const _listeners = [];

export function getMode()   { return _mode; }
export function isCurator() { return _mode === MODES.CURATOR; }

export function setMode(mode) {
  if (_mode === mode) return;
  _mode = mode;
  _listeners.forEach(fn => fn(mode));
}

export function toggleMode() {
  setMode(_mode === MODES.CURATOR ? MODES.VISITOR : MODES.CURATOR);
}

export function onModeChange(fn) { _listeners.push(fn); }

// ─── Mode toggle button ───────────────────────────────────────────────────────
export function initModeUI() {
  const btn = document.createElement('button');

  const STYLES = {
    [MODES.CURATOR]: {
      bg:     'rgba(20,12,4,0.82)',
      bgHov:  'rgba(90,50,10,0.9)',
      color:  '#f0e6d0',
      border: '1px solid #8a6a3a',
      label:  '✎  Curator',
    },
    [MODES.VISITOR]: {
      bg:     'rgba(8,14,24,0.85)',
      bgHov:  'rgba(18,36,64,0.92)',
      color:  '#c0d8f0',
      border: '1px solid #3a5a8a',
      label:  '👁  Visitor',
    },
  };

  Object.assign(btn.style, {
    position: 'fixed', top: '154px', left: '16px',
    padding: '10px 16px',
    borderRadius: '6px', cursor: 'pointer',
    fontSize: '14px', fontFamily: 'serif',
    letterSpacing: '0.04em', zIndex: 100,
    backdropFilter: 'blur(4px)',
    transition: 'background 0.18s, color 0.18s, border-color 0.18s',
  });

  function applyStyle() {
    const s = STYLES[_mode];
    btn.textContent = s.label;
    btn.style.background  = s.bg;
    btn.style.color       = s.color;
    btn.style.border      = s.border;
  }

  applyStyle();
  onModeChange(applyStyle);

  btn.addEventListener('mouseenter', () => { btn.style.background = STYLES[_mode].bgHov; });
  btn.addEventListener('mouseleave', () => { btn.style.background = STYLES[_mode].bg;    });
  btn.addEventListener('click', toggleMode);

  document.body.appendChild(btn);
}
