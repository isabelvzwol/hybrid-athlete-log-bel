/* ---------------- gedeelde kracht-onderdelen ----------------
   ExerciseRow/StrengthChartModal worden zowel in de Kracht-tab als in de
   trainingslog-modal (Schema/Home) gebruikt - daarom in een gedeelde module,
   verder 1-op-1 overgenomen. */
import React, { useState, useEffect, useRef } from 'react';
import { Card, Modal, TextInput, Button } from './ui.jsx';
import { SimpleLineChart } from './charts.jsx';
import { formatDateShort, formatDuration, num } from '../lib/helpers.js';
var e = React.createElement;

export function strengthLastLog(strengthLogs, name) {
  var logs = strengthLogs.filter(function (l) { return l.exercises.some(function (x) { return x.name === name; }); });
  if (!logs.length) return null;
  logs.sort(function (a, b) { return b.date.localeCompare(a.date); });
  var ex = logs[0].exercises.find(function (x) { return x.name === name; });
  if (!ex || !ex.sets.length) return null;
  var txt = ex.sets.map(function (s) { return s.reps + 'x' + s.weight + 'kg'; }).join(', ') + ' · ' + formatDateShort(logs[0].date);
  if (ex.note) txt += ' · “' + ex.note + '”';
  return txt;
}

/* Geeft de sets (reps/gewicht) van de laatste keer dat deze oefening gelogd
   werd terug als invulbare waarden, zodat de inputvelden er automatisch mee
   gevuld kunnen worden (in plaats van dat je alleen de tekst "vorige: ..."
   erboven ziet staan). */
export function strengthLastSets(strengthLogs, name) {
  var logs = strengthLogs.filter(function (l) { return l.exercises.some(function (x) { return x.name === name; }); });
  if (!logs.length) return null;
  logs.sort(function (a, b) { return b.date.localeCompare(a.date); });
  var ex = logs[0].exercises.find(function (x) { return x.name === name; });
  if (!ex || !ex.sets.length) return null;
  return ex.sets.map(function (s) { return { reps: s.reps != null ? '' + s.reps : '', weight: s.weight != null ? '' + s.weight : '' }; });
}

/* Geeft het hoogst ooit gelogde gewicht voor deze oefening terug (over alle
   sessies heen), zodat ExerciseRow dit kan tonen als "beste: X" en een
   nieuwe set die dit gewicht verbetert automatisch als PR gemarkeerd kan
   worden. Alleen krachttraining, want voor hardlopen/Hyrox bestaat al een
   eigen PR-systeem (zie PRs.jsx / lib/domain.js). */
export function strengthBestWeight(strengthLogs, name) {
  var best = null;
  strengthLogs.forEach(function (l) {
    var ex = l.exercises.find(function (x) { return x.name === name; });
    if (!ex) return;
    ex.sets.forEach(function (s) { if (s.weight != null && (best == null || s.weight > best)) best = s.weight; });
  });
  return best;
}

/* Voor elk gewicht dat ooit bij deze oefening gelogd is: het hoogste aantal
   herhalingen dat daarbij ooit gehaald is. Zo telt een nieuwe set ook als PR
   wanneer het gewicht hetzelfde blijft maar er meer herhalingen dan ooit
   worden gehaald (niet alleen bij een hoger gewicht dan ooit). */
export function strengthBestRepsPerWeight(strengthLogs, name) {
  var map = {};
  strengthLogs.forEach(function (l) {
    var ex = l.exercises.find(function (x) { return x.name === name; });
    if (!ex) return;
    ex.sets.forEach(function (s) {
      if (s.weight == null || s.reps == null) return;
      if (map[s.weight] == null || s.reps > map[s.weight]) map[s.weight] = s.reps;
    });
  });
  return map;
}

/* Groepeert een lijst oefeningen ({name, linkToNext}) in supersets: elke
   opeenvolgende reeks waarbij linkToNext=true wordt één groep, zodat die
   samen (als "Superset") getoond kunnen worden. */
export function groupBySuperset(list) {
  var groups = [];
  var i = 0;
  while (i < list.length) {
    var group = [list[i]];
    while (list[i].linkToNext && i + 1 < list.length) { i++; group.push(list[i]); }
    groups.push(group);
    i++;
  }
  return groups;
}

