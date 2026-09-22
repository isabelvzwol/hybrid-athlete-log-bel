/* ---------------- Hyrox-tab ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html. */
import React, { useState } from 'react';
import { Card, Badge, Button, Field, TextInput, Modal, KebabMenu, ConfirmInline } from '../components/ui.jsx';
import { HRZoneBadge } from '../components/charts.jsx';
import { WorkoutBlocks } from '../components/hyroxShared.jsx';
import { uid, todayISO, num, formatDateShort, parseDuration, formatDuration } from '../lib/helpers.js';
var e = React.createElement;

function BlocksEditor(props) {
  var initial = (props.initialBlocks && props.initialBlocks.length) ? props.initialBlocks.map(function (b) { return { title: b.title || '', duration: b.duration || '', movementsText: (b.movements || []).join('\n') }; }) : [{ title: 'Werkblok', duration: '', movementsText: '' }];
  var st2 = useState(initial); var blocks = st2[0], setBlocks = st2[1];
  function updateBlock(i, k, v) { setBlocks(function (p) { var n = p.slice(); n[i] = Object.assign({}, n[i]); n[i][k] = v; return n; }); }
  function removeBlock(i) { setBlocks(function (p) { return p.filter(function (_, j) { return j !== i; }); }); }
  function moveBlock(i, dir) { setBlocks(function (p) { var n = p.slice(); var j = i + dir; if (j < 0 || j >= n.length) return p; var tmp = n[i]; n[i] = n[j]; n[j] = tmp; return n; }); }
  function save() {
    var finalBlocks = blocks.filter(function (b) { return b.title.trim() || b.movementsText.trim(); }).map(function (b) {
      return { title: b.title.trim() || 'Blok', duration: b.duration.trim(), movements: b.movementsText.split('\n').map(function (x) { return x.trim(); }).filter(Boolean) };
    });
    props.onSave(finalBlocks);
  }
  return e('div', { className: 'flex flex-col gap-3' },
    blocks.map(function (b, i) {
      return e(Card, { key: i, className: 'p-3 flex flex-col gap-2' },
        e('div', { className: 'flex items-center justify-between' },
          e('span', { className: 'text-xs font-medium', style: { color: 'var(--text-secondary)' } }, 'Blok ' + (i + 1)),
          e('div', { className: 'flex items-center gap-2' },
            i > 0 ? e('button', { onClick: function () { moveBlock(i, -1); }, style: { color: 'var(--slate)' } }, '▲') : null,
            i < blocks.length - 1 ? e('button', { onClick: function () { moveBlock(i, 1); }, style: { color: 'var(--slate)' } }, '▼') : null,
            blocks.length > 1 ? e('button', { onClick: function () { removeBlock(i); }, className: 'text-xs', style: { color: 'var(--danger)' } }, 'verwijder') : null
          )
        ),
        e('div', { className: 'grid grid-cols-2 gap-2' },
          e(TextInput, { placeholder: 'bv. AMRAP', value: b.title, onChange: function (ev) { updateBlock(i, 'title', ev.target.value); } }),
          e(TextInput, { placeholder: 'bv. 5 min', value: b.duration, onChange: function (ev) { updateBlock(i, 'duration', ev.target.value); } })
        ),
        e('textarea', { rows: 3, placeholder: '1 onderdeel per regel, bv. 15 wall balls', value: b.movementsText, onChange: function (ev) { updateBlock(i, 'movementsText', ev.target.value); } })
      );
    }),
    e(Button, { variant: 'ghost', className: 'w-full', onClick: function () { setBlocks(function (p) { return p.concat([{ title: '', duration: '', movementsText: '' }]); }); } }, '+ Blok toevoegen'),
    e('div', { className: 'flex gap-2' },
      e(Button, { onClick: save, className: 'flex-1' }, props.saveLabel || 'Opslaan'),
      props.onCancel ? e(Button, { variant: 'ghost', onClick: props.onCancel }, 'Annuleer') : null
    )
  );
}
function HyroxDetail(props) {
  var w = props.workout;
  var logs = props.logs.filter(function (l) { return l.workoutId === w.id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
  var best = logs.reduce(function (min, l) { var s = parseDuration(l.time); return (s != null && (min == null || s < min)) ? s : min; }, null);
  var st = useState({ date: todayISO(), time: '', note: '', hr: '' }); var f = st[0], setF = st[1];
  var stE = useState(false); var editingName = stE[0], setEditingName = stE[1];
  var stN = useState(w.name); var nameVal = stN[0], setNameVal = stN[1];
  var stB = useState(false); var editingBlocks = stB[0], setEditingBlocks = stB[1];
  function set(k) { return function (ev) { var v = ev.target.value; setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }; }
  return e(Modal, { title: w.name, onClose: props.onClose },
    e('div', { className: 'flex items-center gap-3 mb-4 flex-wrap' },
      editingName ? e('div', { className: 'flex items-center gap-2 flex-1' },
        e(TextInput, { value: nameVal, onChange: function (ev) { setNameVal(ev.target.value); } }),
        e(Button, { onClick: function () { if (nameVal.trim()) { props.onRename(nameVal.trim()); } setEditingName(false); } }, 'Opslaan')
      ) : e('button', { onClick: function () { setNameVal(w.name); setEditingName(true); }, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, '✎ naam bewerken'),
      editingBlocks ? null : e('button', { onClick: function () { setEditingBlocks(true); }, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, '✎ onderdelen bewerken'),
      e(ConfirmInline, { label: 'Workout verwijderen', onConfirm: function () { props.onDelete(w.id); props.onClose(); } })
    ),
    editingBlocks ? e(BlocksEditor, { initialBlocks: w.blocks || [], saveLabel: 'Blokken opslaan', onCancel: function () { setEditingBlocks(false); },
      onSave: function (blocks) { props.onEditBlocks(blocks); setEditingBlocks(false); } }) : [
      e(WorkoutBlocks, { key: 'wb', blocks: w.blocks || [] }),
      best != null ? e('div', { key: 'pr', className: 'mb-4' }, e(Badge, { tone: 'amber' }, 'PR: ' + formatDuration(best))) : null,
      e('div', { key: 'log', className: 'flex flex-col gap-3 mb-4' },
        e('div', { className: 'text-sm font-semibold' }, 'Sessie loggen'),
        e('div', { className: 'grid grid-cols-2 gap-3' },
          e(Field, { label: 'Datum' }, e(TextInput, { type: 'date', value: f.date, onChange: set('date') })),
          e(Field, { label: 'Tijd (mm:ss)' }, e(TextInput, { placeholder: '12:45', value: f.time, onChange: set('time') }))
        ),
        e(Field, { label: 'Notitie' }, e('textarea', { rows: 2, value: f.note, onChange: set('note') })),
        e(Field, { label: 'Gem. hartslag (bpm, optioneel)' }, e(TextInput, { type: 'number', value: f.hr, onChange: set('hr') })),
        f.hr ? e(HRZoneBadge, { hr: num(f.hr) }) : null,
        e(Button, { onClick: function () { if (!f.time) return; props.onLog({ id: uid(), workoutId: w.id, date: f.date, time: f.time, note: f.note, hr: num(f.hr) }); setF({ date: todayISO(), time: '', note: '', hr: '' }); } }, 'Sessie opslaan')
      ),
      logs.length ? e('div', { key: 'hist' },
        e('div', { className: 'text-sm font-semibold mb-2' }, 'Geschiedenis'),
        e('div', { className: 'flex flex-col gap-2' },
          logs.map(function (l) { return e('div', { key: l.id, className: 'flex items-center justify-between text-sm py-1.5', style: { borderTop: '1px solid var(--border-soft)' } },
            e('span', { style: { color: 'var(--text-secondary)' } }, formatDateShort(l.date)),
            e('span', { className: 'font-medium' }, l.time),
            e('span', { className: 'text-xs truncate max-w-[120px]', style: { color: 'var(--text-tertiary)' } }, l.note || '')
          ); })
        )
      ) : null
    ]
  );
}
function HyroxWorkoutForm(props) {
  var st = useState({ name: '' }); var nf = st[0], setNf = st[1];
  return e('div', { className: 'flex flex-col gap-3' },
    e(Field, { label: 'Naam' }, e(TextInput, { value: nf.name, onChange: function (ev) { setNf({ name: ev.target.value }); } })),
    e(BlocksEditor, { initialBlocks: [], saveLabel: 'Workout opslaan', onSave: function (blocks) { if (!nf.name.trim()) return; props.onSave({ id: uid(), name: nf.name.trim(), blocks: blocks }); } })
  );
}
export function HyroxTab(props) {
  var st = useState(null); var openId = st[0], setOpenId = st[1];
  var st2 = useState(false); var adding = st2[0], setAdding = st2[1];
  var openWorkout = openId ? props.state.hyroxLibrary.find(function (w) { return w.id === openId; }) : null;
  function bestFor(id) {
    var logs = props.state.hyroxLogs.filter(function (l) { return l.workoutId === id; });
    return logs.reduce(function (min, l) { var s = parseDuration(l.time); return (s != null && (min == null || s < min)) ? s : min; }, null);
  }
  return e('div', { className: 'flex flex-col gap-5' },
    e('h2', { className: 'font-display text-xl font-semibold text-center' }, 'Hyrox'),
    e('p', { className: 'text-xs text-center -mt-3', style: { color: 'var(--text-tertiary)' } }, 'Geplande sessies vink je af in Schema — hier log je de workout-tijd.'),
    e('div', { className: 'flex items-center justify-between' },
      e('span', { className: 'text-sm font-semibold' }, 'Workout library'),
      e('button', { onClick: function () { setAdding(true); }, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, '+ Workout toevoegen')
    ),
    e('div', { className: 'flex flex-col gap-2' },
      props.state.hyroxLibrary.map(function (w) {
        var best = bestFor(w.id);
        var blockCount = (w.blocks || []).filter(function (b) { return b.movements.length; }).length;
        return e(Card, { key: w.id, className: 'p-3.5 cursor-pointer', onClick: function () { setOpenId(w.id); } },
          e('div', { className: 'flex items-start justify-between gap-2' },
            e('div', { className: 'flex-1' },
              e('div', { className: 'text-sm font-semibold mb-0.5' }, w.name),
              e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, blockCount + (blockCount === 1 ? ' onderdeel' : ' onderdelen'))
            ),
            e('div', { className: 'flex items-center gap-1' },
              best != null ? e(Badge, { tone: 'amber' }, formatDuration(best)) : null,
              e(KebabMenu, { actions: [
                { label: 'Bewerken', onClick: function () { setOpenId(w.id); } },
                { label: 'Verwijderen', danger: true, confirm: true, onClick: function () { props.deleteHyroxWorkout(w.id); } }
              ] })
            )
          )
        );
      })
    ),
    openWorkout ? e(HyroxDetail, { workout: openWorkout, logs: props.state.hyroxLogs, onClose: function () { setOpenId(null); }, onLog: props.logHyroxSession, onRename: function (name) { props.updateHyroxWorkout(openWorkout.id, { name: name }); }, onEditBlocks: function (blocks) { props.updateHyroxWorkout(openWorkout.id, { blocks: blocks }); }, onDelete: props.deleteHyroxWorkout }) : null,
    adding ? e(Modal, { title: 'Workout toevoegen', onClose: function () { setAdding(false); } },
      e(HyroxWorkoutForm, { onSave: function (w) { props.addHyroxWorkout(w); setAdding(false); } })
    ) : null
  );
}
