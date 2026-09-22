/* ---------------- Gezondheid: klachten & lichaamsgewicht ----------------
   ComplaintTracker stond oorspronkelijk op de Home-tab, en is hiernaartoe
   verplaatst (ongewijzigd) zodat hij samen met BodyWeightTracker op de
   nieuwe Gezondheid-tab kan staan. Ruimte voor toekomstige toevoegingen
   (bv. slaap) is bewust in dit bestand, niet in Home.jsx. */
import React, { useState } from 'react';
import { Card, Badge, Button, TextInput } from './ui.jsx';
import { SimpleLineChart, SimpleBarChart } from './charts.jsx';
import { uid, num, todayISO, formatDateShort, monthKeyOf, monthLabel } from '../lib/helpers.js';
var e = React.createElement;

/* Eén gecombineerd overzicht van alle klachten samen (niet per type
   uitgesplitst): aantal meldingen per maand en de gemiddelde pijnscore per
   maand, over de laatste 6 maanden met data. */
export function ComplaintTrend(props) {
  var logs = props.complaintLogs || [];
  if (!logs.length) return null;
  var byMonth = {};
  logs.forEach(function (c) {
    var mk = monthKeyOf(c.date);
    if (!byMonth[mk]) byMonth[mk] = { count: 0, painSum: 0 };
    byMonth[mk].count += 1;
    byMonth[mk].painSum += (c.pain || 0);
  });
  var months = Object.keys(byMonth).sort().slice(-6);
  if (!months.length) return null;
  var countBars = months.map(function (mk) { return { label: monthLabel(mk).slice(0, 3), value: byMonth[mk].count }; });
  var painPoints = months.map(function (mk) { return { label: monthLabel(mk).slice(0, 3), value: byMonth[mk].painSum / byMonth[mk].count }; });
  return e(Card, { className: 'p-4 flex flex-col gap-4' },
    e('div', { className: 'text-sm font-semibold' }, 'Trend van klachten'),
    e('div', {},
      e('div', { className: 'text-xs mb-2', style: { color: 'var(--text-tertiary)' } }, 'Aantal klachten per maand'),
      e(SimpleBarChart, { bars: countBars })
    ),
    e('div', {},
      e('div', { className: 'text-xs mb-2', style: { color: 'var(--text-tertiary)' } }, 'Gemiddelde pijnscore per maand'),
      e(SimpleLineChart, { points: painPoints, color: 'var(--danger)' })
    )
  );
}

export function ComplaintTracker(props) {
  var st = useState({ type: '', pain: '5' }); var f = st[0], setF = st[1];
  function set(k) { return function (ev) { var v = ev.target.value; setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }; }
  var list = props.complaintLogs.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  return e(Card, { className: 'p-4 flex flex-col gap-3' },
    e('div', { className: 'text-sm font-semibold' }, 'Klachten & blessures'),
    e('div', { className: 'grid grid-cols-2 gap-2' },
      e(TextInput, { placeholder: 'type klacht, bv. knie links', value: f.type, onChange: set('type') }),
      e(TextInput, { type: 'number', placeholder: 'pijn 1-10', value: f.pain, onChange: set('pain') })
    ),
    e(Button, { variant: 'ghost', onClick: function () { if (!f.type.trim()) return; props.onAdd({ id: uid(), date: todayISO(), type: f.type.trim(), pain: num(f.pain) || 0 }); setF({ type: '', pain: '5' }); } }, '+ Klacht loggen'),
    list.length ? e('div', { className: 'flex flex-col gap-1' }, list.map(function (c, i) {
      return e('div', { key: c.id, className: 'flex items-center justify-between text-sm py-1.5', style: { borderTop: i > 0 ? '1px solid var(--border-soft)' : 'none' } },
        e('div', {}, e('span', { className: 'font-medium' }, c.type), e('span', { className: 'text-xs ml-2', style: { color: 'var(--text-tertiary)' } }, formatDateShort(c.date))),
        e('div', { className: 'flex items-center gap-2' },
          e(Badge, { tone: c.pain >= 7 ? 'danger' : (c.pain >= 4 ? 'amber' : 'sage') }, c.pain + '/10'),
          e('button', { onClick: function () { props.onDelete(c.id); }, className: 'text-xs', style: { color: 'var(--danger)' } }, '✕')
        )
      );
    })) : null
  );
}

export function BodyWeightTracker(props) {
  var todayLog = props.bodyWeightLogs.find(function (b) { return b.date === todayISO(); });
  var st = useState(''); var input = st[0], setInput = st[1];
  var list = props.bodyWeightLogs.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  var chartPoints = props.bodyWeightLogs.slice().sort(function (a, b) { return a.date.localeCompare(b.date); })
    .map(function (b) { return { value: b.weightKg, label: formatDateShort(b.date) }; });
  var latest = list[0];
  var previous = list[1];
  var delta = latest && previous ? (latest.weightKg - previous.weightKg) : null;

  function save() {
    var v = num(input);
    if (!v) return;
    props.onSave(todayISO(), v);
    setInput('');
  }

  return e(Card, { className: 'p-4 flex flex-col gap-3' },
    e('div', { className: 'text-sm font-semibold' }, 'Lichaamsgewicht'),
    latest ? e('div', { className: 'flex items-baseline gap-2' },
      e('span', { className: 'font-display text-2xl font-semibold' }, latest.weightKg.toFixed(1) + ' kg'),
      e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, formatDateShort(latest.date)),
      delta != null ? e(Badge, { tone: delta > 0 ? 'amber' : (delta < 0 ? 'sage' : 'slate') }, (delta > 0 ? '+' : '') + delta.toFixed(1) + ' kg t.o.v. vorige') : null
    ) : e('p', { className: 'text-sm', style: { color: 'var(--text-tertiary)' } }, 'Nog geen meting gelogd.'),
    e('div', { className: 'grid grid-cols-[1fr_auto] gap-2' },
      e(TextInput, { type: 'number', placeholder: todayLog ? ('vandaag: ' + todayLog.weightKg + ' kg') : 'gewicht in kg', value: input, onChange: function (ev) { setInput(ev.target.value); } }),
      e(Button, { variant: 'ghost', onClick: save }, todayLog ? 'Bijwerken' : '+ Vandaag opslaan')
    ),
    chartPoints.length >= 2 ? e(SimpleLineChart, { points: chartPoints, color: 'var(--danger)' }) : null,
    list.length ? e('div', { className: 'flex flex-col gap-1' }, list.map(function (b, i) {
      return e('div', { key: b.id, className: 'flex items-center justify-between text-sm py-1.5', style: { borderTop: i > 0 ? '1px solid var(--border-soft)' : 'none' } },
        e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, formatDateShort(b.date)),
        e('div', { className: 'flex items-center gap-2' },
          e('span', { className: 'font-medium' }, b.weightKg.toFixed(1) + ' kg'),
          e('button', { onClick: function () { props.onDelete(b.id); }, className: 'text-xs', style: { color: 'var(--danger)' } }, '✕')
        )
      );
    })) : null
  );
}
