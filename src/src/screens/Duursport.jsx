/* ---------------- Duursport-tab ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html. */
import React, { useState } from 'react';
import { Card, Badge, Button, TextInput, SegTabs, ConfirmInline } from '../components/ui.jsx';
import { SimpleLineChart, HRZoneBadge } from '../components/charts.jsx';
import { enduranceArchiveItems, hrSamplesForSport, allHrSamples } from '../lib/domain.js';
import { HR_ZONES, HR_SPORTS, hrZone, SPORT_ICON } from '../lib/constants.js';
import { getMonday, todayISO, addDays, monthKeyOf, yearOf, avgOf, formatDateWithYear, formatDateShort, formatDuration } from '../lib/helpers.js';
var e = React.createElement;

function ZoneDistributionView(props) {
  var state = props.state;
  var stSport = useState('Alle'); var sport = stSport[0], setSport = stSport[1];
  var stPeriod = useState('Alles'); var period = stPeriod[0], setPeriod = stPeriod[1];
  var samples = sport === 'Alle' ? allHrSamples(state) : hrSamplesForSport(state, sport);
  var monday = getMonday(todayISO()); var mk = monthKeyOf(todayISO()); var yr = yearOf(todayISO());
  var filtered = samples.filter(function (s) {
    if (period === 'Week') return s.date >= monday && s.date <= addDays(monday, 6);
    if (period === 'Maand') return monthKeyOf(s.date) === mk;
    if (period === 'Jaar') return yearOf(s.date) === yr;
    return true;
  });
  var counts = HR_ZONES.map(function (z) { return { zone: z, count: 0 }; });
  filtered.forEach(function (s) {
    var z = hrZone(s.hr);
    if (!z) return;
    var c = counts.find(function (c) { return c.zone.key === z.key; });
    if (c) c.count++;
  });
  var total = counts.reduce(function (s, c) { return s + c.count; }, 0);
  return e('div', { className: 'flex flex-col gap-4' },
    e('div', { className: 'flex gap-2 overflow-x-auto scrollbar-none' }, ['Alle'].concat(HR_SPORTS).map(function (s) {
      var active = s === sport;
      return e('button', { key: s, onClick: function () { setSport(s); }, className: 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
        style: active ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, s);
    })),
    e('div', { className: 'flex gap-1 rounded-xl p-1', style: { background: 'var(--bg-inset)' } }, ['Week', 'Maand', 'Jaar', 'Alles'].map(function (p) {
      var active = p === period;
      return e('button', { key: p, onClick: function () { setPeriod(p); }, className: 'flex-1 rounded-lg py-1.5 text-xs font-medium', style: active ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)' } : { color: 'var(--text-tertiary)' } }, p);
    })),
    total === 0 ? e('p', { className: 'text-sm text-center py-6', style: { color: 'var(--text-tertiary)' } }, 'Nog geen hartslagdata voor deze selectie — vul hartslag in bij het loggen van een training.') :
      e(Card, { className: 'p-4' },
        e('div', { className: 'text-sm font-semibold mb-3' }, total + ' sessies met hartslagdata'),
        e('div', { className: 'flex flex-col gap-2' }, counts.map(function (c) {
          var pct = total ? Math.round((c.count / total) * 100) : 0;
          return e('div', { key: c.zone.key, className: 'flex items-center gap-3' },
            e('span', { className: 'text-xs w-32 shrink-0', style: { color: 'var(--text-secondary)' } }, c.zone.label),
            e('div', { className: 'flex-1 h-3 rounded-full overflow-hidden', style: { background: 'var(--bg-inset)' } },
              e('div', { style: { width: pct + '%', height: '100%', background: 'var(--' + c.zone.tone + ')' } })
            ),
            e('span', { className: 'text-xs w-14 text-right shrink-0', style: { color: 'var(--text-tertiary)' } }, pct + '% (' + c.count + ')')
          );
        }))
      )
  );
}
function SportAverages(props) {
  var items = props.items;
  if (!items.length) return null;
  var distances = items.filter(function (i) { return i.distance != null; }).map(function (i) { return i.distance; });
  var avgDistance = avgOf(distances);
  var totalDistance = distances.reduce(function (s, d) { return s + d; }, 0);
  var totalTime = items.reduce(function (s, i) { return s + (i.timeSec || 0); }, 0);
  var hrs = items.filter(function (i) { return i.hr != null; }).map(function (i) { return i.hr; });
  var avgHr = avgOf(hrs);
  var stats = [{ label: 'sessies', value: '' + items.length }];
  if (totalDistance > 0) stats.push({ label: props.sport === 'Zwemmen' ? 'totaal (m)' : 'totaal (km)', value: totalDistance.toFixed(1) });
  if (avgDistance != null) stats.push({ label: props.sport === 'Zwemmen' ? 'gem. afstand (m)' : 'gem. afstand (km)', value: avgDistance.toFixed(1) });
  if (props.sport === 'Hardlopen' && totalDistance > 0) stats.push({ label: 'gem. tempo', value: formatDuration(totalTime / totalDistance) + '/km' });
  if (props.sport === 'Voetbal' && totalDistance > 0) stats.push({ label: 'gem. duur', value: formatDuration(totalTime / items.length, true) });
  if (props.sport === 'Zwemmen' && totalDistance > 0) stats.push({ label: 'gem. tempo', value: formatDuration((totalTime / totalDistance) * 100) + '/100m' });
  if (props.sport === 'Wielrennen / Kickr' && totalTime > 0) stats.push({ label: 'gem. snelheid', value: (totalDistance / (totalTime / 3600)).toFixed(1) + ' km/h' });
  if (avgHr != null) {
    stats.push({ label: 'gem. hartslag', value: Math.round(avgHr) + ' bpm', hr: avgHr });
    stats.push({ label: 'totaal uren', value: (totalTime / 3600).toFixed(1) + 'u' });
  }
  return e(Card, { className: 'p-4' },
    e('div', { className: 'text-sm font-semibold mb-3' }, 'Gemiddelden'),
    e('div', { className: 'grid gap-2', style: { gridTemplateColumns: 'repeat(' + Math.min(stats.length, 3) + ', 1fr)' } }, stats.map(function (s, i) {
      return e('div', { key: i, className: 'text-center' },
        e('div', { className: 'font-display text-base font-semibold', style: { color: 'var(--sage-strong)' } }, s.value),
        e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, s.label),
        s.hr != null ? e('div', { className: 'mt-1' }, e(HRZoneBadge, { hr: s.hr })) : null
      );
    }))
  );
}
function EnduranceArchiveList(props) {
  var items = props.items.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
  if (!items.length) return e('p', { className: 'text-sm text-center py-6', style: { color: 'var(--text-tertiary)' } }, 'Nog geen voltooide sessies in deze periode.');
  return e('div', { className: 'flex flex-col gap-2' }, items.map(function (it, i) {
    var parts = [];
    if (it.distance != null) parts.push(it.distance + (props.sport === 'Zwemmen' ? 'm' : 'km'));
    if (it.timeSec) parts.push(formatDuration(it.timeSec, true));
    if (it.hr != null) parts.push(it.hr + ' bpm');
    return e(Card, { key: i, className: 'p-3 flex items-center gap-3' },
      e('span', { className: 'text-lg' }, SPORT_ICON[props.sport] || '•'),
      e('div', { className: 'flex-1 min-w-0' },
        e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, formatDateWithYear(it.date)),
        e('div', { className: 'text-sm flex items-center gap-1.5 flex-wrap' }, e('span', {}, parts.join(' · ') || '—'), e(HRZoneBadge, { hr: it.hr })),
        it.note ? e('div', { className: 'text-xs truncate', style: { color: 'var(--text-tertiary)' } }, it.note) : null
      ),
      e(ConfirmInline, { label: '✕', onConfirm: function () { if (it.source === 'schema') props.onDeleteSchema(it.id); else props.onDeleteLog(it.id); } })
    );
  }));
}
function ChecklistSection(props) {
  var st = useState(''); var newText = st[0], setNewText = st[1];
  var doneCount = props.items.filter(function (i) { return i.checked; }).length;
  return e('div', { className: 'flex flex-col gap-2 mb-5' },
    e('div', { className: 'flex items-center justify-between' },
      e('div', { className: 'text-sm font-semibold' }, props.title),
      e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, doneCount + '/' + props.items.length)
    ),
    props.items.map(function (it) {
      return e('div', { key: it.id, onClick: function () { props.onToggle(it.id); }, className: 'flex items-center gap-2 p-2.5 rounded-xl cursor-pointer', style: { background: it.checked ? 'var(--sage-bg)' : 'var(--bg-card)', border: '1px solid var(--border-soft)' } },
        e('span', { className: 'w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0', style: it.checked ? { background: 'var(--sage)', color: '#12180F' } : { border: '1.5px solid var(--border)' } }, it.checked ? '✓' : ''),
        e('span', { className: 'flex-1 text-sm', style: it.checked ? { color: 'var(--text-tertiary)', textDecoration: 'line-through' } : {} }, it.text),
        e('button', { onClick: function (ev) { ev.stopPropagation(); props.onRemove(it.id); }, className: 'text-xs', style: { color: 'var(--danger)' } }, '✕')
      );
    }),
    e('div', { className: 'flex gap-2' },
      e(TextInput, { placeholder: '+ item toevoegen', value: newText, onChange: function (ev) { setNewText(ev.target.value); } }),
      e(Button, { variant: 'ghost', onClick: function () { if (!newText.trim()) return; props.onAdd(newText.trim()); setNewText(''); } }, 'Toevoegen')
    )
  );
}
function TriathlonChecklistView(props) {
  var cl = props.checklist;
  return e('div', { className: 'flex flex-col gap-2' },
    e('div', { className: 'flex justify-end' }, e(ConfirmInline, { label: 'Alles resetten', onConfirm: props.onReset })),
    e(ChecklistSection, { title: 'T1 — Zwemmen → Fietsen', items: cl.t1, onToggle: function (id) { props.onToggle('t1', id); }, onRemove: function (id) { props.onRemove('t1', id); }, onAdd: function (t) { props.onAdd('t1', t); } }),
    e(ChecklistSection, { title: 'T2 — Fietsen → Hardlopen', items: cl.t2, onToggle: function (id) { props.onToggle('t2', id); }, onRemove: function (id) { props.onRemove('t2', id); }, onAdd: function (t) { props.onAdd('t2', t); } }),
    e(ChecklistSection, { title: 'Race-day algemeen', items: cl.raceday, onToggle: function (id) { props.onToggle('raceday', id); }, onRemove: function (id) { props.onRemove('raceday', id); }, onAdd: function (t) { props.onAdd('raceday', t); } })
  );
}
export function DuursportTab(props) {
  var stView = useState('archief'); var view = stView[0], setView = stView[1];
  var stSport = useState('Hardlopen'); var sport = stSport[0], setSport = stSport[1];
  var stPeriod = useState('Alles'); var period = stPeriod[0], setPeriod = stPeriod[1];
  var sports = ['Hardlopen', 'Wielrennen / Kickr', 'Zwemmen', 'Brick', 'Voetbal'];

  var rawItems = enduranceArchiveItems(props.state, sport);
  var monday = getMonday(todayISO());
  var mk = monthKeyOf(todayISO());
  var yr = yearOf(todayISO());
  var items = rawItems.filter(function (it) {
    if (period === 'Week') return it.date >= monday && it.date <= addDays(monday, 6);
    if (period === 'Maand') return monthKeyOf(it.date) === mk;
    if (period === 'Jaar') return yearOf(it.date) === yr;
    return true;
  });

  var chartData = null;
  var chronological = items.slice().sort(function (a, b) { return a.date.localeCompare(b.date); }).filter(function (it) { return it.distance && it.timeSec; });
  if (sport === 'Hardlopen' && chronological.length >= 2) {
    chartData = { title: 'Tempo-trend (min/km)', note: 'Lager = sneller', points: chronological.map(function (it) { return { label: formatDateShort(it.date).split(' ')[0], value: it.timeSec / it.distance }; }) };
  } else if (sport === 'Zwemmen' && chronological.length >= 2) {
    chartData = { title: 'Tempo-trend (per 100m)', note: 'Lager = sneller', points: chronological.map(function (it) { return { label: formatDateShort(it.date).split(' ')[0], value: (it.timeSec / it.distance) * 100 }; }) };
  } else if (sport === 'Wielrennen / Kickr' && chronological.length >= 2) {
    chartData = { title: 'Snelheid-trend (km/h)', note: null, points: chronological.map(function (it) { return { label: formatDateShort(it.date).split(' ')[0], value: it.distance / (it.timeSec / 3600) }; }) };
  }
  return e('div', { className: 'flex flex-col gap-4' },
    e('h2', { className: 'font-display text-xl font-semibold text-center' }, 'Duursport'),
    e(SegTabs, { value: view, onChange: setView, options: [{ value: 'archief', label: 'Archief' }, { value: 'zones', label: 'Hartslagzones' }, { value: 'triatlon', label: 'Triatlon' }] }),
    view === 'archief' ? e('div', { className: 'flex flex-col gap-4' },
      e('p', { className: 'text-xs text-center', style: { color: 'var(--text-tertiary)' } }, 'Alle sessies log je via Schema — hier zie je het overzicht terug.'),
      e('div', { className: 'flex gap-2 overflow-x-auto scrollbar-none' }, sports.map(function (s) {
        var active = s === sport;
        return e('button', { key: s, onClick: function () { setSport(s); }, className: 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
          style: active ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, s);
      })),
      e('div', { className: 'flex gap-1 rounded-xl p-1', style: { background: 'var(--bg-inset)' } }, ['Week', 'Maand', 'Jaar', 'Alles'].map(function (p) {
        var active = p === period;
        return e('button', { key: p, onClick: function () { setPeriod(p); }, className: 'flex-1 rounded-lg py-1.5 text-xs font-medium', style: active ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)' } : { color: 'var(--text-tertiary)' } }, p);
      })),
      e(SportAverages, { items: items, sport: sport }),
      chartData ? e(Card, { className: 'p-4' }, e('div', { className: 'text-sm font-semibold mb-2' }, chartData.title), e(SimpleLineChart, { points: chartData.points, note: chartData.note })) : null,
      e(EnduranceArchiveList, { items: items, sport: sport, onDeleteSchema: props.deleteEntry, onDeleteLog: props.deleteEnduranceLog })
    ) : view === 'zones' ? e(ZoneDistributionView, { state: props.state }) : e(TriathlonChecklistView, { checklist: props.state.triathlonChecklist, onToggle: props.toggleChecklistItem, onRemove: props.removeChecklistItem, onAdd: props.addChecklistItem, onReset: props.resetChecklist })
  );
}