/* Alle oefeningen die je ooit hebt gelogd, plus die in je schema's staan,
   zonder dubbelen (hoofdletters maken niet uit). Gesorteerd op laatst gedaan,
   zodat de oefeningen die je recent deed bovenaan staan. */
export function strengthKnownExercises(strengthLogs, templates) {
  var map = {};
  function add(name, date) {
    var key = ('' + name).trim().toLowerCase();
    if (!key) return;
    if (!map[key]) map[key] = { name: ('' + name).trim(), lastDate: date || '' };
    else if (date && date > map[key].lastDate) map[key].lastDate = date;
  }
  (strengthLogs || []).forEach(function (l) { l.exercises.forEach(function (x) { add(x.name, l.date); }); });
  (templates || []).forEach(function (t) { t.exercises.forEach(function (x) { add(x.name, ''); }); });
  return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
    if (a.lastDate !== b.lastDate) return b.lastDate.localeCompare(a.lastDate);
    return a.name.localeCompare(b.name);
  });
}

function defaultSets(suggested) {
  if (suggested && suggested.length) return suggested.map(function (s) { return { reps: s.reps, weight: s.weight, done: false }; });
  return [{ reps: '', weight: '', done: false }];
}

/* Een oefening met sets. De ingevulde sets worden NIET in deze component
   bewaard maar door de ouder (props.data / props.onChange), zodat ze niet
   verloren gaan als je naar een andere tab gaat. De waardes die vooraf zijn
   ingevuld (van de vorige keer, props.suggested) zijn alleen een voorstel:
   een set telt pas mee als je hem afvinkt. Pas je een waarde aan nadat je
   hebt afgevinkt, dan moet je opnieuw afvinken. */
