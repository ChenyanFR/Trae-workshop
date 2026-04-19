import { setControlsEnabled } from './controls.js';

let _overlay      = null;
let _isOpen       = false;
let _currentGroup = null;
let _onBack       = null;

export function isDetailOpen() { return _isOpen; }

// ─── Public API ───────────────────────────────────────────────────────────────
export function openDetail(group, onBack = null) {
  _currentGroup = group;
  _onBack       = onBack;
  if (!_overlay) { injectStyles(); buildOverlay(); }
  populateOverlay(group);
  _isOpen = true;
  setControlsEnabled(false);
  _overlay.style.display = 'flex';
  requestAnimationFrame(() => { _overlay.style.opacity = '1'; });
}

export function closeDetail() {
  if (!_isOpen) return;
  _isOpen = false;
  _overlay.style.opacity = '0';
  setTimeout(() => {
    if (_isOpen) return;
    _overlay.style.display = 'none';
    _overlay.querySelectorAll('video').forEach(v => { v.pause(); v.src = ''; });
    setControlsEnabled(true);
  }, 400);
}

// ─── Internal: go back to focus mode ─────────────────────────────────────────
function goBack() {
  if (!_isOpen) return;
  const cb    = _onBack;
  const group = _currentGroup;
  _isOpen = false;
  _overlay.style.opacity = '0';
  setTimeout(() => {
    if (_isOpen) return;
    _overlay.style.display = 'none';
    _overlay.querySelectorAll('video').forEach(v => { v.pause(); v.src = ''; });
    cb?.(group); // re-open focus mode (controls handed back by focusMode)
  }, 300);
}

// ─── CSS animations ───────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('artwork-detail-css')) return;
  const s = document.createElement('style');
  s.id = 'artwork-detail-css';
  s.textContent = `
    @keyframes detailSlideLeft {
      from { opacity: 0; transform: translateX(-60px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes detailSlideRight {
      from { opacity: 0; transform: translateX(60px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    #artwork-detail-overlay { transition: opacity 0.4s ease; }
    #artwork-detail-overlay .det-left  { animation: detailSlideLeft  0.5s ease-out both; }
    #artwork-detail-overlay .det-right { animation: detailSlideRight 0.5s ease-out 0.1s both; }
    #artwork-detail-overlay .det-right::-webkit-scrollbar { width: 4px; }
    #artwork-detail-overlay .det-right::-webkit-scrollbar-thumb { background: rgba(90,70,50,0.25); border-radius: 2px; }
    #artwork-detail-overlay .det-desc::-webkit-scrollbar { width: 4px; }
    #artwork-detail-overlay .det-desc::-webkit-scrollbar-thumb { background: rgba(90,70,50,0.18); border-radius: 2px; }
  `;
  document.head.appendChild(s);
}

// ─── Shell overlay ────────────────────────────────────────────────────────────
function buildOverlay() {
  _overlay = document.createElement('div');
  _overlay.id = 'artwork-detail-overlay';
  Object.assign(_overlay.style, {
    position: 'fixed', inset: '0',
    background: '#f5f1e8',
    zIndex: 700,
    display: 'none', flexDirection: 'row',
    opacity: '0', overflow: 'hidden',
  });

  document.addEventListener('keydown', e => {
    if (!_isOpen) return;
    if (e.key === 'Escape' || e.key === 'ArrowLeft') {
      goBack();
      e.stopImmediatePropagation();
    }
  }, true);

  document.body.appendChild(_overlay);
}

