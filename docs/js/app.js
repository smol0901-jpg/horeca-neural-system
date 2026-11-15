(function () {
  'use strict';
  var state = { sensors: [], stock: [], journals: [], ingredients: [], ccp: [], timeline: [], wsStatus: 'off' };
  function statusOf(s) {
    if (s.value < s.min - 0.5 || s.value > s.max + 0.5) return 'crit';
    if (s.value < s.min || s.value > s.max) return 'warn';
    return 'ok';
  }
  function statusLabel(st) { return st === 'crit' ? 'Критично' : st === 'warn' ? 'Внимание' : 'Норма'; }
  function statusColor(st) { return st === 'crit' ? '#ef4444' : st === 'warn' ? '#f59e0b' : '#10b981'; }
  function toast(title, desc, type) {
    var host = document.getElementById('toasts');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = '<div><div class="toast-title">' + title + '</div><div class="toast-desc">' + desc + '</div></div>';
    host.appendChild(el);
    setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 260); }, 4200);
  }
  function sparkline(hist, color) {
    var w = 120, h = 28;
    var min = Math.min.apply(null, hist), max = Math.max.apply(null, hist);
    var range = max - min || 1;
    var pts = hist.map(function (v, i) {
      var x = (i / (hist.length - 1)) * w;
      var y = h - ((v - min) / range) * (h - 4) - 2;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linejoin="round" points="' + pts + '"/></svg>';
  }
  function setWsBadge(mode) {
    state.wsStatus = mode;
    var el = document.getElementById('wsBadge');
    if (!el) return;
    el.classList.remove('live', 'off');
    if (mode === 'live' || mode === 'sim') {
      el.classList.add('live');
      el.innerHTML = '<span class="live-dot"></span> ' + (mode === 'live' ? 'WS LIVE' : 'LIVE');
    } else { el.classList.add('off'); el.textContent = 'OFFLINE'; }
  }
  function startRealtime() {
    var ws, simTimer;
    function startSim() {
      if (simTimer) return;
      setWsBadge('sim');
      simTimer = setInterval(tick, 2500);
    }
    try {
      ws = new WebSocket('wss://echo.websocket.events');
      var opened = false;
      ws.addEventListener('open', function () { opened = true; setWsBadge('live'); startSim(); });
      ws.addEventListener('close', function () { if (!simTimer) startSim(); });
      ws.addEventListener('error', function () { try { ws.close(); } catch (e) {} startSim(); });
      setTimeout(function () { if (!opened) startSim(); }, 2000);
    } catch (e) { startSim(); }
  }
  function renderAlerts() {
    var crits = state.sensors.filter(function (s) { return statusOf(s) === 'crit'; });
    var host = document.getElementById('alertHost');
    if (!host) return;
    if (!crits.length) { host.innerHTML = ''; return; }
    var s = crits[0];
    host.innerHTML = '<div class="alert-strip anim-fade-up" role="alert"><div class="alert-icon"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg></div><div class="alert-body"><div class="alert-title">Устранить отклонение: ' + s.name + '</div><div class="alert-desc">' + s.value.toFixed(1) + s.unit + ' при норме ' + s.min + '…' + s.max + s.unit + ' · зона «' + s.zone + '»</div></div><div class="alert-actions"><button class="btn btn-crit" data-goto="journals">Открыть журнал</button><button class="btn btn-ghost" data-goto="haccp">ККТ</button></div></div>';
    host.querySelectorAll('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-goto')); }); });
  }
  function renderSensors() {
    var grid = document.getElementById('sensorGrid');
    if (!grid) return;
    grid.innerHTML = state.sensors.map(function (s) {
      var st = statusOf(s), col = statusColor(st);
      return '<div class="sensor st-' + st + ' anim-fade-up"><div class="sensor-top"><div><div class="sensor-name">' + s.name + '</div><div class="sensor-zone">' + s.zone + '</div></div><span class="status-pill ' + st + '"><span class="status-dot"></span>' + statusLabel(st) + '</span></div><div class="sensor-val val-tick">' + s.value.toFixed(1) + '<span class="sensor-unit">' + s.unit + '</span></div>' + sparkline(s.history, col) + '<div class="sensor-range">Норма ' + s.min + '…' + s.max + s.unit + '</div></div>';
    }).join('');
    var okN = state.sensors.filter(function (s) { return statusOf(s) === 'ok'; }).length;
    var kpiS = document.getElementById('kpiSensors'), kpiSN = document.getElementById('kpiSensorsNum');
    if (kpiS) kpiS.textContent = okN + '/' + state.sensors.length;
    if (kpiSN) kpiSN.textContent = okN + ' / ' + state.sensors.length;
    var circ = 2 * Math.PI * 24, off = circ * (1 - okN / Math.max(state.sensors.length, 1));
    var ring = document.getElementById('ringSensors');
    if (ring) { ring.setAttribute('stroke-dashoffset', off.toFixed(1)); ring.setAttribute('stroke', okN === state.sensors.length ? 'var(--ok)' : okN >= 2 ? 'var(--warn)' : 'var(--crit)'); }
    var fh = document.getElementById('floorHot'), fc = document.getElementById('floorCold'), fp = document.getElementById('floorPrep');
    if (fh && state.sensors[0]) fh.textContent = state.sensors[0].value.toFixed(1) + '°C';
    if (fc && state.sensors[1]) fc.textContent = state.sensors[1].value.toFixed(1) + '°C';
    if (fp && state.sensors[2]) fp.textContent = state.sensors[2].value.toFixed(1) + '°C';
  }
  function renderAttn() {
    var el = document.getElementById('attnList');
    if (!el) return;
    el.innerHTML = state.stock.filter(function (x) { return x.pct <= 40; }).slice(0, 3).map(function (x) {
      var st = x.pct <= 25 ? 'crit' : 'warn';
      var left = x.leftH < 0 ? 'просрочено' : x.leftH + ' ч';
      return '<div class="attn-item"><div class="attn-info"><div class="attn-name">' + x.name + '</div><div class="attn-meta">' + x.batch + ' · ' + left + '</div><div class="progress"><div class="progress-bar ' + st + '" style="width:' + Math.max(x.pct, 4) + '%"></div></div></div><button class="btn btn-secondary btn-sm" data-goto="warehouse">Проверить</button></div>';
    }).join('');
    el.querySelectorAll('[data-goto]').forEach(function (b) { b.addEventListener('click', function () { go('warehouse'); }); });
  }
  function renderTimeline() {
    var el = document.getElementById('timeline');
    if (!el) return;
    el.innerHTML = state.timeline.map(function (i) {
      return '<div class="tl-item"><div class="tl-time">' + i.t + '</div><div class="tl-body"><strong>' + i.text + '</strong><span class="tl-tag ' + i.tag + '">' + i.tl + '</span></div></div>';
    }).join('');
  }
  function renderStock() {
    var el = document.getElementById('stockBody');
    if (!el) return;
    el.innerHTML = state.stock.map(function (x) {
      var st = x.pct <= 25 ? 'crit' : x.pct < 50 ? 'warn' : 'ok';
      return '<tr><td><strong>' + x.name + '</strong></td><td>' + x.batch + '</td><td>' + x.qty + '</td><td>' + x.made + '</td><td>' + x.until + '</td><td><div class="progress" style="max-width:120px"><div class="progress-bar ' + st + '" style="width:' + Math.max(x.pct, 4) + '%"></div></div></td><td><button class="btn btn-secondary btn-sm">Этикетка</button></td></tr>';
    }).join('');
  }
  function renderJournals() {
    var el = document.getElementById('journalCards');
    if (!el) return;
    el.innerHTML = state.journals.map(function (j) {
      return '<div class="card anim-fade-up"><div style="display:flex;justify-content:space-between"><div><div style="font-weight:600">' + j.title + '</div><div style="font-size:12px;color:var(--m)">' + j.id + ' · ' + j.entries + '</div></div><span class="status-pill ' + j.status + '"><span class="status-dot"></span>' + (j.status === 'crit' ? 'Нет записи' : j.status === 'warn' ? 'Проверить' : 'Ок') + '</span></div></div>';
    }).join('');
  }
  function renderSensorConfig() {
    var el = document.getElementById('sensorConfigList');
    if (!el) return;
    el.innerHTML = '<table><thead><tr><th>Имя</th><th>Протокол</th><th>Адрес</th><th>Пороги</th></tr></thead><tbody>' + state.sensors.map(function (s) {
      return '<tr><td>' + s.name + '</td><td>MQTT</td><td>sensors/' + s.id + '</td><td>' + s.min + '…' + s.max + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  function renderCcp() {
    var el = document.getElementById('ccpBody');
    if (!el) return;
    el.innerHTML = state.ccp.map(function (c) {
      return '<tr><td>' + c.name + '</td><td>' + c.hazard + '</td><td>' + c.limit + '</td><td>' + c.monitor + '</td><td><span class="status-pill ' + c.status + '"><span class="status-dot"></span>' + statusLabel(c.status) + '</span></td></tr>';
    }).join('');
  }
  function tick() {
    var hadCrit = state.sensors.some(function (s) { return statusOf(s) === 'crit'; });
    state.sensors.forEach(function (s) {
      var delta = (Math.random() - 0.48) * 0.35;
      if (s.id === 'hot') delta += 0.05;
      s.value = Math.round((s.value + delta) * 10) / 10;
      s.history.push(s.value);
      if (s.history.length > 12) s.history.shift();
    });
    renderSensors();
    renderAlerts();
    var nowCrit = state.sensors.find(function (s) { return statusOf(s) === 'crit'; });
    if (nowCrit && !hadCrit) toast('Критическое отклонение', nowCrit.name + ': ' + nowCrit.value.toFixed(1) + nowCrit.unit, 'crit');
  }
  function go(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('on'); });
    var scr = document.getElementById('screen-' + id);
    if (scr) scr.classList.add('on');
    document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.toggle('on', n.dataset.screen === id); });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('on', t.dataset.screen === id); });
    var side = document.getElementById('side');
    if (side) side.classList.remove('open');
  }
  function seed() {
    state.sensors = [
      { id: 'hot', name: 'Воздух горячий цех', zone: 'Горячий цех', unit: '°C', min: 16, max: 25, value: 28.5, history: [] },
      { id: 'cold', name: 'Холодильник №1', zone: 'Холодильная', unit: '°C', min: 2, max: 6, value: 3.2, history: [] },
      { id: 'prep', name: 'Заготовочный цех', zone: 'Заготовка', unit: '°C', min: 10, max: 16, value: 14.1, history: [] },
      { id: 'freezer', name: 'Морозильная камера', zone: 'Склад', unit: '°C', min: -22, max: -15, value: -18.4, history: [] }
    ];
    state.sensors.forEach(function (s) { for (var i = 0; i < 12; i++) s.history.push(s.value + (Math.random() - 0.5) * 1.2); });
    state.stock = [
      { name: 'Соус томатный', batch: 'П-241114-03', qty: '2.4 кг', made: '14.11 08:20', until: '15.11 08:20', leftH: 6, pct: 18 },
      { name: 'Филе куриное охл.', batch: 'П-241114-01', qty: '8.0 кг', made: '14.11 06:00', until: '15.11 06:00', leftH: 4, pct: 12 },
      { name: 'Тесто дрожжевое', batch: 'П-241114-07', qty: '3.1 кг', made: '14.11 10:00', until: '15.11 10:00', leftH: 14, pct: 40 },
      { name: 'Салат «Цезарь» ПФ', batch: 'П-241113-12', qty: '1.2 кг', made: '13.11 18:00', until: '14.11 18:00', leftH: -2, pct: 0 }
    ];
    state.journals = [
      { id: 'Ж-Т-01', title: 'Температурный режим ХО', entries: 12, status: 'ok' },
      { id: 'Ж-Б-02', title: 'Бракераж', entries: 4, status: 'ok' },
      { id: 'Ж-В-03', title: 'Входной контроль', entries: 2, status: 'warn' },
      { id: 'Ж-К-05', title: 'Корректирующие действия', entries: 0, status: 'crit' }
    ];
    state.ingredients = ['Филе куриное', 'Филе индейки', 'Филе минтая', 'Молоко 3.2%', 'Мука пшеничная в/с', 'Томаты свежие', 'Лук репчатый'];
    state.ccp = [
      { name: 'Температура горячего цеха', hazard: 'Рост микроорганизмов', limit: '≤ 25°C', monitor: 'MQTT', status: 'crit' },
      { name: 'Хранение скоропорта', hazard: 'Холодовая цепь', limit: '+2…+6°C', monitor: 'Датчик', status: 'ok' }
    ];
    state.timeline = [
      { t: '06:12', text: 'Открыта смена · Иванова А.С.', tag: 'info', tl: 'Смена' },
      { t: '07:48', text: 'Воздух горячий цех 28.5°C — выше предела', tag: 'crit', tl: 'Критично' },
      { t: '08:10', text: 'Филе куриное — 4 ч до конца срока', tag: 'warn', tl: 'Срок' }
    ];
  }
  function init() {
    seed();
    document.querySelectorAll('.nav-item, .tab').forEach(function (el) {
      el.addEventListener('click', function () { go(el.dataset.screen); });
    });
    var menuBtn = document.getElementById('menuBtn');
    if (menuBtn) menuBtn.addEventListener('click', function () { document.getElementById('side').classList.toggle('open'); });
    document.querySelectorAll('.mode-sw button').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.mode-sw button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      });
    });
    var answers = { 'горяч': 'Горячий цех выше предела. Проверьте вытяжку, зафиксируйте в журнале.', 'срок': 'Филе куриное и соус томатный — в приоритете списания/использования.', 'журнал': 'Сначала журнал температур и корректирующих действий.' };
    function ask(q) {
      var msgs = document.getElementById('asstMsgs');
      if (!msgs) return;
      var u = document.createElement('div'); u.className = 'msg user'; u.textContent = q; msgs.appendChild(u);
      var key = Object.keys(answers).find(function (k) { return q.toLowerCase().indexOf(k) !== -1; });
      setTimeout(function () {
        var b = document.createElement('div'); b.className = 'msg bot';
        b.textContent = key ? answers[key] : 'Уточните зону или партию.';
        msgs.appendChild(b); msgs.scrollTop = msgs.scrollHeight;
      }, 300);
    }
    var send = document.getElementById('asstSend');
    if (send) send.addEventListener('click', function () {
      var inp = document.getElementById('asstIn');
      if (!inp.value.trim()) return;
      ask(inp.value.trim()); inp.value = '';
    });
    document.querySelectorAll('.chip').forEach(function (c) { c.addEventListener('click', function () { ask(c.dataset.q); }); });
    var search = document.getElementById('ingSearch');
    if (search) search.addEventListener('input', function (e) {
      var q = e.target.value.trim().toLowerCase();
      var box = document.getElementById('ingResults');
      if (!box) return;
      if (q.length < 1) { box.innerHTML = ''; return; }
      var hits = state.ingredients.filter(function (x) { return x.toLowerCase().indexOf(q) !== -1; });
      box.innerHTML = hits.map(function (h) { return '<div class="attn-item" style="cursor:pointer" data-ing="' + h + '"><div class="attn-name">' + h + '</div></div>'; }).join('') || '<div style="color:var(--d)">Нет</div>';
      box.querySelectorAll('[data-ing]').forEach(function (el) {
        el.addEventListener('click', function () {
          var li = document.createElement('li'); li.textContent = el.dataset.ing;
          document.getElementById('ttkDraft').appendChild(li);
        });
      });
    });
    function updateLbl() {
      var nameEl = document.getElementById('lblName');
      if (!nameEl) return;
      var h = +document.getElementById('lblHours').value || 24;
      var now = new Date(), until = new Date(now.getTime() + h * 3600000);
      var fmt = function (d) { return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); };
      var t = document.getElementById('lblPreviewText');
      if (t) t.innerHTML = '<strong>' + nameEl.value + '</strong><br>Изг.: ' + fmt(now) + ' · до ' + fmt(until) + '<br>' + document.getElementById('lblPlace').value + ' · ' + document.getElementById('lblWho').value;
    }
    ['lblName', 'lblHours', 'lblPlace', 'lblWho'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateLbl);
    });
    var btn = document.getElementById('btnPrintLabel');
    if (btn) btn.addEventListener('click', function () { updateLbl(); toast('Этикетка создана', 'Партия в базе', 'ok'); });
    updateLbl();
    renderAlerts(); renderSensors(); renderAttn(); renderTimeline(); renderStock(); renderJournals(); renderSensorConfig(); renderCcp();
    startRealtime();
    var btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) btnRefresh.addEventListener('click', function () { tick(); toast('Обновлено', 'Датчики', 'info'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
