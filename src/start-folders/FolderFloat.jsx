'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import './FolderFloat.css';

const { Bodies, Body, Composite, Engine } = Matter;

const DEFAULT_ITEMS = ['Try a warmer palette', 'Tighten the spacing', 'Logo feels small', 'Love the new hero'];
const PAD = 28;
const CHAR = 6.8;
const GAP = 12;
const ROW = 52;
const DRAG_MIN = 4;
const ZONE_PAD = 8;
const COLLISION_GAP = 10;
const PHYSICS_STEP = 1000 / 120;
const MAX_FRAME_DELTA = 1000 / 30;

const jitter = i => {
  const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return x - Math.floor(x);
};

const layout = (list, spread, lift, tilt, sizes, rowGap) => {
  const rows = [];
  let row = [];
  let width = 0;
  list.forEach((item, i) => {
    const pw = sizes[i]?.w ?? PAD + item.label.length * CHAR;
    if (row.length && width + GAP + pw > spread * 2) {
      rows.push({ items: row, width });
      row = [];
      width = 0;
    }
    row.push({ i, pw });
    width += (row.length > 1 ? GAP : 0) + pw;
  });
  if (row.length) rows.push({ items: row, width });
  const pos = [];
  rows.forEach((r, ri) => {
    let x = -r.width / 2;
    const shift = (ri % 2 ? 1 : -1) * Math.min(16, spread * 0.1);
    r.items.forEach(({ i, pw }) => {
      const j = jitter(i);
      pos[i] = { x: x + pw / 2 + shift + (j - 0.5) * 6, y: -lift - ri * rowGap - j * 6, r: tilt * (j * 2 - 1) };
      x += pw + GAP;
    });
  });
  return pos;
};