// ─── Content ──────────────────────────────────────────────────────────────────
function populateOverlay(group) {
  _overlay.innerHTML = '';

  const info = group.userData.info || {};
  const tex  = group.userData.artTexture;

  // ── Back button ────────────────────────────────────────────────────────────
  const backBtn = document.createElement('button');
  backBtn.textContent = '← Back';
  Object.assign(backBtn.style, {
    position: 'fixed', top: '28px', left: '32px',
    background: 'transparent', border: 'none',
    color: '#8a7a6a', fontSize: '14px',
    fontFamily: "Georgia, 'SimSun', '宋体', serif",
    letterSpacing: '0.04em', cursor: 'pointer',
    zIndex: 701, padding: '4px 8px',
    transition: 'color 0.15s',
  });
  backBtn.addEventListener('mouseenter', () => backBtn.style.color = '#2a2218');
  backBtn.addEventListener('mouseleave', () => backBtn.style.color = '#8a7a6a');
  backBtn.addEventListener('click', goBack);
  _overlay.appendChild(backBtn);

  // ── Left panel: artwork image ──────────────────────────────────────────────
  const leftPanel = document.createElement('div');
  leftPanel.className = 'det-left';
  Object.assign(leftPanel.style, {
    width: '45%', flexShrink: '0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '60px', boxSizing: 'border-box',
    background: '#ede9e0',
    overflow: 'hidden',
  });

  if (group.userData.isVideo && group.userData.videoEl) {
    const vid = document.createElement('video');
    vid.src = group.userData.videoEl.src;
    vid.controls = true; vid.autoplay = true; vid.loop = true;
    Object.assign(vid.style, {
      maxHeight: '80vh', maxWidth: '100%',
      boxShadow: '0 24px 64px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.10)',
      display: 'block',
    });
    leftPanel.appendChild(vid);
  } else if (tex?.image instanceof HTMLImageElement) {
    const img = document.createElement('img');
    img.src = tex.image.src;
    Object.assign(img.style, {
      maxHeight: '80vh', maxWidth: '100%',
      objectFit: 'contain', display: 'block',
      boxShadow: '0 24px 64px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.10)',
    });
    leftPanel.appendChild(img);
  }

  // Left-swipe gesture to go back
  addSwipeLeft(leftPanel, goBack);
  _overlay.appendChild(leftPanel);

  // ── Right panel: info card ─────────────────────────────────────────────────
  const rightPanel = document.createElement('div');
  rightPanel.className = 'det-right';
  Object.assign(rightPanel.style, {
    flex: '1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '80px 0', boxSizing: 'border-box',
    overflowY: 'auto',
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    background: 'rgba(255,255,255,0.70)',
    padding: '60px 80px',
    borderRadius: '2px',
    maxWidth: '560px', width: '100%',
    boxSizing: 'border-box',
  });

  // Title
  const h1 = document.createElement('h1');
  h1.textContent = info.title || 'Untitled';
  Object.assign(h1.style, {
    fontFamily: "'SimSun', '宋体', 'Noto Serif SC', Georgia, serif",
    fontSize: '42px', fontWeight: 'normal',
    color: '#2a2218', margin: '0 0 40px 0', lineHeight: '1.2',
  });
  card.appendChild(h1);

  // Description (scrollable)
  if (info.description) {
    const desc = document.createElement('div');
    desc.className = 'det-desc';
    Object.assign(desc.style, {
      fontSize: '15px', lineHeight: '2.0',
      color: '#3a3228', textIndent: '2em',
      maxHeight: '40vh', overflowY: 'auto',
    });
    const paragraphs = info.description.split('\n').filter(p => p.trim());
    if (paragraphs.length > 1) {
      paragraphs.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        p.style.margin = '0 0 1em 0';
        desc.appendChild(p);
      });
    } else {
      desc.textContent = info.description;
    }
    card.appendChild(desc);
  }

  // Meta
  const metaRows = [
    ['Artist',     info.artist],
    ['Year',       info.year],
    ['Medium',     info.medium],
    ['Dimensions', info.dimensions],
  ].filter(([, v]) => v);

  if (metaRows.length || info.videoURL) {
    const meta = document.createElement('div');
    Object.assign(meta.style, {
      marginTop: '40px', paddingTop: '20px',
      borderTop: '1px solid rgba(90,70,50,0.18)',
      fontSize: '12px', color: '#8a7a6a',
      fontFamily: 'Georgia, serif',
    });
    metaRows.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.style.marginBottom = '8px';
      row.innerHTML = `<span style="opacity:0.55">${label}</span>&ensp;<span>${value}</span>`;
      meta.appendChild(row);
    });
    if (info.videoURL) {
      const link = document.createElement('a');
      link.href = info.videoURL; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.textContent = '▶  Watch Video';
      Object.assign(link.style, {
        display: 'inline-block', marginTop: '12px',
        color: '#7a5020', fontSize: '12px',
        fontFamily: 'Georgia, serif', textDecoration: 'none',
        letterSpacing: '0.04em', transition: 'color 0.15s',
      });
      link.addEventListener('mouseenter', () => link.style.color = '#c8903a');
      link.addEventListener('mouseleave', () => link.style.color = '#7a5020');
      meta.appendChild(link);
    }
    card.appendChild(meta);
  }

  rightPanel.appendChild(card);
  addSwipeLeft(rightPanel, goBack);
  _overlay.appendChild(rightPanel);
}

// ─── Swipe-left helper ────────────────────────────────────────────────────────
function addSwipeLeft(el, fn) {
  let startX = null;
  el.addEventListener('mousedown', e => { startX = e.clientX; });
  el.addEventListener('mouseup',   e => {
    if (startX !== null && startX - e.clientX > 100) fn();
    startX = null;
  });
}
