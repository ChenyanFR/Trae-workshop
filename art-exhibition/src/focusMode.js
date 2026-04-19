import { setControlsEnabled } from './controls.js';

let _overlay      = null;
let _isOpen       = false;
let _swipeCb      = null;
let _currentGroup = null;

export function isFocusOpen()          { return _isOpen; }
export function onFocusSwipeRight(fn)  { _swipeCb = fn; }

// ─── Public API ───────────────────────────────────────────────────────────────
export function openFocus(group) {
  _currentGroup = group;
  if (!_overlay) buildOverlay();
  populateOverlay(group);
  _isOpen = true;
  setControlsEnabled(false);
  _overlay.style.display = 'flex';
  requestAnimationFrame(() => { _overlay.style.opacity = '1'; });
}

// restoreControls=false when handing off to detail page so controls stay locked
export function closeFocus(restoreControls = true) {
  if (!_isOpen) return;
  _isOpen = false;
  _overlay.style.opacity = '0';
  setTimeout(() => {
    if (_isOpen) return; // re-opened before timeout
    _overlay.style.display = 'none';
    _overlay.innerHTML = '';
    if (restoreControls) setControlsEnabled(true);
  }, 300);
}

// ─── Build persistent shell ───────────────────────────────────────────────────
function buildOverlay() {
  _overlay = document.createElement('div');
  Object.assign(_overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(0,0,0,0.82)',
    zIndex: 600,
    display: 'none', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    opacity: '0',
    transition: 'opacity 0.3s ease',
  });
  _overlay.addEventListener('click', e => { if (e.target === _overlay) closeFocus(); });

  // ESC captured before artwork.js's window keydown
  document.addEventListener('keydown', e => {
    if (!_isOpen) return;
    if (e.key === 'Escape')     { closeFocus();                        e.stopImmediatePropagation(); }
    if (e.key === 'ArrowRight') { _swipeCb?.(_currentGroup);           e.stopImmediatePropagation(); }
  }, true);

  document.body.appendChild(_overlay);
}

// ─── Fill content per artwork ─────────────────────────────────────────────────
function populateOverlay(group) {
  _overlay.innerHTML = '';

  const tex = group.userData.artTexture;

  // ── Close button (top-right) ──────────────────────────────────────────────
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'fixed', top: '20px', right: '24px',
    background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.45)', fontSize: '22px',
    cursor: 'pointer', zIndex: 601, lineHeight: '1',
    fontFamily: 'sans-serif', transition: 'color 0.15s',
  });
  closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#fff');
  closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'rgba(255,255,255,0.45)');
  closeBtn.addEventListener('click', closeFocus);
  _overlay.appendChild(closeBtn);

  // ── Row: artwork + arrow button ───────────────────────────────────────────
  const row = document.createElement('div');
  Object.assign(row.style, {
    display: 'flex', alignItems: 'center', gap: '40px',
  });
  row.addEventListener('click', e => e.stopPropagation());

  // Artwork
  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    position: 'relative',
    maxHeight: '70vh', maxWidth: 'calc(90vw - 90px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none',
  });

  if (group.userData.isVideo && group.userData.videoEl) {
    const vid = document.createElement('video');
    vid.src = group.userData.videoEl.src;
    vid.controls = true; vid.autoplay = true; vid.loop = true;
    Object.assign(vid.style, {
      maxHeight: '70vh', maxWidth: '100%', borderRadius: '4px', display: 'block',
    });
    wrap.appendChild(vid);
  } else if (tex?.image instanceof HTMLImageElement) {
    const img = document.createElement('img');
    img.src = tex.image.src;
    Object.assign(img.style, {
      maxHeight: '70vh', maxWidth: '100%',
      objectFit: 'contain', borderRadius: '4px', display: 'block',
    });
    wrap.appendChild(img);
  }

  // Swipe-right gesture
  let _swipeX = null;
  wrap.addEventListener('mousedown', e => { _swipeX = e.clientX; });
  wrap.addEventListener('mouseup',   e => {
    if (_swipeX !== null && e.clientX - _swipeX > 100) _swipeCb?.(_currentGroup);
    _swipeX = null;
  });

  row.appendChild(wrap);

  // Arrow button → details
  const arrowBtn = document.createElement('button');
  arrowBtn.textContent = '→';
  Object.assign(arrowBtn.style, {
    width: '50px', height: '50px', flexShrink: '0',
    borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff', fontSize: '20px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.18s, border-color 0.18s',
  });
  arrowBtn.addEventListener('mouseenter', () => {
    arrowBtn.style.background = 'rgba(255,255,255,0.25)';
    arrowBtn.style.borderColor = 'rgba(255,255,255,0.6)';
  });
  arrowBtn.addEventListener('mouseleave', () => {
    arrowBtn.style.background = 'rgba(255,255,255,0.1)';
    arrowBtn.style.borderColor = 'rgba(255,255,255,0.3)';
  });
  arrowBtn.addEventListener('click', () => _swipeCb?.(_currentGroup));
  row.appendChild(arrowBtn);

  _overlay.appendChild(row);

  // ── Minimal hint ──────────────────────────────────────────────────────────
  const hint = document.createElement('div');
  hint.textContent = 'ESC to close  ·  → for details';
  Object.assign(hint.style, {
    position: 'fixed', bottom: '20px',
    color: 'rgba(255,255,255,0.25)',
    fontSize: '11px', fontFamily: 'Georgia, serif',
    letterSpacing: '0.04em', pointerEvents: 'none',
  });
  _overlay.appendChild(hint);
}
