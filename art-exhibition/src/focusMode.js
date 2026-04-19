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

  const info = group.userData.info || {};
  const tex  = group.userData.artTexture;

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    position: 'fixed', top: '20px', right: '24px',
    background: 'transparent', border: 'none',
    color: 'rgba(255,255,255,0.45)', fontSize: '22px',
    cursor: 'pointer', zIndex: 601, lineHeight: '1',
    fontFamily: 'sans-serif',
    transition: 'color 0.15s',
  });
  closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#fff');
  closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'rgba(255,255,255,0.45)');
  closeBtn.addEventListener('click', closeFocus);
  _overlay.appendChild(closeBtn);

  // Artwork wrapper (blocks overlay dismiss clicks)
  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    position: 'relative',
    maxHeight: '70vh', maxWidth: '90vw',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none',
  });
  wrap.addEventListener('click', e => e.stopPropagation());

  if (group.userData.isVideo && group.userData.videoEl) {
    const vid = document.createElement('video');
    vid.src      = group.userData.videoEl.src;
    vid.controls = true;
    vid.autoplay = true;
    vid.loop     = true;
    Object.assign(vid.style, {
      maxHeight: '70vh', maxWidth: '90vw',
      borderRadius: '4px', display: 'block',
    });
    wrap.appendChild(vid);
  } else if (tex?.image instanceof HTMLImageElement) {
    const img = document.createElement('img');
    img.src = tex.image.src;
    Object.assign(img.style, {
      maxHeight: '70vh', maxWidth: '90vw',
      objectFit: 'contain', borderRadius: '4px', display: 'block',
    });
    wrap.appendChild(img);

    // Video URL button (overlaid on bottom of image)
    if (info.videoURL) {
      const a = document.createElement('a');
      a.href   = info.videoURL;
      a.target = '_blank';
      a.rel    = 'noopener noreferrer';
      a.textContent = '▶  Watch Video';
      Object.assign(a.style, {
        position: 'absolute', bottom: '16px', left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.62)',
        color: '#fff', padding: '8px 20px', borderRadius: '20px',
        textDecoration: 'none', fontSize: '13px',
        fontFamily: 'Georgia, serif', letterSpacing: '0.06em',
        backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.2)',
        whiteSpace: 'nowrap', transition: 'background 0.15s',
      });
      a.addEventListener('mouseenter', () => a.style.background = 'rgba(0,0,0,0.88)');
      a.addEventListener('mouseleave', () => a.style.background = 'rgba(0,0,0,0.62)');
      a.addEventListener('click', e => e.stopPropagation());
      wrap.appendChild(a);
    }
  }

  // Swipe-right gesture on the artwork itself
  let _swipeX = null;
  wrap.addEventListener('mousedown', e => { _swipeX = e.clientX; });
  wrap.addEventListener('mouseup', e => {
    if (_swipeX !== null && e.clientX - _swipeX > 100) _swipeCb?.(_currentGroup);
    _swipeX = null;
  });

  _overlay.appendChild(wrap);

  // Info block
  const hasInfo = info.title || info.artist || info.year || info.medium || info.description;
  if (hasInfo) {
    const infoDiv = document.createElement('div');
    Object.assign(infoDiv.style, {
      marginTop: '20px',
      color: 'rgba(255,255,255,0.85)',
      fontFamily: 'Georgia, serif',
      textAlign: 'center',
      maxWidth: '520px', padding: '0 16px',
    });
    infoDiv.addEventListener('click', e => e.stopPropagation());

    if (info.title) {
      const t = document.createElement('div');
      t.textContent = info.title;
      Object.assign(t.style, { fontSize: '18px', fontWeight: 'bold', marginBottom: '6px' });
      infoDiv.appendChild(t);
    }
    if (info.artist || info.year) {
      const a = document.createElement('div');
      a.textContent = [info.artist, info.year].filter(Boolean).join(',  ');
      Object.assign(a.style, { fontSize: '13px', opacity: '0.68', marginBottom: '4px' });
      infoDiv.appendChild(a);
    }
    if (info.medium || info.dimensions) {
      const m = document.createElement('div');
      m.textContent = [info.medium, info.dimensions].filter(Boolean).join('  ·  ');
      Object.assign(m.style, { fontSize: '12px', opacity: '0.48', marginBottom: '8px' });
      infoDiv.appendChild(m);
    }
    if (info.description) {
      const d = document.createElement('div');
      d.textContent = info.description;
      Object.assign(d.style, {
        fontSize: '13px', opacity: '0.6',
        lineHeight: '1.65', fontStyle: 'italic',
        maxWidth: '480px', margin: '0 auto',
      });
      infoDiv.appendChild(d);
    }

    _overlay.appendChild(infoDiv);
  }

  // Hint
  const hint = document.createElement('div');
  hint.textContent = 'ESC or click outside to close  ·  → for details';
  Object.assign(hint.style, {
    position: 'fixed', bottom: '20px',
    color: 'rgba(255,255,255,0.22)',
    fontSize: '11px', fontFamily: 'Georgia, serif',
    letterSpacing: '0.04em', pointerEvents: 'none',
  });
  _overlay.appendChild(hint);
}
