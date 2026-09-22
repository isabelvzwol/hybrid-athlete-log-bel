/* ---------------- PR-tab ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html. */
import React, { useState } from 'react';
import { Card, Badge, Button, Field, TextInput, Modal, ConfirmInline } from '../components/ui.jsx';
import { SimpleLineChart } from '../components/charts.jsx';
import { combinedRunEfforts, bestOf } from '../lib/domain.js';
import { STANDARD_DISTANCES } from '../lib/constants.js';
import { uid, todayISO, formatDateShort, formatDateWithYear, formatDuration, parseDuration, yearOf } from '../lib/helpers.js';
var e = React.createElement;

function HistoryList(props) {
  var items = props.items.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  if (!items.length) return e('p', { className: 'text-sm', style: { color: 'var(--text-tertiary)' } }, 'Nog geen geschiedenis.');
  return e('div', { className: 'flex flex-col gap-2' }, items.map(function (it, i) {
    var editable = it.source === 'pr-log' && props.onEdit;
    if (editable) {
      var patch = function (k) { return function (ev) { var p = {}; p[k] = ev.target.value; props.onEdit(it.id, p); }; };
      return e(Card, { key: it.id, className: 'p-3 flex flex-col gap-2' },
        e('div', { className: 'grid grid-cols-2 gap-2' },
          e(TextInput, { type: 'date', value: it.date, onChange: patch('date') }),
          e(TextInput, { placeholder: 'tijd', value: it.time || '', onChange: patch('time') })
        ),
        e(TextInput, { placeholder: 'notitie', value: it.note || '', onChange: patch('note') }),
        e('div', { className: 'flex items-center justify-between' },
          e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, formatDateWithYear(it.date) + (props.km ? (' · ' + formatDuration(it.sec / props.km) + '/km') : '')),
          e(ConfirmInline, { label: 'Verwijder', onConfirm: function () { props.onDelete(it.id); } })
        )
      );
    }
    return e('div', { key: i, className: 'flex items-center justify-between text-sm py-1.5', style: { borderTop: i > 0 ? '1px solid var(--border-soft)' : 'none' } },
      e('span', { style: { color: 'var(--text-secondary)' } }, formatDateWithYear(it.date) + ' (' + (it.source === 'schema' ? 'schema' : 'logboek') + ')'),
      e('span', { className: 'font-medium' }, formatDuration(it.sec, true) + (props.km ? (' · ' + formatDuration(it.sec / props.km) + '/km') : '')),
      e('span', { className: 'text-xs truncate max-w-[80px]', style: { color: 'var(--text-tertiary)' } }, it.note || '')
    );
  }));
}
function DistancePRModal(props) {
  var sd = props.distance;
  var efforts = combinedRunEfforts(props.state, sd.km);
  var st = useState({ date: todayISO(), time: '', note: '' }); var f = st[0], setF = st[1];
  function set(k) { return function (ev) { var v = ev.target.value; setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }; }
  var best = bestOf(efforts);
  var chartPoints = efforts.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).map(function (x) { return { label: formatDateShort(x.date).split(' ')[0], value: x.sec }; });
  return e(Modal, { title: sd.label, onClose: props.onClose },
    best ? e('div', { className: 'flex items-center gap-2 mb-4' }, e(Badge, { tone: 'amber' }, 'PR: ' + formatDuration(best.sec, true)), e(Badge, { tone: 'slate' }, formatDuration(best.sec / sd.km) + '/km'), e(Badge, { tone: 'slate' }, yearOf(best.date))) : null,
    chartPoints.length >= 2 ? e(Card, { className: 'p-4 mb-4' }, e('div', { className: 'text-sm font-semibold mb-2' }, 'Tijdlijn'), e(SimpleLineChart, { points: chartPoints, note: 'Lager = sneller' })) : null,
    e('div', { className: 'flex flex-col gap-3 mb-4' },
      e('div', { className: 'text-sm font-semibold' }, 'Tijd toevoegen'),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Datum' }, e(TextInput, { type: 'date', value: f.date, onChange: set('date') })),
        e(Field, { label: 'Tijd (hh:mm:ss)' }, e(TextInput, { placeholder: '0:47:30', value: f.time, onChange: set('time') }))
      ),
      e(Field, { label: 'Notitie' }, e('textarea', { rows: 2, value: f.note, onChange: set('note') })),
      e(Button, { className: 'w-full', onClick: function () { if (!f.time) return; props.onAdd({ id: uid(), km: sd.km, date: f.date, time: f.time, note: f.note }); setF({ date: todayISO(), time: '', note: '' }); } }, 'Opslaan')
    ),
    e('div', {},
      e('div', { className: 'text-sm font-semibold mb-2' }, 'Geschiedenis'),
      e(HistoryList, { items: efforts, km: sd.km, onEdit: props.onEdit, onDelete: props.onDelete })
    )
  );
}
function CategoryPRModal(props) {
  var cat = props.category;
  var results = props.results.filter(function (r) { return r.category === cat; });
  var st = useState({ date: todayISO(), time: '', note: '' }); var f = st[0], setF = st[1];
  function set(k) { return function (ev) { var v = ev.target.value; setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }; }
  var items = results.map(function (r) { return { id: r.id, sec: parseDuration(r.time), date: r.date, time: r.time, note: r.note, source: 'pr-log' }; }).filter(function (x) { return x.sec != null; });
  var best = bestOf(items);
  return e(Modal, { title: 'Hyrox — ' + cat, onClose: props.onClose },
    best ? e('div', { className: 'flex items-center gap-2 mb-4' }, e(Badge, { tone: 'amber' }, 'PR: ' + formatDuration(best.sec, true)), e(Badge, { tone: 'slate' }, yearOf(best.date))) : null,
    e('div', { className: 'flex flex-col gap-3 mb-4' },
      e('div', { className: 'text-sm font-semibold' }, 'Resultaat toevoegen'),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Datum' }, e(TextInput, { type: 'date', value: f.date, onChange: set('date') })),
        e(Field, { label: 'Eindtijd (hh:mm:ss)' }, e(TextInput, { placeholder: '1:12:30', value: f.time, onChange: set('time') }))
      ),
      e(Field, { label: 'Notitie' }, e('textarea', { rows: 2, value: f.note, onChange: set('note') })),
      e(Button, { className: 'w-full', onClick: function () { if (!f.time) return; props.onAdd({ id: uid(), category: cat, date: f.date, time: f.time, note: f.note }); setF({ date: todayISO(), time: '', note: '' }); } }, 'Opslaan')
    ),
    e('div', {},
      e('div', { className: 'text-sm font-semibold mb-2' }, 'Geschiedenis'),
      e(HistoryList, { items: items, onEdit: props.onEdit, onDelete: props.onDelete })
    )
  );
}
function PRRow(props) {
  return e(Card, { className: 'p-3 flex items-center justify-between cursor-pointer', onClick: props.onClick },
    e('span', { className: 'text-sm capitalize' }, props.label),
    props.value ? e('div', { className: 'text-right' }, e(Badge, { tone: 'amber' }, props.value),
      (props.sub || props.date) ? e('div', { className: 'text-xs mt-1', style: { color: 'var(--text-tertiary)' } }, [props.sub, props.date].filter(Boolean).join(' · ')) : null
    ) : e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'nog geen data')
  );
}
export function PRTab(props) {
  var s = props.state;
  var stD = useState(null); var openDistance = stD[0], setOpenDistance = stD[1];
  var stC = useState(null); var openCategory = stC[0], setOpenCategory = stC[1];
  var stY = useState('Alle'); var year = stY[0], setYear = stY[1];

  var raceCategories = ['solo', 'doubles', 'relay'];
  var allYears = {};
  STANDARD_DISTANCES.forEach(function (sd) { combinedRunEfforts(s, sd.km).forEach(function (x) { allYears[yearOf(x.date)] = true; }); });
  s.hyroxRaceResults.forEach(function (r) { allYears[yearOf(r.date)] = true; });
  var years = Object.keys(allYears).sort().reverse();
  function inYear(dateIso) { return year === 'Alle' || yearOf(dateIso) === year; }

  return e('div', { className: 'flex flex-col gap-5' },
    e('h2', { className: 'font-display text-xl font-semibold text-center' }, 'Records'),
    e('button', { onClick: props.seedMyPRs, className: 'text-xs font-medium text-center', style: { color: 'var(--slate)' } }, '+ eerdere PR’s invullen'),
    years.length ? e('div', { className: 'flex gap-2 overflow-x-auto scrollbar-none' },
      ['Alle'].concat(years).map(function (y) {
        var active = y === year;
        return e('button', { key: y, onClick: function () { setYear(y); }, className: 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
          style: active ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, y);
      })
    ) : null,
    e('div', {},
      e('div', { className: 'text-sm font-semibold mb-2' }, '🏃 Hardlopen'),
      e('div', { className: 'flex flex-col gap-2' }, STANDARD_DISTANCES.map(function (sd) {
        var best = bestOf(combinedRunEfforts(s, sd.km).filter(function (x) { return inYear(x.date); }));
        var pace = best ? formatDuration(best.sec / sd.km) + '/km' : null;
        return e(PRRow, { key: sd.km, label: sd.label, value: best ? formatDuration(best.sec, true) : null, sub: pace, date: best ? formatDateWithYear(best.date) : null, onClick: function () { setOpenDistance(sd); } });
      }))
    ),
    e('div', {},
      e('div', { className: 'text-sm font-semibold mb-2' }, '⚡ Hyrox wedstrijdresultaten'),
      e('div', { className: 'flex flex-col gap-2' }, raceCategories.map(function (c) {
        var items = s.hyroxRaceResults.filter(function (r) { return r.category === c && inYear(r.date); }).map(function (r) { return { sec: parseDuration(r.time), date: r.date }; }).filter(function (x) { return x.sec != null; });
        var best = bestOf(items);
        return e(PRRow, { key: c, label: c, value: best ? formatDuration(best.sec, true) : null, date: best ? formatDateWithYear(best.date) : null, onClick: function () { setOpenCategory(c); } });
      }))
    ),
    openDistance ? e(DistancePRModal, { distance: openDistance, state: s, onClose: function () { setOpenDistance(null); }, onAdd: props.addRunRaceResult, onEdit: props.updateRunRaceResult, onDelete: props.deleteRunRaceResult }) : null,
    openCategory ? e(CategoryPRModal, { category: openCategory, results: s.hyroxRaceResults, onClose: function () { setOpenCategory(null); }, onAdd: props.addHyroxRaceResult, onEdit: props.updateHyroxRaceResult, onDelete: props.deleteHyroxRaceResult }) : null
  );
}
