import { setControlsEnabled } from './controls.js';
import { openDetail } from './artworkDetail.js';

let _overlay  = null;
let _artWrap  = null;
let _leftNav  = null;
let _rightNav = null;
let _isOpen   = false;
let _current  = null;
let _artworks = [];
let _index    = 0;

export function isFocusOpen() { return _isOpen; }

// ─── Public API ───────────────────────────────────────────────────────────────
export function openFocus(group, allArtworks = []) {
  _artworks = allArtworks.length ? allArtworks : (group ? [group] : []);
  _index    = Math.max(_artworks.indexOf(group), 0);
  _current  = group;

  if (!_overlay) { injectCSS(); buildShell(); }
  rebuildContent(group, null);
  updateNav();

  _isOpen = true;
  setControlsEnabled(false);
  _overlay.style.display = 'flex';
  requestAnimationFrame(() => { _overlay.style.opacity = '1'; });
}

export function closeFocus(restoreControls = true) {
  if (!_isOpen) return;
  _isOpen = false;
  _overlay.style.opacity = '0';
  setTimeout(() => {
    if (_isOpen) return;
    _overlay.style.display = 'none';
    if (_artWrap) _artWrap.innerHTML = '';
    if (restoreControls) setControlsEnabled(true);
  }, 300);
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function goNext() { if (_artworks.length > 1) switchTo((_index + 1) % _artworks.length, 'next'); }
function goPrev() { if (_artworks.length > 1) switchTo((_index - 1 + _artworks.length) % _artworks.length, 'prev'); }

function switchTo(newIdx, dir) {
  if (!_artWrap) return;
  const exitX = dir === 'next' ? '-60px' : '60px';
  _artWrap.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
  _artWrap.style.transform  = `translateX(${exitX})`;
  _artWrap.style.opacity    = '0';
  setTimeout(() => {
    _index   = newIdx;
    _current = _artworks[newIdx];
    rebuildContent(_current, dir);
    updateNav();
  }, 200);
}

function goDetail() {
  if (!_current) return;
  closeFocus(false);
  openDetail(_current, _artworks, (g, idx) => {
    _index   = (idx !== undefined && idx >= 0) ? idx : Math.max(_artworks.indexOf(g), 0);
    _current = _artworks[_index] || g;
    openFocus(_current, _artworks);
  });
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
function injectCSS() {
  if (document.getElementById('focus-mode-css')) return;
  const s = document.createElement('style');
  s.id = 'focus-mode-css';
  s.textContent = `#focus-overlay { transition: opacity 0.3s ease; }`;
  document.head.appendChild(s);
}

// ─── Nav button factory ───────────────────────────────────────────────────────
function makeNavBtn(label, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    position: 'fixed', top: '50%', transform: 'translateY(-50%)',
    width: '50px', height: '50px',
    borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff', fontSize: '20px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.18s, border-color 0.18s',
    zIndex: 601, fontFamily: 'sans-serif',
  });
  btn.addEventListener('mouseenter', () => {
    btn.style.background  = 'rgba(255,255,255,0.25)';
    btn.style.borderColor = 'rgba(255,255,255,0.6)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background  = 'rgba(255,255,255,0.1)';
    btn.style.borderColor = 'rgba(255,255,255,0.3)';
  });
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return btn;
}

