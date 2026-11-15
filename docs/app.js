(function () {
  const SENSORS = [
    { id: 'hot', name: 'Воздух горячий цех', zone: 'Горячий цех', unit: '°C', min: 16, max: 25, value: 28.5, history: [] },
    { id: 'cold', name: 'Холодильник №1', zone: 'Холодильная', unit: '°C', min: 2, max: 6, value: 3.2, history: [] },
    { id: 'prep', name: 'Заготовочный цех', zone: 'Заготовка', unit: '°C', min: 10, max: 16, value: 14.1, history: [] },
    { id: 'freezer', name: 'Морозильная камера', zone: 'Склад', unit: '°C', min: -22, max: -15, value: -18.4, history: [] },
  ];
  SENSORS.forEach(s => {
    for (let i = 0; i < 12; i++) s.history.push(s.value + (Math.random() - 0.5) * 1.2);
  });

  const STOCK = [
    { name: 'Соус томатный', batch: 'П-241114-03', qty: '2.4 кг', made: '14.11 08:20', until: '15.11 08:20', leftH: 6, pct: 18 },
    { name: 'Филе куриное охл.', batch: 'П-241114-01', qty: '8.0 кг', made: '14.11 06:00', until: '15.11 06:00', leftH: 4, pct: 12 },
    { name: 'Тесто дрожжевое', batch: 'П-241114-07', qty: '3.1 кг', made: '14.11 10:00', until: '15.11 10:00', leftH: 14, pct: 40 },
    { name: 'Салат «Цезарь» ПФ', batch: 'П-241113-12', qty: '1.2 кг', made: '13.11 18:00', until: '14.11 18:00', leftH: -2, pct: 0 },
  ];

  const ING = [
    'Филе куриное', 'Филе индейки', 'Филе минтая', 'Фисташки очищенные',
    'Молоко 3.2%', 'Мука пшеничная в/с', 'Масло сливочное 82.5%',
    'Томаты свежие', 'Томатная паста', 'Лук репчатый', 'Морковь столовая',
  ];

  function statusOf(s) {
    if (s.value < s.min - 0.5 || s.value > s.max + 0.5) return 'crit';
    if (s.value < s.min || s.value > s.max) return 'warn';
    return 'ok';
  }

  function toast(title, desc, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = '<div><div class="toast-title">' + title + '</div><div class="toast-desc">' + desc + '</div></div>';
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 4200);
  }

  function sparkline(hist, color) {
    const w = 120, h = 28;
    const min = Math.min(...hist), max = Math.max(...hist);
    const range = max - min || 1;
    const pts = hist.map((v, i) => {
      const x = (i / (hist.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline fill="none" stroke="' + color + '" stroke-width="1.5" points="' + pts + '"/></svg>';
  }

  function renderAlerts() {
    const crits = SENSORS.filter(s => statusOf(s) === 'crit');
    const host = document.getElementById('alertHost');
    if (!host) return;
    if (!crits.length) { host.innerHTML = ''; return; }
    const s = crits[0];
    host.innerHTML = '<div class="alert-strip" role="alert">' +
      '<div class="alert-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg></div>' +
      '<div class="alert-body"><div class="alert-title">Устранить отклонение: ' + s.name + '</div>' +
      '<div class="alert-desc">' + s.value.toFixed(1) + s.unit + ' при норме ' + s.min + '…' + s.max + s.unit + ' · зона «' + s.zone + '»</div></div>' +
      '<div class="alert-actions">' +
      '<button class="btn btn-crit" data-goto="journals">Открыть журнал</button>' +
      '<button class="btn btn-ghost" data-goto="haccp">ККТ</button>' +
      '</div></div>';
    host.querySelectorAll('[data-goto]').forEach(b => {
      b.addEventListener('click', () => go(b.getAttribute('data-goto')));
    });
  }

  function renderSensors() {
    const grid = document.getElementById('sensorGrid');
    if (!grid) return;
    grid.innerHTML = SENSORS.map(s => {
      const st = statusOf(s);
      const col = st === 'crit' ? '#ef4444' : st === 'warn' ? '#f59e0b' : '#10b981';
      const label = st === 'crit' ? 'Критично' : st === 'warn' ? 'Внимание' : 'Норма';
      return '<div class="sensor st-' + st + '" data-id="' + s.id + '">' +
        '<div class="sensor-top"><div><div class="sensor-name">' + s.name + '</div>' +
        '<div class="sensor-zone">' + s.zone + '</div></div>' +
        '<span class="status-pill ' + st + '"><span class="status-dot"></span>' + label + '</span></div>' +
        '<div class="sensor-val">' + s.value.toFixed(1) + '<span class="sensor-unit">' + s.unit + '</span></div>' +
        sparkline(s.history, col) +
        '<div class="sensor-range">Норма ' + s.min + '…' + s.max + s.unit + '</div></div>';
    }).join('');
    const okN = SENSORS.filter(s => statusOf(s) === 'ok').length;
    const kpiS = document.getElementById('kpiSensors');
    const kpiSN = document.getElementById('kpiSensorsNum');
    if (kpiS) kpiS.textContent = okN + '/' + SENSORS.length;
    if (kpiSN) kpiSN.textContent = okN + ' / ' + SENSORS.length;
    const circ = 2 * Math.PI * 24;
    const off = circ * (1 - okN / SENSORS.length);
    const ring = document.getElementById('ringSensors');
    if (ring) {
      ring.setAttribute('stroke-dashoffset', off.toFixed(1));
      ring.setAttribute('stroke', okN === SENSORS.length ? 'var(--ok)' : okN >= 2 ? 'var(--warn)' : 'var(--crit)');
    }
    const fh = document.getElementById('floorHot');
    const fc = document.getElementById('floorCold');
    const fp = document.getElementById('floorPrep');
    if (fh) fh.textContent = SENSORS[0].value.toFixed(1) + '°C';
    if (fc) fc.textContent = SENSORS[1].value.toFixed(1) + '°C';
    if (fp) fp.textContent = SENSORS[2].value.toFixed(1) + '°C';
  }

  function renderAttn() {
    const el = document.getElementById('attnList');
    if (!el) return;
    el.innerHTML = STOCK.filter(x => x.pct <= 40).slice(0, 3).map(x => {
      const st = x.pct <= 0 ? 'crit' : x.pct < 25 ? 'crit' : 'warn';
      const left = x.leftH < 0 ? 'просрочено' : x.leftH + ' ч';
      return '<div class="attn-item"><div class="attn-info"><div class="attn-name">' + x.name + '</div>' +
        '<div class="attn-meta">' + x.batch + ' · остаток ' + left + '</div>' +
        '<div class="progress"><div class="progress-bar ' + st + '" style="width:' + Math.max(x.pct, 4) + '%"></div></div></div>' +
        '<button class="btn btn-secondary btn-sm" data-goto="warehouse">Проверить</button></div>';
    }).join('');
    el.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => go('warehouse')));
  }

  function renderTimeline() {
    const el = document.getElementById('timeline');
    if (!el) return;
    const items = [
      { t: '06:12', text: 'Открыта смена · Иванова А.С.', tag: 'info', tl: 'Смена' },
      { t: '06:40', text: 'Запись: температура ХО №1 = 3.1°C', tag: 'ok', tl: 'Норма' },
      { t: '07:05', text: 'Этикетка: соус томатный, партия П-241114-03', tag: 'info', tl: 'Этикетка' },
      { t: '07:48', text: 'Воздух горячий цех 28.5°C — выше предела', tag: 'crit', tl: 'Критично' },
      { t: '08:10', text: 'Напоминание: филе куриное — 4 ч до конца срока', tag: 'warn', tl: 'Срок' },
    ];
    el.innerHTML = items.map(i =>
      '<div class="tl-item"><div class="tl-time">' + i.t + '</div><div class="tl-body"><strong>' + i.text + '</strong>' +
      '<span class="tl-tag ' + i.tag + '">' + i.tl + '</span></div></div>'
    ).join('');
  }

  function renderStock() {
    const el = document.getElementById('stockBody');
    if (!el) return;
    el.innerHTML = STOCK.map(x => {
      const st = x.pct <= 0 ? 'crit' : x.pct < 25 ? 'crit' : x.pct < 50 ? 'warn' : 'ok';
      return '<tr><td><strong>' + x.name + '</strong></td><td>' + x.batch + '</td><td>' + x.qty + '</td><td>' + x.made +
        '</td><td>' + x.until + '</td><td><div class="progress" style="max-width:120px"><div class="progress-bar ' + st +
        '" style="width:' + Math.max(x.pct, 4) + '%"></div></div></td>' +
        '<td><button class="btn btn-secondary btn-sm">Этикетка</button></td></tr>';
    }).join('');
  }

  function renderJournals() {
    const el = document.getElementById('journalCards');
    if (!el) return;
    const list = [
      { id: 'Ж-Т-01', title: 'Температурный режим ХО', entries: 12, status: 'ok' },
      { id: 'Ж-Б-02', title: 'Бракераж готовой продукции', entries: 4, status: 'ok' },
      { id: 'Ж-В-03', title: 'Входной контроль сырья', entries: 2, status: 'warn' },
      { id: 'Ж-С-04', title: 'Санитарная обработка', entries: 1, status: 'ok' },
      { id: 'Ж-К-05', title: 'Корректирующие действия', entries: 0, status: 'crit' },
      { id: 'Ж-Г-06', title: 'Гигиена персонала', entries: 3, status: 'ok' },
    ];
    el.innerHTML = list.map(j =>
      '<div class="card" style="cursor:pointer"><div style="display:flex;justify-content:space-between;align-items:start">' +
      '<div><div style="font-weight:600;font-size:15px">' + j.title + '</div>' +
      '<div style="font-size:12px;color:var(--m);margin-top:4px">' + j.id + ' · записей сегодня: ' + j.entries + '</div></div>' +
      '<span class="status-pill ' + j.status + '"><span class="status-dot"></span>' +
      (j.status === 'crit' ? 'Нет записи' : j.status === 'warn' ? 'Проверить' : 'Ок') + '</span></div></div>'
    ).join('');
  }

  function renderSensorConfig() {
    const el = document.getElementById('sensorConfigList');
    if (!el) return;
    el.innerHTML =
      '<div class="table-wrap"><table><thead><tr><th>Имя</th><th>Протокол</th><th>Адрес</th><th>Пороги</th><th>Журнал</th></tr></thead><tbody>' +
      SENSORS.map(s => '<tr><td>' + s.name + '</td><td>MQTT</td><td>sensors/' + s.id + '</td><td>' +
        s.min + '…' + s.max + s.unit + '</td><td>Ж-Т-01</td></tr>').join('') +
      '</tbody></table></div>';
  }

  function tick() {
    SENSORS.forEach(s => {
      let delta = (Math.random() - 0.48) * 0.35;
      if (s.id === 'hot') delta += 0.05;
      s.value = Math.round((s.value + delta) * 10) / 10;
      s.history.push(s.value);
      if (s.history.length > 12) s.history.shift();
    });
    const prevCrit = document.querySelector('.sensor.st-crit');
    renderSensors();
    renderAlerts();
    const nowCrit = SENSORS.find(s => statusOf(s) === 'crit');
    if (nowCrit && !prevCrit) {
      toast('Критическое отклонение', nowCrit.name + ': ' + nowCrit.value.toFixed(1) + nowCrit.unit, 'crit');
    }
  }

  function go(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
    const scr = document.getElementById('screen-' + id);
    if (scr) scr.classList.add('on');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('on', n.dataset.screen === id));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.screen === id));
    const side = document.getElementById('side');
    if (side) side.classList.remove('open');
    const main = document.getElementById('main');
    if (main) main.scrollTop = 0;
  }

  document.querySelectorAll('.nav-item, .tab').forEach(el => {
    el.addEventListener('click', () => go(el.dataset.screen));
  });
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    document.getElementById('side').classList.toggle('open');
  });
  document.querySelectorAll('.mode-sw button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.mode-sw button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
    });
  });

  const answers = {
    'горяч': 'Горячий цех: воздух выше критического предела (норма ≤25°C). 1) Проверьте вытяжку и двери. 2) Зафиксируйте отклонение в журнале температур. 3) Внесите корректирующее действие в Ж-К-05.',
    'срок': 'Сегодня истекают / близки к концу: филе куриное (~4 ч), соус томатный (~6 ч). Откройте «Склад / FIFO» и решите: использовать, перемаркировать или списать.',
    'журнал': 'Сейчас приоритет — журнал температур (горячий цех) и журнал корректирующих действий. После устранения — отметка в ККТ.',
  };
  function ask(q) {
    const msgs = document.getElementById('asstMsgs');
    if (!msgs) return;
    const u = document.createElement('div');
    u.className = 'msg user';
    u.textContent = q;
    msgs.appendChild(u);
    const key = Object.keys(answers).find(k => q.toLowerCase().includes(k));
    const text = key ? answers[key] : 'Учитываю датчики, сроки и журналы смены. Уточните зону или партию — подскажу конкретное действие.';
    setTimeout(() => {
      const b = document.createElement('div');
      b.className = 'msg bot';
      b.textContent = text;
      msgs.appendChild(b);
      msgs.scrollTop = msgs.scrollHeight;
    }, 400);
    msgs.scrollTop = msgs.scrollHeight;
  }
  const asstSend = document.getElementById('asstSend');
  if (asstSend) asstSend.addEventListener('click', () => {
    const inp = document.getElementById('asstIn');
    if (!inp.value.trim()) return;
    ask(inp.value.trim());
    inp.value = '';
  });
  const asstIn = document.getElementById('asstIn');
  if (asstIn) asstIn.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('asstSend').click();
  });
  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => ask(c.dataset.q));
  });

  const ingSearch = document.getElementById('ingSearch');
  if (ingSearch) ingSearch.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    const box = document.getElementById('ingResults');
    if (q.length < 1) { box.innerHTML = ''; return; }
    const hits = ING.filter(x => x.toLowerCase().includes(q));
    box.innerHTML = hits.length
      ? hits.map(h => '<div class="attn-item" style="cursor:pointer;padding:8px 0" data-ing="' + h + '"><div class="attn-name">' + h + '</div></div>').join('')
      : '<div style="color:var(--d)">Ничего не найдено</div>';
    box.querySelectorAll('[data-ing]').forEach(el => {
      el.addEventListener('click', () => {
        const li = document.createElement('li');
        li.textContent = el.dataset.ing;
        document.getElementById('ttkDraft').appendChild(li);
      });
    });
  });

  function updateLblPreview() {
    const nameEl = document.getElementById('lblName');
    if (!nameEl) return;
    const name = nameEl.value || '—';
    const h = +document.getElementById('lblHours').value || 24;
    const place = document.getElementById('lblPlace').value;
    const who = document.getElementById('lblWho').value;
    const now = new Date();
    const until = new Date(now.getTime() + h * 3600000);
    const fmt = d => d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    document.getElementById('lblPreview').innerHTML =
      '<strong>' + name + '</strong><br>Изг.: ' + fmt(now) + ' · Годен до: ' + fmt(until) +
      '<br>Хранение: ' + place + '<br>Отв.: ' + who;
  }
  ['lblName', 'lblHours', 'lblPlace', 'lblWho'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateLblPreview);
  });
  const btnPrint = document.getElementById('btnPrintLabel');
  if (btnPrint) btnPrint.addEventListener('click', () => {
    updateLblPreview();
    toast('Этикетка создана', 'Партия внесена в базу · напоминание по сроку активно', 'ok');
  });

  const btnRefresh = document.getElementById('btnRefresh');
  if (btnRefresh) btnRefresh.addEventListener('click', () => {
    tick();
    toast('Данные обновлены', 'Показания датчиков пересчитаны', 'info');
  });

  renderAlerts();
  renderSensors();
  renderAttn();
  renderTimeline();
  renderStock();
  renderJournals();
  renderSensorConfig();
  updateLblPreview();
  setInterval(tick, 3000);
})();