export default function FolderFloat({
  items = DEFAULT_ITEMS,
  label = 'Design feedback',
  sublabel = '',
  trigger = 'hover',
  defaultOpen = false,
  open: controlledOpen,
  closeOnSelect = true,
  physics = true,
  drift = 0.5,
  onSelect,
  onOpenChange,
  folderColor = '#3f3f46',
  frontColor = '#52525b',
  paperColor = '#f5f5f5',
  itemColor = '#f5f5f5',
  itemTextColor = '#18181b',
  labelColor = '#f5f5f5',
  width = 200,
  height = 148,
  radius = 14,
  spread = 180,
  lift = 26,
  rowGap = ROW,
  tilt = 8,
  flapAngle = 34,
  restAngle = 16,
  openDuration = 520,
  stagger = 45,
  bounce = 0.3,
  className = ''
}) {
  const [internalOpen, setOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const itemsId = useId();
  const triggerRef = useRef(null);
  const [reduce, setReduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [popped, setPopped] = useState(-1);
  const [live, setLive] = useState(false);
  const [sizes, setSizes] = useState([]);
  const anchorRef = useRef(null);
  const pillRefs = useRef([]);
  const world = useRef({
    engine: null,
    bodies: [],
    sizes: [],
    raf: 0,
    last: 0,
    elapsed: 0,
    accumulator: 0,
    previous: [],
    rendered: [],
    drag: null,
    zone: null,
    live: false
  });
  const latest = useRef({});
  latest.current = { onSelect, onOpenChange, drift, reduce };
  const popTimer = useRef(undefined);
  const liveTimer = useRef(undefined);
  const list = items.map(item => (typeof item === 'string' ? { label: item, value: item } : item));
  const n = list.length;
  const sub = sublabel || `${n} ${n === 1 ? 'note' : 'notes'}`;
  const pos = layout(list, spread, lift, tilt, sizes, rowGap);
  const layoutKey = pos.map(p => `${p.x},${p.y}`).join('|');

  // Keep DOM positions in sync with measured pill sizes before CSS opens.
  // Without this, React's first measured layout and the initial physics layout
  // can start from different rows and appear to jump.
  useLayoutEffect(() => {
    if (world.current.engine) return;
    pillRefs.current.forEach((el, i) => {
      if (!el || !pos[i]) return;
      el.style.setProperty('--x', pos[i].x + 'px');
      el.style.setProperty('--y', pos[i].y + 'px');
    });
    // Physics owns positions after it starts. Reopening resyncs from the layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey, open]);

  const labelsKey = list.map(item => item.label).join('|');
  useLayoutEffect(() => {
    const measure = () => {
      const next = pillRefs.current.slice(0, n).map(el => (el ? { w: el.offsetWidth, h: el.offsetHeight } : null));
      if (next.some(s => !s)) return;
      setSizes(prev =>
        prev.length === next.length && prev.every((s, i) => s.w === next[i].w && s.h === next[i].h) ? prev : next
      );
    };
    measure();
    document.fonts?.ready.then(measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, labelsKey]);

  const stopPhysics = useCallback(() => {
    const w = world.current;
    clearTimeout(liveTimer.current);
    cancelAnimationFrame(w.raf);
    w.raf = 0;
    if (w.engine) {
      Composite.clear(w.engine.world, false, true);
      Engine.clear(w.engine);
      w.engine = null;
    }
    w.bodies = [];
    w.drag = null;
    w.live = false;
    setLive(false);
  }, []);

  const startPhysics = useCallback(() => {
    const w = world.current;
    if (w.engine) return;
    const els = pillRefs.current.slice(0, n);
    if (els.some(el => !el)) return;
    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    engine.enableSleeping = false;
    w.engine = engine;
    // Include the visible tilt and hover scale in each padded collision box.
    // Otherwise physics allows the rotated corners of neighboring pills to touch.
    w.sizes = els.map((el, i) => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const angle = Math.abs(pos[i].r) * Math.PI / 180;
      return {
        w, h,
        collisionW: (w * Math.cos(angle) + h * Math.sin(angle)) * 1.05 + COLLISION_GAP,
        collisionH: (h * Math.cos(angle) + w * Math.sin(angle)) * 1.05 + COLLISION_GAP
      };
    });

    const zone = {
      left: -spread - ZONE_PAD,
      right: spread + ZONE_PAD,
      top: Math.min(...pos.map((p, i) => p.y + (w.sizes[i].h - w.sizes[i].collisionH) / 2)) - ZONE_PAD,
      bottom: Math.max(...pos.map((p, i) => p.y + (w.sizes[i].h + w.sizes[i].collisionH) / 2)) + ZONE_PAD
    };
    w.zone = zone;
    w.bodies = els.map((el, i) => {
      const { h: bh, collisionW, collisionH } = w.sizes[i];
      const b = Bodies.rectangle(pos[i].x, pos[i].y + bh / 2, collisionW, collisionH, {
        restitution: 0.18,
        friction: 0,
        frictionAir: 0.1,
        inertia: Infinity
      });
      b.plugin = { phase: jitter(i) * Math.PI * 2 };
      return b;
    });
    const T = 80;
    const walls = [
      Bodies.rectangle((zone.left + zone.right) / 2, zone.top - T / 2, zone.right - zone.left + 2 * T, T, {
        isStatic: true
      }),
      Bodies.rectangle((zone.left + zone.right) / 2, zone.bottom + T / 2, zone.right - zone.left + 2 * T, T, {
        isStatic: true
      }),
      Bodies.rectangle(zone.left - T / 2, (zone.top + zone.bottom) / 2, T, zone.bottom - zone.top + 2 * T, {
        isStatic: true
      }),
      Bodies.rectangle(zone.right + T / 2, (zone.top + zone.bottom) / 2, T, zone.bottom - zone.top + 2 * T, {
        isStatic: true
      })
    ];
    Composite.add(engine.world, [...w.bodies, ...walls]);
    w.live = true;
    w.last = 0;
    w.elapsed = 0;
    w.accumulator = 0;
    w.previous = w.bodies.map(b => ({ x: b.position.x, y: b.position.y }));
    w.rendered = pos.map(p => ({ x: p.x, y: p.y }));
    setLive(true);
    const tick = now => {
      const s = world.current;
      if (!s.engine) return;
      const frameDelta = s.last ? now - s.last : 0;
      s.last = now;
      // A background tab or a stalled frame must not fast-forward the simulation.
      if (document.hidden || frameDelta > 100) {
        s.accumulator = 0;
        s.previous = s.bodies.map(b => ({ x: b.position.x, y: b.position.y }));
        s.rendered = s.bodies.map(b => ({ x: b.position.x, y: b.position.y }));
        s.raf = requestAnimationFrame(tick);
        return;
      }
      s.accumulator += Math.min(MAX_FRAME_DELTA, frameDelta);
      while (s.accumulator >= PHYSICS_STEP) {
        s.previous = s.bodies.map(b => ({ x: b.position.x, y: b.position.y }));
        s.elapsed += PHYSICS_STEP;
        const t = s.elapsed / 1000;
        const ramp = Math.min(1, t / 2);
        const k = latest.current.drift * 0.00003 * ramp * ramp * (3 - 2 * ramp);
        s.bodies.forEach((b, i) => {
          if (s.drag?.i === i) return;
          const ph = b.plugin.phase;
          Body.applyForce(b, b.position, {
            x: Math.sin(t * 0.55 + ph) * k * b.mass,
            y: Math.cos(t * 0.75 + ph * 1.7) * k * b.mass
          });
        });
        Engine.update(s.engine, PHYSICS_STEP);
        s.accumulator -= PHYSICS_STEP;
      }
      // Interpolate the fixed physics steps for smooth 60/120/144 Hz rendering.
      const alpha = s.accumulator / PHYSICS_STEP;
      const smooth = 1 - Math.exp(-Math.min(frameDelta, MAX_FRAME_DELTA) / 55);
      s.bodies.forEach((b, i) => {
        const el = pillRefs.current[i];
        if (!el) return;
        const previous = s.previous[i];
        const blend = s.drag?.i === i ? 1 : alpha;
        const targetX = previous.x + (b.position.x - previous.x) * blend;
        const targetY = previous.y + (b.position.y - previous.y) * blend;
        const rendered = s.rendered[i];
        rendered.x += (targetX - rendered.x) * (s.drag?.i === i ? 1 : smooth);
        rendered.y += (targetY - rendered.y) * (s.drag?.i === i ? 1 : smooth);
        el.style.setProperty('--x', rendered.x.toFixed(3) + 'px');
        el.style.setProperty('--y', (rendered.y - s.sizes[i].h / 2).toFixed(3) + 'px');
      });
      s.raf = requestAnimationFrame(tick);
    };
    w.raf = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, spread, lift, layoutKey]);

  const set = useCallback(
    next => {
      if (!next) stopPhysics();
      setOpen(next);
      latest.current.onOpenChange?.(next);
    },
    [stopPhysics]
  );

  useEffect(() => {
    clearTimeout(liveTimer.current);
    if (!open || !physics || latest.current.reduce) {
      if (!open) stopPhysics();
      else stopPhysics();
      return undefined;
    }
    liveTimer.current = setTimeout(startPhysics, openDuration + (n - 1) * stagger + 80);
    return () => clearTimeout(liveTimer.current);
  }, [open, physics, reduce, openDuration, stagger, n, startPhysics, stopPhysics]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReduce(mq.matches);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(
    () => () => {
      clearTimeout(popTimer.current);
      stopPhysics();
    },
    [stopPhysics]
  );

  const pick = (item, i) => {
    latest.current.onSelect?.(item.value, i);
    clearTimeout(popTimer.current);
    setPopped(i);
    popTimer.current = setTimeout(() => setPopped(-1), 320);
    if (closeOnSelect) set(false);
  };

  const pointerAt = e => {
    const r = anchorRef.current?.getBoundingClientRect();
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 };
  };
  const down = (e, i) => {
    const w = world.current;
    if (!w.live || e.button !== 0) return;
    const b = w.bodies[i];
    if (!b) return;
    const p = pointerAt(e);
    w.drag = {
      i,
      id: e.pointerId,
      dx: b.position.x - p.x,
      dy: b.position.y - p.y,
      sx: e.clientX,
      sy: e.clientY,
      moved: false
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };
  const move = (e, i) => {
    const w = world.current;
    const d = w.drag;
    if (!d || d.i !== i || d.id !== e.pointerId) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) >= DRAG_MIN) {
      d.moved = true;
      e.currentTarget.setAttribute('data-drag', '');
    }
    if (!d.moved) return;
    const b = w.bodies[i];
    const { collisionW: bw, collisionH: bh } = w.sizes[i];
    const z = w.zone;
    const p = pointerAt(e);
    const x = Math.min(z.right - bw / 2, Math.max(z.left + bw / 2, p.x + d.dx));
    const y = Math.min(z.bottom - bh / 2, Math.max(z.top + bh / 2, p.y + d.dy));
    Body.setVelocity(b, { x: (x - b.position.x) * 0.6, y: (y - b.position.y) * 0.6 });
    Body.setPosition(b, { x, y });
  };
  const up = (e, i, item) => {
    const w = world.current;
    const d = w.drag;
    if (!d || d.i !== i || d.id !== e.pointerId) return;
    w.drag = null;
    e.currentTarget.removeAttribute('data-drag');
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (!d.moved && e.type === 'pointerup') pick(item, i);
  };

  const hover = trigger === 'hover';

  return (
    <div
      className={`folder-float${className ? ` ${className}` : ''}`}
      data-open={open ? '' : undefined}
      data-live={live ? '' : undefined}
      data-physics={physics ? '' : undefined}
      data-trigger={trigger}
      data-reduced-motion={reduce ? "" : undefined}
      onPointerEnter={hover ? e => { if (e.pointerType === 'mouse') set(true); } : undefined}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) set(false); }}
      onPointerLeave={
        hover
          ? e => {
              if (e.pointerType === "mouse" && !world.current.drag) set(false);
            }
          : undefined
      }
      onKeyDown={e => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          triggerRef.current?.focus();
          set(false);
        }
      }}
      style={{
        '--ff-w': `${width}px`,
        '--ff-h': `${height}px`,
        '--ff-r': `${radius}px`,
        '--ff-back': folderColor,
        '--ff-front': frontColor,
        '--ff-paper': paperColor,
        '--ff-item': itemColor,
        '--ff-item-ink': itemTextColor,
        '--ff-label': labelColor,
        '--ff-spread': `${spread}px`,
        '--ff-lift': `${lift}px`,
        '--ff-angle': `${flapAngle}deg`,
        '--ff-rest': `${restAngle}deg`,
        '--ff-open': `${openDuration}ms`,
        '--ff-close': `${Math.round(openDuration * 0.6)}ms`,
        '--ff-stagger': `${stagger}ms`,
        '--ff-n': n,
        '--ff-spring': `cubic-bezier(0.34, ${(1 + bounce * 1.9).toFixed(2)}, 0.64, 1)`
      }}
    >
      <div className="folder-float__folder">
        <span className="folder-float__back" aria-hidden="true" />
        <span className="folder-float__paper" aria-hidden="true" />
        <span className="folder-float__front" aria-hidden="true">
          <span className="folder-float__label">{label}</span>
          <span className="folder-float__sub">{sub}</span>
        </span>
        <button
          type="button"
          className="folder-float__trigger"
          ref={triggerRef}
          aria-controls={itemsId}
          aria-expanded={open}
          aria-label={`${label}, ${sub}`}
          onClick={e => set(hover && e.detail > 0 && window.matchMedia('(hover: hover) and (pointer: fine)').matches ? true : !open)}
        />
      </div>
      <div id={itemsId} ref={anchorRef} className="folder-float__items">
        {list.map((item, i) => {
          const p = pos[i];
          return (
            <button
              key={`${item.value}-${i}`}
              ref={el => {
                pillRefs.current[i] = el;
              }}
              type="button"
              className="folder-float__item"
              tabIndex={open ? 0 : -1}
              aria-hidden={!open}
              data-pop={popped === i ? '' : undefined}
              style={{
                '--i': i,
                '--x': `${p.x.toFixed(3)}px`,
                '--y': `${p.y.toFixed(3)}px`,
                '--r': `${p.r.toFixed(2)}deg`
              }}
              onPointerDown={e => down(e, i)}
              onPointerMove={e => move(e, i)}
              onPointerUp={e => up(e, i, item)}
              onPointerCancel={e => up(e, i, item)}
              onClick={e => {
                if (!world.current.live || e.detail === 0) pick(item, i);
              }}
            >
              <span className="folder-float__drift">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