// ─── Shell (built once) ───────────────────────────────────────────────────────
function buildShell() {
  _overlay = document.createElement('div');
  _overlay.id = 'focus-overlay';
  Object.assign(_overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(0,0,0,0.85)',
    zIndex: 600, display: 'none', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    opacity: '0',
  });
  _overlay.addEventListener('click', e => { if (e.target === _overlay) closeFocus(); });

  // Close button
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
  closeBtn.addEventListener('click', e => { e.stopPropagation(); closeFocus(); });
  _overlay.appendChild(closeBtn);

  // Left / Right nav buttons
  _leftNav = makeNavBtn('←', goPrev);
  _leftNav.style.left = '24px';
  _overlay.appendChild(_leftNav);

  _rightNav = makeNavBtn('→', goNext);
  _rightNav.style.right = '24px';
  _overlay.appendChild(_rightNav);

  // Artwork container
  _artWrap = document.createElement('div');
  Object.assign(_artWrap.style, {
    position: 'relative',
    maxHeight: '70vh', maxWidth: 'calc(90vw - 160px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none',
    transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
  });
  _artWrap.addEventListener('click', e => e.stopPropagation());
  _overlay.appendChild(_artWrap);

  // Details button — below artwork
  const detailBtn = document.createElement('button');
  detailBtn.textContent = '↓  View Details';
  Object.assign(detailBtn.style, {
    marginTop: '20px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.35)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px', fontFamily: 'Georgia, serif',
    letterSpacing: '0.08em', cursor: 'pointer',
    padding: '8px 24px', borderRadius: '20px',
    transition: 'background 0.18s, color 0.18s, border-color 0.18s',
    zIndex: 601,
  });
  detailBtn.addEventListener('mouseenter', () => {
    detailBtn.style.background   = 'rgba(255,255,255,0.15)';
    detailBtn.style.color        = '#fff';
    detailBtn.style.borderColor  = 'rgba(255,255,255,0.7)';
  });
  detailBtn.addEventListener('mouseleave', () => {
    detailBtn.style.background   = 'transparent';
    detailBtn.style.color        = 'rgba(255,255,255,0.7)';
    detailBtn.style.borderColor  = 'rgba(255,255,255,0.35)';
  });
  detailBtn.addEventListener('click', e => { e.stopPropagation(); goDetail(); });
  _overlay.appendChild(detailBtn);

  // Hint
  const hint = document.createElement('div');
  hint.textContent = '← → switch  ·  ESC close';
  Object.assign(hint.style, {
    position: 'fixed', bottom: '20px',
    color: 'rgba(255,255,255,0.25)',
    fontSize: '11px', fontFamily: 'Georgia, serif',
    letterSpacing: '0.04em', pointerEvents: 'none',
  });
  _overlay.appendChild(hint);

  // Keyboard shortcuts (capture phase — highest priority)
  document.addEventListener('keydown', e => {
    if (!_isOpen) return;
    if (e.key === 'Escape')     { closeFocus(); e.stopImmediatePropagation(); }
    if (e.key === 'ArrowLeft')  { goPrev();     e.stopImmediatePropagation(); }
    if (e.key === 'ArrowRight') { goNext();     e.stopImmediatePropagation(); }
    if (e.key === 'ArrowDown')  { goDetail();   e.stopImmediatePropagation(); }
  }, true);

  // Down-swipe on artwork or overlay → detail
  let _sy = null;
  _overlay.addEventListener('mousedown', e => { _sy = e.clientY; });
  _overlay.addEventListener('mouseup', e => {
    if (_sy !== null && e.clientY - _sy > 80) goDetail();
    _sy = null;
  });

  document.body.appendChild(_overlay);
}

// ─── Artwork content ──────────────────────────────────────────────────────────
function rebuildContent(group, enterDir) {
  const tex = group.userData.artTexture;

  // Position before content is shown
  _artWrap.style.transition = 'none';
  if (enterDir) {
    _artWrap.style.transform = `translateX(${enterDir === 'next' ? '60px' : '-60px'})`;
    _artWrap.style.opacity   = '0';
  } else {
    _artWrap.style.transform = 'translateX(0)';
    _artWrap.style.opacity   = '1';
  }

  _artWrap.innerHTML = '';

  if (group.userData.isVideo && group.userData.videoEl) {
    const vid = document.createElement('video');
    vid.src = group.userData.videoEl.src;
    vid.controls = true; vid.autoplay = true; vid.loop = true;
    Object.assign(vid.style, {
      maxHeight: '70vh', maxWidth: '100%', borderRadius: '4px', display: 'block',
    });
    _artWrap.appendChild(vid);
  } else if (tex?.image instanceof HTMLImageElement) {
    const img = document.createElement('img');
    img.src = tex.image.src;
    img.draggable = false;
    Object.assign(img.style, {
      maxHeight: '70vh', maxWidth: '100%',
      objectFit: 'contain', borderRadius: '4px', display: 'block',
      pointerEvents: 'none',
    });
    _artWrap.appendChild(img);
  }

  // Animate in
  if (enterDir) {
    requestAnimationFrame(() => {
      _artWrap.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
      _artWrap.style.transform  = 'translateX(0)';
      _artWrap.style.opacity    = '1';
    });
  }
}

// ─── Nav state ────────────────────────────────────────────────────────────────
function updateNav() {
  if (!_leftNav || !_rightNav) return;
  const show = _artworks.length > 1;
  _leftNav.style.display  = show ? 'flex' : 'none';
  _rightNav.style.display = show ? 'flex' : 'none';
}
