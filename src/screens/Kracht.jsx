/* ---------------- Kracht-tab ----------------
   Dit is dé plek om krachttraining te loggen. Wat je invult (sets, reps,
   gewichten, hartslag, duur, warming-up) staat in een concept dat door de app
   wordt bewaard (ook op je telefoon zelf), zodat het niet kwijtraakt als je
   naar een andere tab gaat of de app sluit. Pas bij "Workout opslaan" gaat het
   naar de database, en daarna pas wordt het concept gewist. Een set telt pas
   mee als je hem afvinkt. Een bijbehorende training in Schema wordt na het
   opslaan automatisch afgevinkt. */
import React, { useState } from 'react';
import { Field, TextInput, Button, Card, Modal, KebabMenu, ConfirmInline } from '../components/ui.jsx';
import { HRZoneBadge } from '../components/charts.jsx';
import { ExerciseRow, ExercisePicker, StrengthChartModal, strengthLastLog, strengthLastSets, strengthBestWeight, strengthBestRepsPerWeight, strengthKnownExercises, groupBySuperset, SupersetGroup } from '../components/strength.jsx';
import { uid, todayISO, num, formatDateShort } from '../lib/helpers.js';
import { WARMUP_TYPES } from '../lib/constants.js';
var e = React.createElement;

/* Soorten cardio voor de afsluiting aan het einde van een krachtworkout. */
var COOLDOWN_TYPES = ['Fietsen', 'Wandelen', 'Stairmaster'];

function TemplateNameModal(props) {
  var st = useState(props.initialName || ''); var name = st[0], setName = st[1];
  return e(Modal, { title: props.title, onClose: props.onClose },
    e('div', { className: 'flex flex-col gap-3' },
      e(Field, { label: 'Naam schema' }, e(TextInput, { value: name, onChange: function (ev) { setName(ev.target.value); }, placeholder: 'bv. Core' })),
      e(Button, { className: 'w-full', onClick: function () { if (!name.trim()) return; props.onSave(name.trim()); } }, props.confirmLabel)
    )
  );
}

/* Schema bewerken: de oefeningen van dit schema hernoemen, de volgorde
   aanpassen, een oefening verwijderen of toevoegen en supersets instellen.
   Alles wordt pas opgeslagen als je op "Opslaan" tikt. Wat je hier bewaart is
   de nieuwe standaard van dit schema. */
function TemplateEditorModal(props) {
  var st = useState(props.exercises.map(function (x) { return { orig: x.name, name: x.name, link: !!x.linkToNext }; })); var items = st[0], setItems = st[1];
  var stNew = useState(''); var newName = stNew[0], setNewName = stNew[1];
  var stErr = useState(''); var err = stErr[0], setErr = stErr[1];
  function patchItem(i, patch) { setItems(items.map(function (x, j) { return j === i ? Object.assign({}, x, patch) : x; })); setErr(''); }
  function move(i, dir) {
    var j = i + dir; if (j < 0 || j >= items.length) return;
    var n = items.slice(); var tmp = n[i]; n[i] = n[j]; n[j] = tmp; setItems(n);
  }
  function remove(i) { setItems(items.filter(function (_, j) { return j !== i; })); setErr(''); }
  function add() {
    if (!newName.trim()) return;
    setItems(items.concat([{ orig: null, name: newName.trim(), link: false }]));
    setNewName(''); setErr('');
  }
  function save() {
    var names = items.map(function (x) { return x.name.trim(); });
    if (names.some(function (n) { return !n; })) { setErr('Een oefening heeft geen naam. Vul een naam in of verwijder de oefening.'); return; }
    var lower = names.map(function (n) { return n.toLowerCase(); });
    if (lower.some(function (n, i) { return lower.indexOf(n) !== i; })) { setErr('Een oefening staat twee keer in dit schema. Geef ze een verschillende naam of verwijder er één.'); return; }
    var exercises = items.map(function (x, i) { return { name: names[i], linkToNext: i < items.length - 1 ? x.link : false }; });
    var renames = [];
    items.forEach(function (x, i) { if (x.orig && x.orig !== names[i]) renames.push({ from: x.orig, to: names[i] }); });
    props.onSave(exercises, renames);
  }
  var btn = { color: 'var(--slate)' };
  return e(Modal, { title: 'Schema bewerken', onClose: props.onClose },
    e('div', { className: 'flex flex-col gap-3' },
      e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Wat je hier opslaat is voortaan de standaard van dit schema. Hernoem een oefening, verplaats hem met ▲ ▼, verwijder hem met ✕ of koppel hem met 🔗 als superset aan de oefening eronder.'),
      items.length ? e('div', { className: 'flex flex-col gap-2' }, items.map(function (x, i) {
        return e('div', { key: i, className: 'flex items-center gap-2' },
          e('div', { className: 'flex-1 min-w-0' }, e(TextInput, { value: x.name, onChange: function (ev) { patchItem(i, { name: ev.target.value }); } })),
          i < items.length - 1 ? e('button', { onClick: function () { patchItem(i, { link: !x.link }); }, title: 'Superset met volgende oefening', className: 'text-sm', style: { color: x.link ? 'var(--amber)' : 'var(--slate)' } }, '🔗') : e('span', { className: 'text-sm', style: { width: '18px' } }),
          e('button', { onClick: function () { move(i, -1); }, disabled: i === 0, className: 'text-sm', style: Object.assign({ opacity: i === 0 ? 0.3 : 1 }, btn) }, '▲'),
          e('button', { onClick: function () { move(i, 1); }, disabled: i === items.length - 1, className: 'text-sm', style: Object.assign({ opacity: i === items.length - 1 ? 0.3 : 1 }, btn) }, '▼'),
          e('button', { onClick: function () { remove(i); }, className: 'text-xs', style: { color: 'var(--danger)' } }, '✕')
        );
      })) : e('p', { className: 'text-sm', style: { color: 'var(--text-tertiary)' } }, 'Dit schema heeft nog geen oefeningen.'),
      e('div', { className: 'flex items-center gap-2' },
        e('div', { className: 'flex-1 min-w-0' }, e(TextInput, { placeholder: 'Nieuwe oefening', value: newName, onChange: function (ev) { setNewName(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); add(); } } })),
        e(Button, { variant: 'ghost', onClick: add }, '+ Toevoegen')
      ),
      e('p', { className: 'text-[11px]', style: { color: 'var(--text-tertiary)' } }, 'Let op: hernoem je een oefening, dan blijven je eerdere workouts onder de oude naam staan. De vorige gewichten en grafiek van die oefening zie je dan niet meer bij de nieuwe naam.'),
      err ? e('div', { className: 'rounded-xl px-3 py-2.5 text-xs font-semibold', style: { background: 'var(--danger-bg)', color: 'var(--danger)' } }, err) : null,
      e(Button, { className: 'w-full', onClick: save }, 'Opslaan')
    )
  );
}