export function ExerciseRow(props) {
  var ex = props.exercise;
  var last = props.lastLog;
  var sets = (props.data && props.data.sets) ? props.data.sets : defaultSets(props.suggested);
  var note = (props.data && props.data.note) ? props.data.note : '';
  var doneCount = sets.filter(function (s) { return s.done; }).length;
  function emit(nextSets, nextNote) { props.onChange(ex, { sets: nextSets, note: nextNote }); }
  function updateSet(i, k, v) {
    var n = sets.slice(); n[i] = Object.assign({}, n[i]); n[i][k] = v; n[i].done = false;
    emit(n, note);
  }
  function toggleDone(i) {
    var s = sets[i];
    if (!s.done && (s.reps === '' || s.weight === '' || s.reps == null || s.weight == null)) return; // eerst reps en kg invullen
    var n = sets.slice(); n[i] = Object.assign({}, s, { done: !s.done });
    emit(n, note);
  }
  function removeSet(i) { if (sets.length <= 1) return; emit(sets.filter(function (_, j) { return j !== i; }), note); }
  function addSet() {
    var prev = sets[sets.length - 1] || { reps: '', weight: '' };
    emit(sets.concat([{ reps: prev.reps, weight: prev.weight, done: false }]), note);
  }

  var stDuration = useState(180); var restDuration = stDuration[0], setRestDuration = stDuration[1];
  var stRemaining = useState(0); var remaining = stRemaining[0], setRemaining = stRemaining[1];
  var stRunning = useState(false); var timerRunning = stRunning[0], setTimerRunning = stRunning[1];
  var intervalRef = useRef(null);
  var prevDoneRef = useRef(doneCount);
  function clearTimerInterval() { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }
  function startRestTimer() {
    clearTimerInterval();
    setRemaining(restDuration);
    setTimerRunning(true);
    intervalRef.current = setInterval(function () {
      setRemaining(function (r) {
        if (r <= 1) {
          clearTimerInterval(); setTimerRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }
  // De rusttimer start zodra je een set afvinkt.
  useEffect(function () {
    if (doneCount > prevDoneRef.current) startRestTimer();
    prevDoneRef.current = doneCount;
  }, [doneCount]);
  useEffect(function () { return function () { clearTimerInterval(); }; }, []);

  var best = props.best != null ? props.best : null;
  var bestRepsPerWeight = props.bestReps || {};
  // Alleen afgevinkte sets kunnen een PR zijn.
  var isPR = sets.some(function (s) {
    if (!s.done) return false;
    var w = num(s.weight), r = num(s.reps);
    if (w == null) return false;
    if (best != null && w > best) return true; // zwaarder dan ooit
    if (r != null && bestRepsPerWeight[w] != null && r > bestRepsPerWeight[w]) return true; // meer herhalingen dan ooit bij dit gewicht
    return false;
  });

  return e(Card, { className: 'p-3.5' },
    e('div', { className: 'flex items-center justify-between mb-2' },
      e('span', { className: 'text-sm font-semibold' }, ex),
      e('div', { className: 'flex items-center gap-2' },
        isPR ? e('span', { className: 'text-xs font-semibold', style: { color: 'var(--amber)' } }, '🏆 Nieuwe PR!') : null,
        e('span', { className: 'text-xs font-medium', style: { color: doneCount === sets.length ? 'var(--sage-strong)' : 'var(--text-tertiary)' } }, doneCount + '/' + sets.length + ' klaar'),
        props.onShowChart ? e('button', { onClick: props.onShowChart, className: 'text-sm', style: { color: 'var(--slate)' } }, '📈') : null,
        props.onToggleLink ? e('button', { onClick: props.onToggleLink, title: 'Superset met volgende oefening', className: 'text-sm', style: { color: props.linked ? 'var(--amber)' : 'var(--slate)' } }, '🔗') : null,
        props.onMoveUp ? e('button', { onClick: props.onMoveUp, className: 'text-sm', style: { color: 'var(--slate)' } }, '▲') : null,
        props.onMoveDown ? e('button', { onClick: props.onMoveDown, className: 'text-sm', style: { color: 'var(--slate)' } }, '▼') : null,
        props.onRemove ? e('button', { onClick: props.onRemove, className: 'text-xs', style: { color: 'var(--danger)' } }, '✕') : null
      )
    ),
    (last || best != null) ? e('div', { className: 'text-xs mb-2', style: { color: 'var(--text-tertiary)' } },
      (last ? 'vorige: ' + last : '') + (last && best != null ? ' · ' : '') + (best != null ? 'beste: ' + best + ' kg' : '')
    ) : null,
    e('div', { className: 'flex flex-col gap-2' },
      sets.map(function (s, i) {
        var canCheck = s.done || (s.reps !== '' && s.weight !== '' && s.reps != null && s.weight != null);
        return e('div', { key: i, className: 'flex gap-2 items-center' },
          e('span', { className: 'text-xs w-4', style: { color: 'var(--text-tertiary)' } }, i + 1),
          e(TextInput, { type: 'number', placeholder: 'reps', value: s.reps, onChange: function (ev) { updateSet(i, 'reps', ev.target.value); } }),
          e(TextInput, { type: 'number', placeholder: 'kg', value: s.weight, onChange: function (ev) { updateSet(i, 'weight', ev.target.value); } }),
          e('button', { onClick: function () { toggleDone(i); }, 'aria-label': s.done ? 'Set klaar, tik om ongedaan te maken' : 'Vink af als set klaar is',
            className: 'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base font-bold',
            style: s.done ? { background: 'var(--sage)', color: '#12180F' } : { border: '1.5px solid var(--border)', color: 'var(--text-tertiary)', opacity: canCheck ? 1 : 0.4 } }, s.done ? '✓' : ''),
          sets.length > 1 ? e('button', { onClick: function () { removeSet(i); }, className: 'text-xs shrink-0', style: { color: 'var(--danger)' } }, '✕') : null
        );
      }),
      e('button', { onClick: addSet, className: 'text-xs font-medium text-left', style: { color: 'var(--slate)' } }, '+ set toevoegen'),
      e('div', { className: 'flex items-center gap-2 rounded-xl px-2.5 py-2', style: { background: timerRunning ? 'var(--amber-bg)' : 'var(--bg-inset)' } },
        e('span', { className: 'font-display text-sm font-semibold w-10', style: { color: timerRunning ? 'var(--amber)' : 'var(--text-tertiary)' } }, formatDuration(remaining || restDuration)),
        e('span', { className: 'text-xs flex-1', style: { color: 'var(--text-tertiary)' } }, timerRunning ? 'rust…' : 'rusttimer'),
        [60, 90, 120, 180].map(function (d) {
          return e('button', { key: d, onClick: function () { setRestDuration(d); if (!timerRunning) setRemaining(d); }, className: 'text-xs px-1.5 py-0.5 rounded-lg',
            style: d === restDuration ? { background: 'var(--bg-elevated)', color: 'var(--text-primary)' } : { color: 'var(--text-tertiary)' } }, d + 's');
        }),
        timerRunning ? e('button', { onClick: function () { clearTimerInterval(); setTimerRunning(false); }, className: 'text-xs font-medium', style: { color: 'var(--danger)' } }, 'stop')
          : e('button', { onClick: startRestTimer, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, 'start')
      ),
      e(TextInput, { placeholder: 'Notitie (bv. standinstelling machine)', value: note, onChange: function (ev) { emit(sets, ev.target.value); } })
    )
  );
}

/* Oefening toevoegen: kies een oefening die je eerder hebt gedaan (met je
   laatste gewicht en reps erbij), of typ een nieuwe naam. */
export function ExercisePicker(props) {
  var stOpen = useState(false); var open = stOpen[0], setOpen = stOpen[1];
  var stQ = useState(''); var q = stQ[0], setQ = stQ[1];
  var taken = {};
  (props.exclude || []).forEach(function (n) { taken[('' + n).trim().toLowerCase()] = true; });
  var query = q.trim().toLowerCase();
  var known = (props.known || []).filter(function (k) { return !taken[k.name.toLowerCase()]; });
  var matches = known.filter(function (k) { return !query || k.name.toLowerCase().indexOf(query) !== -1; }).slice(0, query ? 12 : 8);
  var exact = (props.known || []).some(function (k) { return k.name.toLowerCase() === query; });
  var alreadyInList = !!taken[query];
  function pick(name) { props.onAdd(name); setQ(''); setOpen(false); }
  if (!open) {
    return e(Button, { variant: 'ghost', className: 'w-full', onClick: function () { setOpen(true); } }, '+ Oefening toevoegen');
  }
  return e(Card, { className: 'p-3.5 flex flex-col gap-2' },
    e('div', { className: 'flex items-center justify-between' },
      e('span', { className: 'text-sm font-semibold' }, 'Oefening toevoegen'),
      e('button', { onClick: function () { setOpen(false); setQ(''); }, className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Sluiten')
    ),
    e(TextInput, { placeholder: 'Zoek een bekende oefening of typ een nieuwe', value: q, onChange: function (ev) { setQ(ev.target.value); } }),
    e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, query ? 'Bekende oefeningen die passen:' : 'Recent gedaan (typ om te zoeken):'),
    matches.length ? e('div', { className: 'flex flex-col gap-1' }, matches.map(function (k) {
      var lastTxt = strengthLastLog(props.strengthLogs || [], k.name);
      return e('button', { key: k.name, onClick: function () { pick(k.name); }, className: 'text-left rounded-xl px-3 py-2', style: { background: 'var(--bg-inset)' } },
        e('div', { className: 'text-sm font-medium' }, k.name),
        e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, lastTxt ? 'vorige: ' + lastTxt : 'nog niet gelogd')
      );
    })) : e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, query ? 'Geen bekende oefening gevonden.' : 'Geen andere bekende oefeningen.'),
    (query && !exact && !alreadyInList) ? e(Button, { onClick: function () { pick(q.trim()); } }, 'Nieuwe oefening "' + q.trim() + '" toevoegen') : null,
    alreadyInList ? e('div', { className: 'text-xs', style: { color: 'var(--amber)' } }, 'Deze oefening staat al in dit schema.') : null
  );
}

export function SupersetGroup(props) {
  if (props.children.length < 2) return props.children[0];
  return e('div', { className: 'rounded-2xl p-2 flex flex-col gap-2', style: { border: '1.5px dashed var(--amber)' } },
    e('div', { className: 'text-xs font-semibold px-1', style: { color: 'var(--amber)' } }, '🔗 Superset'),
    props.children
  );
}

export function StrengthChartModal(props) {
  var logs = props.strengthLogs.filter(function (l) { return l.exercises.some(function (x) { return x.name === props.name; }); }).sort(function (a, b) { return a.date.localeCompare(b.date); });
  var points = logs.map(function (l) {
    var ex = l.exercises.find(function (x) { return x.name === props.name; });
    var maxW = ex.sets.reduce(function (m, s) { return Math.max(m, s.weight); }, 0);
    return { label: formatDateShort(l.date).split(' ')[0], value: maxW };
  });
  return e(Modal, { title: props.name + ' — gewicht', onClose: props.onClose },
    e(SimpleLineChart, { points: points, color: 'var(--amber)' })
  );
}
