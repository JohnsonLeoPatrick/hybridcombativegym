import { useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FolderFloat from './FolderFloat';
import './start-folders.css';

// Read the existing cards so their copy and destinations remain the source of truth.
const fallback = document.getElementById('start-cards-fallback');
const mount = document.getElementById('start-folders-root');
const options = [
  ['Ask a question', 'Find my program', 'Talk to the team'],
  ['Gym pricing', 'Membership options', 'Explore fitness'],
  ['Martial arts', 'Training options', 'See programs'],
  ['Kids training', 'Find the right class', 'Ask the team']
];
const subtitles = ['Your first step', 'Build your strength', 'Find your discipline', 'Start their journey'];
const paths = Array.from(fallback?.querySelectorAll('.start-card') || [], (card, index) => ({
  title: card.querySelector('h3').textContent,
  category: card.querySelector('.start-card-kicker').textContent,
  description: card.querySelector('p').textContent,
  cta: card.querySelector('.start-card-note').textContent,
  href: card.getAttribute('href'),
  items: options[index],
  subtitle: subtitles[index]
}));

function PathFolder({ path, index, open, onOpenChange }) {
  const slot = useRef(null);
  const [width, setWidth] = useState(200);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 640px), (hover: none)').matches);
  useLayoutEffect(() => {
    const query = window.matchMedia('(max-width: 640px), (hover: none)');
    const sync = () => setCompact(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  useLayoutEffect(() => {
    const resize = () => setWidth(Math.max(96, Math.min(208, Math.floor(slot.current.clientWidth - 12))));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(slot.current);
    return () => observer.disconnect();
  }, []);
  return <article className="start-folder-card" data-expanded={open ? '' : undefined}>
    <div className="start-folder-heading">
      <span className="start-card-kicker">{path.category}</span>
      <span className="start-folder-number" aria-hidden="true">0{index + 1}</span>
    </div>
    <div className="start-folder-stage" ref={slot}>
      <FolderFloat key={width} items={path.items} label={path.title} sublabel={path.subtitle}
        width={width} height={compact ? 132 : 140} spread={Math.max(80, width / 2 - 14)} lift={34} rowGap={52}
        trigger={compact ? 'click' : 'hover'} physics={!compact}
        className={compact ? 'folder-float--touch' : ''}
        folderColor="#66540f" frontColor="#29271d" paperColor="#f5c800"
        itemColor="#f5c800" itemTextColor="#18160b" labelColor="#fff"
        openDuration={600} stagger={40} bounce={0.12}
        drift={0.35} tilt={5} radius={14} open={open} onOpenChange={onOpenChange}
        onSelect={() => window.location.assign(path.href)} />
    </div>
    <p className="start-folder-description">{path.description}</p>
    <a className="start-folder-link" href={path.href}>
      <span>{path.cta}</span>
      <span className="start-card-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></span>
    </a>
  </article>;
}

function StartFolders() {
  const [activeFolder, setActiveFolder] = useState(null);
  useLayoutEffect(() => {
    mount.hidden = false;
    fallback.hidden = true;
    return () => { fallback.hidden = false; };
  }, []);
  return <>
    <p className="start-folder-hint"><span aria-hidden="true">↗</span> Open a folder. Find your next step.</p>
    <div className="start-folders-grid">{paths.map((path, i) => <PathFolder key={path.title} path={path} index={i} open={activeFolder === i}
      onOpenChange={next => setActiveFolder(current => next ? i : current === i ? null : current)} />)}</div>
  </>;
}
if (mount && paths.length === 4) {
  createRoot(mount, { onUncaughtError(error) {
    mount.hidden = true;
    fallback.hidden = false;
    console.error('Folder animation could not load; showing the original cards.', error);
  } }).render(<StartFolders />);
}