/* Opruimhulp voor schema's met dezelfde naam (bv. drie keer "Leg day"). Per
   naam kies je welk schema je bewaart; de andere worden verwijderd. Workouts
   en Schema-trainingen gebruiken alleen de naam, dus die blijven gewoon bestaan. */
function TemplateDuplicatesModal(props) {
  var initial = {};
  props.groups.forEach(function (g) {
    var cur = g.templates.find(function (t) { return t.id === props.currentId; });
    initial[g.key] = (cur || g.templates[0]).id;
  });
  var st = useState(initial); var keep = st[0], setKeep = st[1];
  var toDelete = [];
  props.groups.forEach(function (g) { g.templates.forEach(function (t) { if (t.id !== keep[g.key]) toDelete.push(t.id); }); });
  return e(Modal, { title: 'Dubbele schema\'s opruimen', onClose: props.onClose },
    e('div', { className: 'flex flex-col gap-4' },
      e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Deze schema\'s staan meerdere keren in je lijst. Kies per naam welk schema je bewaart, de andere worden verwijderd. Je opgeslagen workouts blijven bestaan.'),
      props.groups.map(function (g) {
        return e('div', { key: g.key, className: 'flex flex-col gap-2' },
          e('div', { className: 'text-sm font-semibold' }, g.name),
          g.templates.map(function (t) {
            var on = keep[g.key] === t.id;
            return e('button', { key: t.id, onClick: function () { var n = Object.assign({}, keep); n[g.key] = t.id; setKeep(n); }, className: 'text-left rounded-xl px-3 py-2 flex items-start gap-3',
              style: on ? { background: 'var(--sage-bg)' } : { background: 'var(--bg-elevated)' } },
              e('span', { className: 'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5', style: on ? { background: 'var(--sage)', color: '#12180F' } : { border: '1.5px solid var(--border)' } }, on ? '✓' : ''),
              e('span', { className: 'flex-1 min-w-0' },
                e('span', { className: 'block text-xs font-medium', style: { color: on ? 'var(--sage-strong)' : 'var(--text-secondary)' } }, (on ? 'Bewaren: ' : 'Verwijderen: ') + t.exercises.length + ' oefeningen'),
                e('span', { className: 'block text-xs', style: { color: 'var(--text-tertiary)' } }, t.exercises.map(function (x) { return x.name; }).join(' · ') || 'geen oefeningen')
              )
            );
          })
        );
      }),
      toDelete.length ? e(ConfirmInline, { label: 'Verwijder ' + toDelete.length + (toDelete.length === 1 ? ' dubbel schema' : ' dubbele schema\'s'), onConfirm: function () { props.onDelete(toDelete, keep); } }) : null
    )
  );
}

