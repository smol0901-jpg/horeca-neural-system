(function () {
  'use strict';
  window.HNS = window.HNS || {};
  var catalog = [];
  var currentId = null;
  var tab = 'entries';
  function $(id) { return document.getElementById(id); }
  function loadCatalog(cb) {
    fetch('data/journals-catalog.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { catalog = data; cb(); })
      .catch(function () { catalog = []; cb(); });
  }
  function current() {
    return catalog.find(function (j) { return j.id === currentId; }) || catalog[0];
  }
  function renderList() {
    var host = $('jList');
    if (!host) return;
    host.innerHTML = catalog.map(function (j) {
      var n = (j.entries && j.entries.length) || 0;
      return '<button type="button" class="j-item' + (j.id === currentId ? ' on' : '') + '" data-id="' + j.id + '">' +
        '<div class="j-item-id">' + j.id + '</div>' +
        '<div class="j-item-title">' + j.title + '</div>' +
        '<div class="j-item-meta">' + j.frequency + ' · записей: ' + n + '</div></button>';
    }).join('');
    host.querySelectorAll('.j-item').forEach(function (el) {
      el.addEventListener('click', function () {
        currentId = el.getAttribute('data-id');
        tab = 'entries';
        renderAll();
      });
    });
  }
  function renderToolbar(j) {
    var host = $('jToolbar');
    if (!host || !j) return;
    host.innerHTML =
      '<div><strong style="font-size:15px">' + j.title + '</strong>' +
      '<div style="font-size:12px;color:var(--m);margin-top:2px">' + j.id + ' · ' + j.shop + ' · ' + j.frequency + '</div></div>' +
      '<div class="spacer"></div>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="jBtnPaper">Бумажный вид</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="jBtnPrint">Печать</button>' +
      '<button type="button" class="btn btn-primary btn-sm" id="jBtnAdd">Добавить запись</button>';
    $('jBtnPaper').onclick = function () { tab = 'paper'; renderAll(); };
    $('jBtnPrint').onclick = function () { printJournal(j); };
    $('jBtnAdd').onclick = function () { tab = 'entries'; renderAll(); };
  }
  function renderTabs() {
    var host = $('jTabs');
    if (!host) return;
    var tabs = [{ id: 'entries', label: 'Записи' }, { id: 'paper', label: 'Как на бумаге' }, { id: 'studio', label: 'Конструктор' }];
    host.innerHTML = tabs.map(function (t) {
      return '<button type="button" class="j-tab' + (tab === t.id ? ' on' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>';
    }).join('');
    host.querySelectorAll('.j-tab').forEach(function (el) {
      el.addEventListener('click', function () { tab = el.getAttribute('data-tab'); renderAll(); });
    });
  }
  function renderEntries(j) {
    var host = $('jBody');
    if (!host || !j) return;
    var cols = j.columns || [];
    var rows = j.entries || [];
    var head = cols.map(function (c) { return '<th>' + c.name + '</th>'; }).join('');
    var body = rows.length
      ? rows.map(function (e) {
          return '<tr>' + cols.map(function (c) {
            return '<td>' + (e[c.name] != null ? e[c.name] : '—') + '</td>';
          }).join('') + '</tr>';
        }).join('')
      : '<tr><td colspan="' + cols.length + '" style="color:var(--m)">Записей пока нет.</td></tr>';
    var formFields = cols.map(function (c) {
      if (c.type === 'select' && c.options) {
        return '<div class="field"><label>' + c.name + '</label><select data-col="' + c.name + '">' +
          c.options.map(function (o) { return '<option value="' + o + '">' + o + '</option>'; }).join('') +
          '</select></div>';
      }
      var t = c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text';
      return '<div class="field"><label>' + c.name + '</label><input type="' + t + '" data-col="' + c.name + '"></div>';
    }).join('');
    host.innerHTML =
      '<div class="table-wrap" style="margin-bottom:20px"><table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="studio-box" id="jEntryForm">' +
      '<div style="font-weight:600;margin-bottom:12px;font-size:13px">Новая запись</div>' +
      '<div class="j-form-grid">' + formFields + '</div>' +
      '<button type="button" class="btn btn-primary" id="jSaveEntry">Сохранить в журнал</button></div>';
    var btn = $('jSaveEntry');
    if (btn) btn.onclick = function () {
      var entry = {};
      host.querySelectorAll('[data-col]').forEach(function (el) {
        entry[el.getAttribute('data-col')] = el.value;
      });
      j.entries = j.entries || [];
      j.entries.push(entry);
      if (window.HNS && window.HNS.toast) window.HNS.toast('Запись добавлена', j.id, 'ok');
      renderAll();
    };
  }
  function renderPaper(j) {
    var host = $('jBody');
    if (!host || !j) return;
    var cols = j.columns || [];
    var rows = j.entries || [];
    var empty = Math.max(0, 8 - rows.length);
    var allRows = rows.slice();
    for (var i = 0; i < empty; i++) allRows.push({});
    host.innerHTML =
      '<div class="j-paper" id="printArea">' +
      '<h2>' + j.title + '</h2>' +
      '<div class="jp-meta">Код: ' + j.id + ' · ' + j.shop + ' · ' + j.frequency + '</div>' +
      '<table><thead><tr>' + cols.map(function (c) { return '<th>' + c.name + '</th>'; }).join('') + '</tr></thead><tbody>' +
      allRows.map(function (e) {
        return '<tr>' + cols.map(function (c) {
          return '<td style="height:28px">' + (e[c.name] != null ? e[c.name] : '') + '</td>';
        }).join('') + '</tr>';
      }).join('') +
      '</tbody></table>' +
      '<div class="jp-foot"><span>Horeca Neural System · для проверки Роспотребнадзора</span><span>Стр. 1</span></div></div>' +
      '<div style="margin-top:12px"><button type="button" class="btn btn-primary btn-sm" id="jPrint2">Печать бланка</button></div>';
    var p = $('jPrint2');
    if (p) p.onclick = function () { printJournal(j); };
  }
  function renderStudio(j) {
    var host = $('jBody');
    if (!host || !j) return;
    var cols = j.columns || [];
    host.innerHTML =
      '<div style="margin-bottom:8px;font-size:13px;color:var(--m)">Конструктор (уровень ZHUR): колонки, типы, шаблоны.</div>' +
      '<div class="field"><label>Название</label><input id="stTitle" value="' + j.title.replace(/"/g, '"') + '"></div>' +
      '<div class="j-form-grid">' +
      '<div class="field"><label>Код</label><input id="stId" value="' + j.id + '"></div>' +
      '<div class="field"><label>Периодичность</label><input id="stFreq" value="' + j.frequency + '"></div>' +
      '<div class="field"><label>Цех</label><input id="stShop" value="' + j.shop + '"></div>' +
      '<div class="field"><label>Назначение</label><input id="stPurpose" value="' + (j.purpose || '') + '"></div></div>' +
      '<div style="margin:12px 0 8px;font-size:12px;font-weight:600;color:var(--m)">КОЛОНКИ</div>' +
      '<div id="stCols">' + cols.map(function (c, i) {
        return '<span class="col-chip">' + c.name + ' <small style="color:var(--d)">(' + c.type + ')</small>' +
          '<button type="button" data-rm="' + i + '">×</button></span>';
      }).join('') + '</div>' +
      '<div class="j-form-grid" style="margin-top:12px">' +
      '<div class="field"><label>Новая колонка</label><input id="stColName" placeholder="t °C"></div>' +
      '<div class="field"><label>Тип</label><select id="stColType"><option value="text">text</option><option value="number">number</option><option value="date">date</option><option value="select">select</option></select></div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
      '<button type="button" class="btn btn-secondary btn-sm" id="stAddCol">Добавить колонку</button>' +
      '<button type="button" class="btn btn-primary btn-sm" id="stSave">Сохранить журнал</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="stNew">Шаблон: температуры</button></div>';
    host.querySelectorAll('[data-rm]').forEach(function (btn) {
      btn.onclick = function () { j.columns.splice(+btn.getAttribute('data-rm'), 1); renderStudio(j); };
    });
    $('stAddCol').onclick = function () {
      var name = $('stColName').value.trim();
      if (!name) return;
      j.columns.push({ name: name, type: $('stColType').value });
      $('stColName').value = '';
      renderStudio(j);
    };
    $('stSave').onclick = function () {
      j.title = $('stTitle').value.trim() || j.title;
      j.id = $('stId').value.trim() || j.id;
      j.frequency = $('stFreq').value.trim() || j.frequency;
      j.shop = $('stShop').value.trim() || j.shop;
      j.purpose = $('stPurpose').value.trim();
      currentId = j.id;
      if (window.HNS && window.HNS.toast) window.HNS.toast('Журнал сохранён', j.id, 'ok');
      renderAll();
    };
    $('stNew').onclick = function () {
      var tpl = {
        id: 'J-TEMP-' + Date.now().toString(36).toUpperCase().slice(-4),
        title: 'Журнал температурного режима',
        purpose: 'Контроль температуры',
        frequency: '2/сутки',
        shop: 'Холодный цех',
        columns: [
          { name: 'Дата', type: 'date' }, { name: 'Время', type: 'text' },
          { name: 'Оборудование', type: 'text' }, { name: 't °C', type: 'number' },
          { name: 'Норма', type: 'text' }, { name: 'Соответствие', type: 'text' },
          { name: 'Подпись', type: 'text' }
        ],
        entries: []
      };
      catalog.push(tpl);
      currentId = tpl.id;
      tab = 'studio';
      renderAll();
    };
  }
  function printJournal(j) {
    tab = 'paper';
    renderAll();
    setTimeout(function () { window.print(); }, 100);
  }
  function renderAll() {
    if (!currentId && catalog.length) currentId = catalog[0].id;
    var j = current();
    renderList();
    renderToolbar(j);
    renderTabs();
    if (!j) return;
    if (tab === 'paper') renderPaper(j);
    else if (tab === 'studio') renderStudio(j);
    else renderEntries(j);
  }
  HNS.initJournals = function () {
    loadCatalog(function () {
      if (catalog.length) currentId = catalog[0].id;
      renderAll();
    });
  };
})();
