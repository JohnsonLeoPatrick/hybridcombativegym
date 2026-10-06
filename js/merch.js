(() => {
  if (!document.getElementById('custom-color')) return;
  const stage = document.getElementById('garment-stage');
  const choices = document.querySelectorAll('input[name="name-placement"]');
  const color = document.getElementById('custom-color');
  const name = document.getElementById('custom-name');
  const wheel = document.getElementById('color-wheel');
  const marker = document.getElementById('wheel-marker');
  const lightness = document.getElementById('color-lightness');
  let hue = 49, saturation = 100, light = 48;

  const item = document.getElementById('custom-item');
  const picker = document.createElement('div');
  picker.className = 'merch-picker';
  picker.innerHTML = '<button type="button" class="merch-picker-trigger" id="item-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="item-options" aria-labelledby="item-label item-value"><span id="item-value"></span></button><div class="merch-picker-options" id="item-options" role="listbox" aria-labelledby="item-label"><div class="merch-picker-highlight" aria-hidden="true"></div></div>';
  item.after(picker);
  item.hidden = true;
  document.getElementById('item-label').htmlFor = 'item-trigger';
  const trigger = picker.querySelector('button');
  const menu = picker.querySelector('[role=listbox]');
  const highlight = picker.querySelector('.merch-picker-highlight');
  const value = picker.querySelector('#item-value');
  value.textContent = item.options[item.selectedIndex].textContent;
  let opened = false, active = item.selectedIndex;
  menu.inert = true;
  const rows = Array.from(item.options, (option, index) => {
    const row = document.createElement('div');
    row.className = 'merch-picker-option';
    row.id = 'item-option-' + index;
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(index === item.selectedIndex));
    row.textContent = option.textContent;
    row.addEventListener('pointermove', () => activate(index));
    row.addEventListener('pointerdown', event => event.preventDefault());
    row.addEventListener('click', () => {
      item.selectedIndex = index;
      item.dispatchEvent(new Event('change', { bubbles: true }));
      setOpen(false);
      trigger.focus();
    });
    menu.append(row);
    return row;
  });
  function activate(index) {
    active = index;
    rows.forEach((row, i) => row.classList.toggle('is-active', i === index));
    highlight.style.transform = 'translateY(' + (rows[index].offsetTop - 6) + 'px)';
    highlight.style.height = rows[index].offsetHeight + 'px';
    if (opened) trigger.setAttribute('aria-activedescendant', rows[index].id);
  }
  function setOpen(next) {
    opened = next;
    picker.classList.toggle('is-open', next);
    trigger.setAttribute('aria-expanded', String(next));
    menu.inert = !next;
    if (next) activate(item.selectedIndex);
    else trigger.removeAttribute('aria-activedescendant');
  }
  trigger.addEventListener('click', () => setOpen(!opened));
  trigger.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const wasOpen = opened;
      if (!opened) setOpen(true);
      activate(event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : wasOpen ? (active + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length : active);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (opened) rows[active].click(); else setOpen(true);
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      setOpen(false);
    } else if (event.key.toLowerCase() === 's') {
      if (!opened) setOpen(true);
      activate((active + 1) % rows.length);
    }
  });
  document.addEventListener('pointerdown', event => { if (!picker.contains(event.target)) setOpen(false); });
  picker.addEventListener('focusout', event => { if (!picker.contains(event.relatedTarget)) setOpen(false); });
  item.addEventListener('change', () => {
    value.textContent = item.options[item.selectedIndex].textContent;
    rows.forEach((row, index) => row.setAttribute('aria-selected', String(index === item.selectedIndex)));
    update();
  });

  // Describe any wheel or picker shade using a familiar color name.
  function getColorName(hex) {
    const [r, g, b] = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    if (max < .09) return 'Black';
    if (min > .94) return 'White';
    if (s < .12 || delta < .035) return l < .3 ? 'Dark gray' : l > .7 ? 'Light gray' : 'Gray';
    const h = (((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60) + 360) % 360;
    if (h >= 15 && h < 45 && l < .43) return l < .23 ? 'Dark brown' : 'Brown';
    if (h >= 25 && h < 50 && s < .5 && l >= .65) return 'Beige';
    if (h >= 40 && h < 70 && l < .36) return 'Olive green';
    if (h >= 40 && h < 55 && s > .65 && l < .6) return 'Gold';
    if (h >= 210 && h < 260 && l < .3) return 'Navy blue';
    if ((h >= 345 || h < 15) && l < .3) return 'Maroon';
    if ((h >= 330 || h < 15) && l > .65) return 'Light pink';
    const base = h < 15 ? 'Red' : h < 40 ? 'Orange' : h < 70 ? 'Yellow' : h < 90 ? 'Lime green' : h < 165 ? 'Green' : h < 190 ? 'Turquoise' : h < 210 ? 'Sky blue' : h < 260 ? 'Blue' : h < 290 ? 'Purple' : h < 330 ? 'Magenta' : h < 345 ? 'Pink' : 'Red';
    return l < .3 ? `Dark ${base.toLowerCase()}` : l > .72 ? `Light ${base.toLowerCase()}` : base;
  }

  function update() {
    const selectedItem = item.value;
    const placement = document.querySelector('input[name="name-placement"]:checked').value;
    const customItems = selectedItem === 'shirt' ? 'Hybrid shirt' : 'Hybrid shorts';
    stage.dataset.item = selectedItem;
    stage.dataset.placement = placement;
    const hex = color.value.toUpperCase();
    const colorName = getColorName(hex);
    const customName = name.value.trim();
    document.getElementById('color-code').textContent = colorName;
    document.getElementById('name-count').textContent = `${name.value.length} / 20`;
    document.getElementById('preview-item').textContent = customItems;
    stage.setAttribute('aria-label', customItems + ' image placeholder');
    document.getElementById('custom-summary').textContent = `${customItems} · ${colorName} · ${customName ? customName + ' (' + placement + ' logo)' : 'No name added'}`;
    const message = `Hi Hybrid! I'd like to ask about custom merch.\nItem: ${customItems}\nColor: ${colorName}\nName: ${customName || 'No name'}\nName placement: ${customName ? placement + ' logo' : 'Not applicable'}\nPlease confirm availability, pricing, and customization details.`;
    document.getElementById('custom-enquiry').href = `https://wa.me/60196993060?text=${encodeURIComponent(message)}`;
    const angle = hue * Math.PI / 180;
    marker.style.left = `${50 + Math.sin(angle) * saturation / 2}%`;
    marker.style.top = `${50 - Math.cos(angle) * saturation / 2}%`;
  }

  function applyWheelColor() {
    const l = light / 100, a = saturation / 100 * Math.min(l, 1 - l);
    color.value = '#' + [0, 8, 4].map(n => {
      const k = (n + hue / 30) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
    }).join('');
    update();
  }

  function pick(event) {
    const bounds = wheel.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
    const y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);
    hue = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
    saturation = Math.min(1, Math.hypot(x, y)) * 100;
    applyWheelColor();
  }
  wheel.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    wheel.setPointerCapture(event.pointerId);
    pick(event);
  });
  wheel.addEventListener('pointermove', event => {
    if (wheel.hasPointerCapture(event.pointerId)) pick(event);
  });
  lightness.addEventListener('input', () => { light = Number(lightness.value); applyWheelColor(); });
  color.addEventListener('input', () => {
    const [r, g, b] = color.value.slice(1).match(/../g).map(v => parseInt(v, 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    light = (max + min) * 50;
    saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light / 100 - 1)) * 100;
    if (delta) hue = ((max === r ? (g - b) / delta : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60 + 360) % 360;
    lightness.value = light;
    update();
  });
  choices.forEach(choice => choice.addEventListener('change', update));
  name.addEventListener('input', update);
  update();
})();
