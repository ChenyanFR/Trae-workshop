import { setControlsEnabled } from './controls.js';

let _overlay      = null;
let _isOpen       = false;
let _currentGroup = null;
let _onBack       = null;
let _allArtworks  = [];
let _currentIndex = 0;
let _leftNav      = null;
let _rightNav     = null;
let _contentWrap  = null;

export function isDetailOpen() { return _isOpen; }

// ─── Public API ───────────────────────────────────────────────────────────────
export function openDetail(group, allArtworks = [], onBack = null) {
  _allArtworks  = allArtworks.length ? allArtworks : (group ? [group] : []);
  _currentIndex = Math.max(_allArtworks.indexOf(group), 0);
  _currentGroup = group;
  _onBack       = onBack;
  if (!_overlay) { injectStyles(); buildOverlay(); }
  populateContent(group);
  updateDetailNav();
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

// ─── Internal navigation ──────────────────────────────────────────────────────
function detailGoNext() {
  if (_allArtworks.length < 2) return;
  switchDetailTo((_currentIndex + 1) % _allArtworks.length);
}

function detailGoPrev() {
  if (_allArtworks.length < 2) return;
  switchDetailTo((_currentIndex - 1 + _allArtworks.length) % _allArtworks.length);
}

function switchDetailTo(newIdx) {
  if (!_contentWrap) return;
  _contentWrap.style.transition = 'opacity 0.15s ease-out';
  _contentWrap.style.opacity = '0';
  setTimeout(() => {
    _overlay.querySelectorAll('video').forEach(v => { v.pause(); v.src = ''; });
    _currentIndex = newIdx;
    _currentGroup = _allArtworks[newIdx];
    populateContent(_currentGroup);
    updateDetailNav();
    requestAnimationFrame(() => {
      _contentWrap.style.transition = 'opacity 0.15s ease-in';
      _contentWrap.style.opacity = '1';
    });
  }, 150);
}

function updateDetailNav() {
  if (!_leftNav || !_rightNav) return;
  const show = _allArtworks.length > 1;
  _leftNav.style.display  = show ? 'flex' : 'none';
  _rightNav.style.display = show ? 'flex' : 'none';
}

// ─── Internal: go back to focus mode ─────────────────────────────────────────
function goBack() {
  if (!_isOpen) return;
  const cb    = _onBack;
  const group = _currentGroup;
  const idx   = _currentIndex;
  _isOpen = false;
  _overlay.style.opacity = '0';
  setTimeout(() => {
    if (_isOpen) return;
    _overlay.style.display = 'none';
    _overlay.querySelectorAll('video').forEach(v => { v.pause(); v.src = ''; });
    cb?.(group, idx);
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
    #artwork-detail-overlay .det-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.2) transparent; }
    #artwork-detail-overlay .det-scroll::-webkit-scrollbar { width: 6px; }
    #artwork-detail-overlay .det-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
  `;
  document.head.appendChild(s);
}

// ─── Nav button factory ───────────────────────────────────────────────────────
function makeDetailNavBtn(label, side, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    position: 'fixed', top: '50%', transform: 'translateY(-50%)',
    [side]: '24px',
    width: '48px', height: '48px',
    borderRadius: '50%', border: '1px solid rgba(90,70,50,0.25)',
    background: 'rgba(90,70,50,0.08)',
    color: '#5a3a20', fontSize: '20px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.18s, border-color 0.18s',
    zIndex: 701, fontFamily: 'sans-serif',
  });
  btn.addEventListener('mouseenter', () => {
    btn.style.background   = 'rgba(90,70,50,0.18)';
    btn.style.borderColor  = 'rgba(90,70,50,0.5)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background   = 'rgba(90,70,50,0.08)';
    btn.style.borderColor  = 'rgba(90,70,50,0.25)';
  });
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return btn;
}

// ─── Shell overlay ────────────────────────────────────────────────────────────
function buildOverlay() {
  _overlay = document.createElement('div');
  _overlay.id = 'artwork-detail-overlay';
  Object.assign(_overlay.style, {
    position: 'fixed', inset: '0',
    background: '#f5f1e8',
    zIndex: 700,
    display: 'none', flexDirection: 'column',
    opacity: '0', overflow: 'hidden',
  });

  // Back button
  const backBtn = document.createElement('button');
  backBtn.textContent = '← Back';
  Object.assign(backBtn.style, {
    position: 'fixed', top: '28px', left: '32px',
    background: 'transparent', border: 'none',
    color: '#8a7a6a', fontSize: '14px',
    fontFamily: "Georgia, 'SimSun', '宋体', serif",
    letterSpacing: '0.04em', cursor: 'pointer',
    zIndex: 702, padding: '4px 8px',
    transition: 'color 0.15s',
  });
  backBtn.addEventListener('mouseenter', () => backBtn.style.color = '#2a2218');
  backBtn.addEventListener('mouseleave', () => backBtn.style.color = '#8a7a6a');
  backBtn.addEventListener('click', goBack);
  _overlay.appendChild(backBtn);

  // Left / Right nav buttons
  _leftNav  = makeDetailNavBtn('←', 'left',  detailGoPrev);
  _rightNav = makeDetailNavBtn('→', 'right', detailGoNext);
  _overlay.appendChild(_leftNav);
  _overlay.appendChild(_rightNav);

  // Content wrapper (fades during artwork switch)
  _contentWrap = document.createElement('div');
  Object.assign(_contentWrap.style, {
    display: 'flex', flexDirection: 'row',
    width: '100%', height: '100vh',
    overflow: 'hidden',
  });
  _overlay.appendChild(_contentWrap);

  // Keyboard shortcuts (capture phase)
  document.addEventListener('keydown', e => {
    if (!_isOpen) return;
    if (e.key === 'Escape' || e.key === 'ArrowUp') {
      goBack(); e.stopImmediatePropagation();
    } else if (e.key === 'ArrowLeft') {
      detailGoPrev(); e.stopImmediatePropagation();
    } else if (e.key === 'ArrowRight') {
      detailGoNext(); e.stopImmediatePropagation();
    }
  }, true);

  // Up-swipe >80px → goBack
  let _sy = null;
  _overlay.addEventListener('mousedown', e => { _sy = e.clientY; });
  _overlay.addEventListener('mouseup', e => {
    if (_sy !== null && _sy - e.clientY > 80) goBack();
    _sy = null;
  });

  document.body.appendChild(_overlay);
}

// ─── Content ──────────────────────────────────────────────────────────────────
function populateContent(group) {
  _contentWrap.innerHTML = '';

  const info = group.userData.info || {};
  const tex  = group.userData.artTexture;

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

  _contentWrap.appendChild(leftPanel);

  // ── Right panel: sticky header + scrollable body ──────────────────────────
  const rightPanel = document.createElement('div');
  rightPanel.className = 'det-right';
  Object.assign(rightPanel.style, {
    flex: '1', display: 'flex', flexDirection: 'column',
    height: '100vh', boxSizing: 'border-box', overflow: 'hidden',
  });

  // Sticky header: title + subtitle
  const header = document.createElement('div');
  Object.assign(header.style, {
    flexShrink: '0',
    padding: '60px 80px 30px 80px',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
    background: '#f5f1e8',
  });

  const h1 = document.createElement('h1');
  h1.textContent = info.title || 'Untitled';
  Object.assign(h1.style, {
    fontFamily: "'SimSun', '宋体', 'Noto Serif SC', Georgia, serif",
    fontSize: '42px', fontWeight: 'normal',
    color: '#2a2218', margin: '0 0 12px 0', lineHeight: '1.2',
  });
  header.appendChild(h1);

  const subtitleParts = [info.artist, info.year].filter(Boolean);
  if (subtitleParts.length) {
    const sub = document.createElement('div');
    sub.textContent = subtitleParts.join('  ·  ');
    Object.assign(sub.style, {
      fontSize: '14px', color: '#8a7a6a',
      fontFamily: 'Georgia, serif', fontStyle: 'italic',
    });
    header.appendChild(sub);
  }
  rightPanel.appendChild(header);

  // Scrollable content area
  const scrollArea = document.createElement('div');
  scrollArea.className = 'det-scroll';
  Object.assign(scrollArea.style, {
    flex: '1', overflowY: 'auto',
    padding: '30px 60px 60px 80px', boxSizing: 'border-box',
  });

  // Video URL player (16:9)
  if (info.videoURL) {
    const embedUrl  = getEmbedUrl(info.videoURL);
    const isDirectV = /\.(mp4|webm|ogg)(\?|$)/i.test(info.videoURL) || /^blob:/.test(info.videoURL);
    const aspect = document.createElement('div');
    Object.assign(aspect.style, {
      position: 'relative', width: '100%',
      paddingTop: '56.25%', marginBottom: '32px',
      background: '#000', borderRadius: '4px', overflow: 'hidden',
    });
    if (embedUrl) {
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      Object.assign(iframe.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', border: 'none' });
      aspect.appendChild(iframe);
    } else if (isDirectV) {
      const vid = document.createElement('video');
      vid.src = info.videoURL; vid.controls = true;
      Object.assign(vid.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%' });
      aspect.appendChild(vid);
    }
    scrollArea.appendChild(aspect);
  }

  // Description
  if (info.description) {
    const desc = document.createElement('div');
    Object.assign(desc.style, {
      fontSize: '15px', lineHeight: '2.0',
      color: '#3a3228', textIndent: '2em', marginBottom: '40px',
    });
    const paragraphs = info.description.split('\n').filter(p => p.trim());
    if (paragraphs.length > 1) {
      paragraphs.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text; p.style.margin = '0 0 1em 0';
        desc.appendChild(p);
      });
    } else {
      desc.textContent = info.description;
    }
    scrollArea.appendChild(desc);
  }

  // Meta (medium + dimensions; artist/year already in header)
  const metaRows = [
    ['Medium',     info.medium],
    ['Dimensions', info.dimensions],
  ].filter(([, v]) => v);

  if (metaRows.length || info.videoURL) {
    const meta = document.createElement('div');
    Object.assign(meta.style, {
      paddingTop: '20px',
      borderTop: '1px solid rgba(90,70,50,0.18)',
      fontSize: '12px', color: '#8a7a6a', fontFamily: 'Georgia, serif',
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
        color: '#7a5020', fontSize: '12px', fontFamily: 'Georgia, serif',
        textDecoration: 'none', letterSpacing: '0.04em', transition: 'color 0.15s',
      });
      link.addEventListener('mouseenter', () => link.style.color = '#c8903a');
      link.addEventListener('mouseleave', () => link.style.color = '#7a5020');
      meta.appendChild(link);
    }
    scrollArea.appendChild(meta);
  }

  rightPanel.appendChild(scrollArea);
  _contentWrap.appendChild(rightPanel);
}

// ─── Embed URL helper ─────────────────────────────────────────────────────────
function getEmbedUrl(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