/* Korte omschrijving van een opgeslagen workout, om dubbele te herkennen. */
function logSummary(l) {
  var sets = 0;
  l.exercises.forEach(function (x) { sets += x.sets.length; });
  var parts = [l.exercises.length + ' oefeningen', sets + ' sets'];
  if (l.hr != null) parts.push(l.hr + ' bpm');
  if (l.durationMin != null) parts.push(l.durationMin + ' min');
  if (l.createdAt) {
    var d = new Date(l.createdAt);
    if (!isNaN(d.getTime())) parts.push('opgeslagen om ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2));
  }
  return parts.join(' · ');
}
function newestFirst(a, b) {
  var ca = a.createdAt || '', cb = b.createdAt || '';
  return ca < cb ? 1 : ca > cb ? -1 : 0;
}

/* Opruimhulp: workouts met dezelfde datum en hetzelfde schema. Per groep kies
   je welke je bewaart; standaard de laatst opgeslagen. De rest wordt verwijderd. */
function DuplicatesModal(props) {
  var initial = {};
  props.groups.forEach(function (g) { initial[g.key] = g.logs[0].id; });
  var st = useState(initial); var keep = st[0], setKeep = st[1];
  var toDelete = [];
  props.groups.forEach(function (g) { g.logs.forEach(function (l) { if (l.id !== keep[g.key]) toDelete.push(l.id); }); });
  return e(Modal, { title: 'Dubbele workouts opruimen', onClose: props.onClose },
    e('div', { className: 'flex flex-col gap-4' },
      e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Dit zijn workouts met dezelfde datum en hetzelfde schema. Kies per groep welke je wilt bewaren. De andere worden verwijderd en tellen dan niet meer mee in je hartslagzones.'),
      props.groups.map(function (g) {
        return e('div', { key: g.key, className: 'flex flex-col gap-2' },
          e('div', { className: 'text-sm font-semibold' }, g.template + ' · ' + formatDateShort(g.date)),
          g.logs.map(function (l) {
            var on = keep[g.key] === l.id;
            return e('button', { key: l.id, onClick: function () { var n = Object.assign({}, keep); n[g.key] = l.id; setKeep(n); }, className: 'text-left rounded-xl px-3 py-2 flex items-start gap-3',
              style: on ? { background: 'var(--sage-bg)' } : { background: 'var(--bg-elevated)' } },
              e('span', { className: 'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5', style: on ? { background: 'var(--sage)', color: '#12180F' } : { border: '1.5px solid var(--border)' } }, on ? '✓' : ''),
              e('span', { className: 'flex-1 min-w-0' },
                e('span', { className: 'block text-xs font-medium', style: { color: on ? 'var(--sage-strong)' : 'var(--text-secondary)' } }, (on ? 'Bewaren: ' : 'Verwijderen: ') + logSummary(l)),
                e('span', { className: 'block text-xs', style: { color: 'var(--text-tertiary)' } }, l.exercises.map(function (x) { return x.name + ' (' + x.sets.length + ')'; }).join(' · '))
              )
            );
          })
        );
      }),
      toDelete.length ? e(ConfirmInline, { label: 'Verwijder ' + toDelete.length + (toDelete.length === 1 ? ' dubbele workout' : ' dubbele workouts'), onConfirm: function () { props.onDelete(toDelete); } }) : null
    )
  );
}

export function KrachtTab(props) {
  var templates = (props.state.strengthTemplates || []).slice().sort(function (a, b) { return a.sortOrder - b.sortOrder; });
  var currentTemplate = templates.find(function (t) { return t.id === props.krachtTemplateId; }) || templates[0] || null;
  var templateId = currentTemplate ? currentTemplate.id : null;
  var exercises = currentTemplate ? currentTemplate.exercises : [];
  var draft = (templateId && props.strengthDrafts && props.strengthDrafts[templateId]) || {};
  var draftData = draft.data || {};
  var date = draft.date || todayISO();

  var st5 = useState(null); var chartExercise = st5[0], setChartExercise = st5[1];
  var stAll = useState(false); var showAllLogs = stAll[0], setShowAllLogs = stAll[1];
  var stDup = useState(false); var dupOpen = stDup[0], setDupOpen = stDup[1];
  var stModal = useState(null); var nameModal = stModal[0], setNameModal = stModal[1]; // null | 'create' | 'rename'
  var stEdit = useState(false); var editOpen = stEdit[0], setEditOpen = stEdit[1];
  var stTplDup = useState(false); var tplDupOpen = stTplDup[0], setTplDupOpen = stTplDup[1];
  var stOpen = useState({}); var openLogs = stOpen[0], setOpenLogs = stOpen[1]; // welke opgeslagen workouts openstaan (id -> true)
  var stSaving = useState(false); var saving = stSaving[0], setSaving = stSaving[1];
  var stMsg = useState(null); var msg = stMsg[0], setMsg = stMsg[1]; // { kind: 'ok' | 'error', text }

  function patchDraft(patch) { if (templateId) props.patchStrengthDraft(templateId, patch); }
  function setField(k) { return function (ev) { var p = {}; p[k] = ev.target.value; patchDraft(p); }; }

  function persist(list) {
    if (!currentTemplate) return;
    props.updateStrengthTemplate({ id: currentTemplate.id, name: currentTemplate.name, exercises: list, sortOrder: currentTemplate.sortOrder });
  }
  function switchTemplate(id) { props.setKrachtTemplateId(id); setMsg(null); }
  function removeExercise(name) { persist(exercises.filter(function (x) { return x.name !== name; })); }
  function moveExercise(idx, dir) {
    var n = exercises.slice(); var j = idx + dir; if (j < 0 || j >= n.length) return;
    var tmp = n[idx]; n[idx] = n[j]; n[j] = tmp; persist(n);
  }
  function toggleLink(idx) {
    var n = exercises.slice(); n[idx] = Object.assign({}, n[idx], { linkToNext: !n[idx].linkToNext }); persist(n);
  }
  function addExercise(name) {
    if (!name || !name.trim()) return;
    persist(exercises.concat([{ name: name.trim(), linkToNext: false }]));
  }
  function createTemplate(name) {
    var t = { id: uid(), name: name, exercises: [], sortOrder: templates.length };
    props.addStrengthTemplate(t);
    props.setKrachtTemplateId(t.id);
    setNameModal(null);
  }
  function renameTemplate(name) {
    if (!currentTemplate) return;
    props.updateStrengthTemplate({ id: currentTemplate.id, name: name, exercises: exercises, sortOrder: currentTemplate.sortOrder });
    setNameModal(null);
  }
  function deleteTemplate() {
    if (!currentTemplate || templates.length <= 1) return;
    var remaining = templates.filter(function (t) { return t.id !== currentTemplate.id; });
    props.deleteStrengthTemplate(currentTemplate.id);
    props.clearStrengthDraft(currentTemplate.id);
    switchTemplate(remaining[0].id);
  }

  /* Volgorde van de schema's (de knoppen bovenaan): één plek naar links of rechts. */
  function moveTemplate(dir) {
    if (!currentTemplate) return;
    var idx = templates.findIndex(function (t) { return t.id === currentTemplate.id; });
    var j = idx + dir; if (idx < 0 || j < 0 || j >= templates.length) return;
    var order = templates.slice(); var tmp = order[idx]; order[idx] = order[j]; order[j] = tmp;
    props.setKrachtTemplateId(currentTemplate.id); // blijf op dit schema staan, ook na het verplaatsen
    order.forEach(function (t, i) { if (t.sortOrder !== i) props.updateStrengthTemplate({ id: t.id, name: t.name, exercises: t.exercises, sortOrder: i }); });
  }
  /* Opslaan vanuit "Schema bewerken". Bij een hernoemde oefening gaan de
     ingevulde sets van de lopende workout mee naar de nieuwe naam. */
  function saveTemplateEdit(list, renames) {
    if (!currentTemplate) return;
    props.updateStrengthTemplate({ id: currentTemplate.id, name: currentTemplate.name, exercises: list, sortOrder: currentTemplate.sortOrder });
    if (renames.length) {
      var nd = Object.assign({}, draftData);
      renames.forEach(function (r) { delete nd[r.from]; });
      renames.forEach(function (r) { if (draftData[r.from]) nd[r.to] = draftData[r.from]; });
      patchDraft({ data: nd });
    }
    setEditOpen(false);
  }
  function cleanupTemplates(ids, keep) {
    ids.forEach(function (id) { props.deleteStrengthTemplate(id); props.clearStrengthDraft(id); });
    var remaining = templates.filter(function (t) { return ids.indexOf(t.id) === -1; });
    remaining.forEach(function (t, i) { if (t.sortOrder !== i) props.updateStrengthTemplate({ id: t.id, name: t.name, exercises: t.exercises, sortOrder: i }); });
    if (ids.indexOf(props.krachtTemplateId) !== -1 || !currentTemplate || ids.indexOf(currentTemplate.id) !== -1) {
      var cur = remaining.find(function (t) { return t.id === keep[t.name.trim().toLowerCase()]; }) || remaining[0];
      if (cur) props.setKrachtTemplateId(cur.id);
    }
    setTplDupOpen(false);
  }

  function toggleLog(id) {
    setOpenLogs(function (p) { var n = Object.assign({}, p); if (n[id]) delete n[id]; else n[id] = true; return n; });
  }

  function lastLogFor(name) { return strengthLastLog(props.state.strengthLogs, name); }
  function lastSetsFor(name) { return strengthLastSets(props.state.strengthLogs, name); }
  function bestWeightFor(name) { return strengthBestWeight(props.state.strengthLogs, name); }
  function bestRepsFor(name) { return strengthBestRepsPerWeight(props.state.strengthLogs, name); }

  // Welke training in Schema wordt na het opslaan afgevinkt?
  var linkedEntry = null;
  if (currentTemplate) {
    if (draft.entryId) linkedEntry = props.state.scheduleEntries.find(function (x) { return x.id === draft.entryId; }) || null;
    if (!linkedEntry) {
      linkedEntry = props.state.scheduleEntries.find(function (x) { return x.sport === 'Kracht' && !x.completed && x.type === currentTemplate.name && x.date === date; }) || null;
    }
  }

  var doneSetCount = 0;
  exercises.forEach(function (item) {
    var d = draftData[item.name];
    if (d && d.sets) doneSetCount += d.sets.filter(function (s) { return s.done; }).length;
  });

  function saveWorkout() {
    if (!currentTemplate || saving) return;
    var list = [];
    exercises.forEach(function (item) {
      var data = draftData[item.name];
      if (!data || !data.sets) return;
      var sets = data.sets.filter(function (s) { return s.done; }).map(function (s) { return { reps: num(s.reps) || 0, weight: num(s.weight) || 0 }; });
      if (sets.length) list.push({ name: item.name, sets: sets, note: data.note || '' });
    });
    if (!list.length) { setMsg({ kind: 'error', text: 'Vink eerst minstens één set af. Alleen afgevinkte sets worden opgeslagen.' }); return; }
    var logId = draft.logId || uid();
    patchDraft({ logId: logId });
    var wuType = draft.warmupType || '';
    var cdType = draft.cooldownType || '';
    var log = {
      id: logId, date: date, template: currentTemplate.name, exercises: list, hr: num(draft.hr),
      warmupType: wuType || null, warmupMinutes: wuType ? num(draft.warmupMinutes) : null, warmupHr: wuType ? num(draft.warmupHr) : null,
      cooldownType: cdType || null, cooldownMinutes: cdType ? num(draft.cooldownMinutes) : null, cooldownHr: cdType ? num(draft.cooldownHr) : null,
      durationMin: num(draft.durationMin)
    };
    setSaving(true); setMsg(null);
    props.saveStrengthWorkout(log, linkedEntry ? linkedEntry.id : null, templateId).then(function () {
      setSaving(false);
      setShowAllLogs(false);
      setOpenLogs(function (p) { var n = Object.assign({}, p); n[logId] = true; return n; }); // net opgeslagen: meteen open, onderaan bij "Recente workouts"
      setMsg({ kind: 'ok', text: 'Workout opgeslagen (' + list.length + ' oefeningen)' + (linkedEntry ? ' en afgevinkt in Schema.' : '.') });
    }).catch(function (err) {
      setSaving(false);
      setMsg({ kind: 'error', text: 'Opslaan is niet gelukt: ' + ((err && err.message) ? err.message : 'onbekende fout') + '. Je ingevulde sets staan nog hier, probeer het opnieuw.' });
    });
  }

  var sortedLogs = props.state.strengthLogs.slice().sort(function (a, b) { return b.date.localeCompare(a.date) || newestFirst(a, b); });
  var recent = showAllLogs ? sortedLogs : sortedLogs.slice(0, 5);
  var dupMap = {};
  sortedLogs.forEach(function (l) {
    var k = l.date + '|' + (l.template || '');
    if (!dupMap[k]) dupMap[k] = { key: k, date: l.date, template: l.template || 'Kracht', logs: [] };
    dupMap[k].logs.push(l);
  });
  var dupGroups = Object.keys(dupMap).map(function (k) { return dupMap[k]; }).filter(function (g) { return g.logs.length > 1; });
  var dupCount = 0;
  dupGroups.forEach(function (g) { dupCount += g.logs.length - 1; });
  var tplMap = {};
  templates.forEach(function (t) { var k = t.name.trim().toLowerCase(); if (!tplMap[k]) tplMap[k] = { key: k, name: t.name.trim(), templates: [] }; tplMap[k].templates.push(t); });
  var tplDupGroups = Object.keys(tplMap).map(function (k) { return tplMap[k]; }).filter(function (g) { return g.templates.length > 1; });
  var tplDupCount = 0;
  tplDupGroups.forEach(function (g) { tplDupCount += g.templates.length - 1; });
  var tplIndex = currentTemplate ? templates.findIndex(function (t) { return t.id === currentTemplate.id; }) : -1;
  var groups = groupBySuperset(exercises);
  var flatIdx = 0;
  var known = strengthKnownExercises(props.state.strengthLogs, templates);
  var wuType2 = draft.warmupType || '';
  var cdType2 = draft.cooldownType || '';

  return e('div', { className: 'flex flex-col gap-4' },
    e('h2', { className: 'font-display text-xl font-semibold text-center' }, 'Krachttraining'),
    e('p', { className: 'text-xs text-center -mt-2', style: { color: 'var(--text-tertiary)' } }, 'Log je krachttraining altijd hier. Alles wat je invult blijft bewaard tot je op "Workout opslaan" tikt. Vink elke set af als je hem hebt gedaan.'),
    tplDupGroups.length ? e(Card, { className: 'p-3 flex items-center gap-3' },
      e('div', { className: 'flex-1 text-xs', style: { color: 'var(--text-secondary)' } }, tplDupCount + (tplDupCount === 1 ? ' schema staat' : ' schema\'s staan') + ' dubbel in je lijst (' + tplDupGroups.map(function (g) { return g.name; }).join(', ') + ').'),
      e(Button, { variant: 'ghost', onClick: function () { setTplDupOpen(true); } }, 'Opruimen')
    ) : null,
    e('div', { className: 'flex gap-2 overflow-x-auto scrollbar-none' },
      templates.map(function (t) {
        var active = t.id === templateId;
        return e('button', { key: t.id, onClick: function () { switchTemplate(t.id); }, className: 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
          style: active ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, t.name);
      }),
      e('button', { onClick: function () { setNameModal('create'); }, className: 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium', style: { background: 'var(--bg-elevated)', color: 'var(--slate)' } }, '+ Nieuw schema')
    ),
    currentTemplate ? e('div', { className: 'flex items-center justify-end -mt-2' },
      e(KebabMenu, { actions: [
        { label: 'Schema bewerken (oefeningen)', onClick: function () { setEditOpen(true); } },
        { label: 'Schema een plek naar links', onClick: function () { moveTemplate(-1); }, key: 'left' },
        { label: 'Schema een plek naar rechts', onClick: function () { moveTemplate(1); }, key: 'right' },
        { label: 'Schema hernoemen', onClick: function () { setNameModal('rename'); } },
        { label: 'Schema verwijderen', danger: true, confirm: true, onClick: deleteTemplate }
      ].filter(function (a) {
        if (a.key === 'left') return tplIndex > 0;
        if (a.key === 'right') return tplIndex >= 0 && tplIndex < templates.length - 1;
        return a.label !== 'Schema verwijderen' || templates.length > 1;
      }) })
    ) : null,
    currentTemplate ? e(Card, { className: 'p-3.5 flex flex-col gap-2' },
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Datum van de training' }, e(TextInput, { type: 'date', value: date, onChange: function (ev) { if (ev.target.value) patchDraft({ date: ev.target.value, entryId: null }); } }))
      ),
      linkedEntry
        ? e('div', { className: 'text-xs', style: { color: 'var(--sage-strong)' } }, '✓ Na opslaan wordt "' + linkedEntry.type + '" in Schema (' + formatDateShort(linkedEntry.date) + ') automatisch afgevinkt.')
        : e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Op deze dag staat geen openstaande "' + currentTemplate.name + '" in Schema. De workout wordt alleen hier opgeslagen.')
    ) : null,
    e('div', { className: 'flex flex-col gap-3' },
      groups.map(function (group, gi) {
        var rows = group.map(function (item) {
          var idx = flatIdx; flatIdx++;
          return e(ExerciseRow, {
            key: currentTemplate.id + '-' + item.name, exercise: item.name, lastLog: lastLogFor(item.name), suggested: lastSetsFor(item.name), best: bestWeightFor(item.name), bestReps: bestRepsFor(item.name),
            data: draftData[item.name],
            onChange: function (ex, data) { var d = Object.assign({}, draftData); d[ex] = data; patchDraft({ data: d }); },
            onRemove: function () { removeExercise(item.name); },
            onMoveUp: idx > 0 ? function () { moveExercise(idx, -1); } : null, onMoveDown: idx < exercises.length - 1 ? function () { moveExercise(idx, 1); } : null,
            onToggleLink: idx < exercises.length - 1 ? function () { toggleLink(idx); } : null, linked: exercises[idx] && exercises[idx].linkToNext,
            onShowChart: function () { setChartExercise(item.name); }
          });
        });
        return e(SupersetGroup, { key: gi }, rows);
      })
    ),
    currentTemplate ? e(ExercisePicker, { known: known, exclude: exercises.map(function (x) { return x.name; }), strengthLogs: props.state.strengthLogs, onAdd: addExercise }) : null,
    e(Card, { className: 'p-3.5' },
      e('div', { className: 'text-sm font-semibold mb-2' }, '🚴 Warming-up (optioneel)'),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Type' }, e('select', { value: wuType2, onChange: setField('warmupType') },
          [e('option', { key: '', value: '' }, 'Geen')].concat(WARMUP_TYPES.map(function (w) { return e('option', { key: w, value: w }, w); }))
        )),
        e(Field, { label: 'Duur WU (min)' }, e(TextInput, { type: 'number', value: draft.warmupMinutes != null ? draft.warmupMinutes : '', onChange: setField('warmupMinutes'), disabled: !wuType2 }))
      ),
      e('div', { className: 'mt-3' },
        e(Field, { label: 'Gem. hartslag WU (bpm)' }, e(TextInput, { type: 'number', value: draft.warmupHr != null ? draft.warmupHr : '', onChange: setField('warmupHr'), disabled: !wuType2 }))
      ),
      wuType2 && draft.warmupHr ? e('div', { className: 'mt-2' }, e(HRZoneBadge, { hr: num(draft.warmupHr) })) : null,
      wuType2 ? e('p', { className: 'text-xs mt-2', style: { color: 'var(--text-tertiary)' } }, 'De warming-up telt mee in je trainingslast, op basis van deze duur en hartslag. Zonder WU-hartslag telt hij niet mee.') : null
    ),
    e('div', { className: 'text-sm font-semibold -mb-2' }, '🏋️ Krachtsessie zelf'),
    e('div', { className: 'grid grid-cols-2 gap-3' },
      e(Field, { label: 'Gem. hartslag training (bpm)' }, e(TextInput, { type: 'number', value: draft.hr != null ? draft.hr : '', onChange: setField('hr') })),
      e(Field, { label: 'Duur training (min, zonder WU)' }, e(TextInput, { type: 'number', value: draft.durationMin != null ? draft.durationMin : '', onChange: setField('durationMin') }))
    ),
    draft.hr ? e(HRZoneBadge, { hr: num(draft.hr) }) : null,
    e(Card, { className: 'p-3.5' },
      e('div', { className: 'text-sm font-semibold mb-2' }, '🚶 Afsluiting na de training (optioneel)'),
      e('div', { className: 'grid grid-cols-2 gap-3' },
        e(Field, { label: 'Type' }, e('select', { value: cdType2, onChange: setField('cooldownType') },
          [e('option', { key: '', value: '' }, 'Geen')].concat(COOLDOWN_TYPES.map(function (w) { return e('option', { key: w, value: w }, w); }))
        )),
        e(Field, { label: 'Duur (min)' }, e(TextInput, { type: 'number', value: draft.cooldownMinutes != null ? draft.cooldownMinutes : '', onChange: setField('cooldownMinutes'), disabled: !cdType2 }))
      ),
      e('div', { className: 'mt-3' },
        e(Field, { label: 'Gem. hartslag afsluiting (bpm)' }, e(TextInput, { type: 'number', value: draft.cooldownHr != null ? draft.cooldownHr : '', onChange: setField('cooldownHr'), disabled: !cdType2 }))
      ),
      cdType2 && draft.cooldownHr ? e('div', { className: 'mt-2' }, e(HRZoneBadge, { hr: num(draft.cooldownHr) })) : null,
      cdType2 ? e('p', { className: 'text-xs mt-2', style: { color: 'var(--text-tertiary)' } }, 'De afsluiting telt mee in je trainingslast, op basis van deze duur en hartslag. Zonder hartslag telt hij niet mee.') : null
    ),
    msg ? e('div', { className: 'rounded-xl px-3 py-2.5 text-xs font-semibold', style: msg.kind === 'ok' ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--danger-bg)', color: 'var(--danger)' } }, msg.text) : null,
    e(Button, { onClick: saveWorkout, disabled: saving, className: 'w-full' }, saving ? 'Opslaan…' : 'Workout opslaan (' + doneSetCount + ' ' + (doneSetCount === 1 ? 'set' : 'sets') + ' afgevinkt)'),
    chartExercise ? e(StrengthChartModal, { name: chartExercise, strengthLogs: props.state.strengthLogs, onClose: function () { setChartExercise(null); } }) : null,
    nameModal === 'create' ? e(TemplateNameModal, { title: 'Nieuw schema', confirmLabel: 'Aanmaken', onClose: function () { setNameModal(null); }, onSave: createTemplate }) : null,
    nameModal === 'rename' ? e(TemplateNameModal, { title: 'Schema hernoemen', confirmLabel: 'Opslaan', initialName: currentTemplate ? currentTemplate.name : '', onClose: function () { setNameModal(null); }, onSave: renameTemplate }) : null,
    recent.length ? e('div', { className: 'mt-2' },
      e('div', { className: 'text-sm font-semibold mb-2' }, showAllLogs ? 'Alle workouts (' + sortedLogs.length + ')' : 'Recente workouts'),
      dupGroups.length ? e(Card, { className: 'p-3 mb-2 flex items-center gap-3' },
        e('div', { className: 'flex-1 text-xs', style: { color: 'var(--text-secondary)' } }, dupCount + (dupCount === 1 ? ' workout staat' : ' workouts staan') + ' mogelijk dubbel (zelfde dag en schema). Dat telt dubbel mee in je hartslagzones.'),
        e(Button, { variant: 'ghost', onClick: function () { setDupOpen(true); } }, 'Opruimen')
      ) : null,
      e('div', { className: 'flex flex-col gap-2' },
        recent.map(function (l) {
          var isOpen = !!openLogs[l.id];
          return e(Card, { key: l.id, className: 'p-3' },
            e('div', { onClick: function () { toggleLog(l.id); }, className: 'cursor-pointer' },
              e('div', { className: 'flex items-center justify-between mb-1' },
                e('span', { className: 'text-sm font-medium flex items-center gap-1.5' }, e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, isOpen ? '▾' : '▸'), l.template),
                e('div', { className: 'flex items-center gap-1' },
                  e('span', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, formatDateShort(l.date)),
                  e(KebabMenu, { actions: [{ label: 'Workout verwijderen', danger: true, confirm: true, onClick: function () { props.deleteStrengthLog(l.id); } }] })
                )
              ),
              l.warmupType ? e('div', { className: 'text-xs mb-1', style: { color: 'var(--text-tertiary)' } }, '🚴 Warming-up: ' + (l.warmupMinutes ? l.warmupMinutes + ' min ' : '') + l.warmupType.toLowerCase() + (l.warmupHr ? ' · ' + l.warmupHr + ' bpm' : '')) : null,
              l.cooldownType ? e('div', { className: 'text-xs mb-1', style: { color: 'var(--text-tertiary)' } }, '🚶 Afsluiting: ' + (l.cooldownMinutes ? l.cooldownMinutes + ' min ' : '') + l.cooldownType.toLowerCase() + (l.cooldownHr ? ' · ' + l.cooldownHr + ' bpm' : '')) : null,
              isOpen ? null : e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, l.exercises.map(function (x) { return x.name + ' (' + x.sets.length + ' sets)'; }).join(' · '))
            ),
            isOpen ? e('div', { className: 'mt-2 pt-3 flex flex-col gap-3', style: { borderTop: '1px solid var(--border-soft)' } },
              (l.hr != null || l.durationMin != null) ? e('div', { className: 'flex items-center flex-wrap gap-2 text-xs', style: { color: 'var(--text-secondary)' } },
                l.durationMin != null ? e('span', {}, '⏱ ' + l.durationMin + ' min') : null,
                l.hr != null ? e('span', {}, '❤️ ' + l.hr + ' bpm') : null,
                l.hr != null ? e(HRZoneBadge, { hr: l.hr }) : null
              ) : null,
              l.exercises.map(function (x) {
                return e('div', { key: x.name },
                  e('div', { className: 'text-xs font-semibold mb-1.5' }, x.name),
                  e('div', { className: 'flex flex-wrap gap-1.5' }, x.sets.map(function (st, i) {
                    return e('span', { key: i, className: 'text-xs rounded-lg px-2 py-1', style: { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, (i + 1) + '. ' + st.reps + (st.weight ? ' × ' + st.weight + ' kg' : ' reps'));
                  })),
                  x.note ? e('div', { className: 'text-xs mt-1.5', style: { color: 'var(--text-tertiary)' } }, x.note) : null
                );
              })
            ) : null
          );
        })
      ),
      sortedLogs.length > 5 ? e('button', { onClick: function () { setShowAllLogs(!showAllLogs); }, className: 'w-full text-xs font-medium text-center pt-3', style: { color: 'var(--slate)' } }, showAllLogs ? 'Toon alleen de laatste 5' : 'Toon alle ' + sortedLogs.length + ' workouts') : null
    ) : null,
    editOpen && currentTemplate ? e(TemplateEditorModal, { key: currentTemplate.id, exercises: exercises, onClose: function () { setEditOpen(false); }, onSave: saveTemplateEdit }) : null,
    tplDupOpen ? e(TemplateDuplicatesModal, { groups: tplDupGroups, currentId: templateId, onClose: function () { setTplDupOpen(false); }, onDelete: cleanupTemplates }) : null,
    dupOpen ? e(DuplicatesModal, { groups: dupGroups, onClose: function () { setDupOpen(false); }, onDelete: function (ids) { ids.forEach(function (id) { props.deleteStrengthLog(id); }); setDupOpen(false); } }) : null
  );
}
