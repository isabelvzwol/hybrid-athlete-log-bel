/* ---------------- App root ----------------
   Dit is de vervanging van de "App root" sectie uit de originele
   hybrid-athlete-app.html. Zelfde handler-namen en dezelfde manier van
   werken (lokale state + optimistic update), maar nu met Supabase als
   opslag i.p.v. localStorage: elke handler doet naast de lokale setState
   ook de bijbehorende Supabase-mutatie (zie src/lib/db.js). */
import React, { useState, useEffect } from 'react';
import { AuthGate } from './Auth.jsx';
import { supabase } from './lib/supabaseClient.js';
import * as db from './lib/db.js';
import { emptyState, defaultState, mkEntry } from './lib/defaultData.js';
import { uid, todayISO } from './lib/helpers.js';
import { NAV, DEFAULT_STRENGTH_TEMPLATES } from './lib/constants.js';
import { Home } from './screens/Home.jsx';
import { SchemaTab } from './screens/Schema.jsx';
import { KrachtTab } from './screens/Kracht.jsx';
import { HyroxTab } from './screens/Hyrox.jsx';
import { DuursportTab } from './screens/Duursport.jsx';
import { PRTab } from './screens/PRs.jsx';
import { SearchModal, SettingsModal, AnnualRecapModal } from './screens/SearchAndSettings.jsx';
import { LogTrainingModal } from './components/scheduling.jsx';
var e = React.createElement;

function AppInner(props) {
  var session = props.session;
  var userId = session.user.id;
  var st = useState(emptyState()); var state = st[0], setState = st[1];
  var stLoading = useState(true); var loading = stLoading[0], setLoading = stLoading[1];
  var stEmpty = useState(false); var hasNoData = stEmpty[0], setHasNoData = stEmpty[1];
  var st2 = useState('home'); var tab = st2[0], setTab = st2[1];
  var st3 = useState(false); var settingsOpen = st3[0], setSettingsOpen = st3[1];
  var st4 = useState(false); var searchOpen = st4[0], setSearchOpen = st4[1];
  var st5 = useState(null); var searchLogEntry = st5[0], setSearchLogEntry = st5[1];
  var st6 = useState(false); var recapOpen = st6[0], setRecapOpen = st6[1];
  var st7 = useState(false); var dbError = st7[0], setDbError = st7[1];

  function loadAll() {
    return db.fetchAllData(userId).then(function (data) {
      var isEmpty = data.isEmpty;
      var rest = Object.assign({}, data);
      delete rest.isEmpty;
      setState(rest);
      setHasNoData(isEmpty);
      setLoading(false);
      setDbError(false);
      if (!rest.strengthTemplates || rest.strengthTemplates.length === 0) {
        // Eenmalig (per account): de 3 standaardschema's als rijen aanmaken,
        // zodat ze net als voorheen meteen beschikbaar zijn, maar nu ook
        // hernoembaar/aanpasbaar/verwijderbaar zijn via de Kracht-tab. Als de
        // SQL-migratie nog niet is uitgevoerd (tabel bestaat nog niet) faalt
        // dit gewoon stil - de rest van de app blijft intussen bruikbaar en
        // de schema's verschijnen bij de eerstvolgende herlaad-poging.
        db.seedDefaultStrengthTemplates(userId, DEFAULT_STRENGTH_TEMPLATES).then(function () {
          return db.fetchAllData(userId);
        }).then(function (data2) {
          var rest2 = Object.assign({}, data2);
          delete rest2.isEmpty;
          setState(rest2);
        }).catch(function (err) {
          // eslint-disable-next-line no-console
          console.error('Standaardschema\'s aanmaken is (nog) niet gelukt:', err);
        });
      }
    });
  }
  useEffect(function () {
    var alive = true;
    loadAll().catch(function () { if (alive) { setDbError(true); setLoading(false); } });
    return function () { alive = false; };
  }, [userId]);

  function track(promise) {
    promise.then(function () { setDbError(false); }).catch(function (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setDbError(true);
    });
  }

  function sortRaces(list) { return list.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); }
  function addRace(r) { setState(function (p) { return Object.assign({}, p, { races: sortRaces(p.races.concat([r])) }); }); track(db.dbInsertRace(userId, r)); }
  function updateRace(r) { setState(function (p) { return Object.assign({}, p, { races: sortRaces(p.races.map(function (x) { return x.id === r.id ? r : x; })) }); }); track(db.dbUpdateRace(userId, r)); }
  function deleteRace(id) { setState(function (p) { return Object.assign({}, p, { races: p.races.filter(function (x) { return x.id !== id; }) }); }); track(db.dbDeleteRace(id)); }

  function addEntry(entry) { setState(function (p) { return Object.assign({}, p, { scheduleEntries: p.scheduleEntries.concat([entry]) }); }); track(db.dbInsertEntry(userId, entry)); }
  function completeEntry(id, actual) {
    var merged = null;
    setState(function (p) { return Object.assign({}, p, { scheduleEntries: p.scheduleEntries.map(function (x) { if (x.id === id) { merged = Object.assign({}, x, { completed: true, actual: actual }); return merged; } return x; }) }); });
    if (merged) track(db.dbUpdateEntry(userId, merged));
  }
  function uncompleteEntry(id) {
    var merged = null;
    setState(function (p) { return Object.assign({}, p, { scheduleEntries: p.scheduleEntries.map(function (x) { if (x.id === id) { merged = Object.assign({}, x, { completed: false, actual: null }); return merged; } return x; }) }); });
    if (merged) track(db.dbUpdateEntry(userId, merged));
  }
  function updateEntry(id, patch) {
    var merged = null;
    setState(function (p) { return Object.assign({}, p, { scheduleEntries: p.scheduleEntries.map(function (x) { if (x.id === id) { merged = Object.assign({}, x, patch); return merged; } return x; }) }); });
    if (merged) track(db.dbUpdateEntry(userId, merged));
  }
  function deleteEntry(id) { setState(function (p) { return Object.assign({}, p, { scheduleEntries: p.scheduleEntries.filter(function (x) { return x.id !== id; }) }); }); track(db.dbDeleteEntry(id)); }

  function addStrengthLog(log) { setState(function (p) { return Object.assign({}, p, { strengthLogs: p.strengthLogs.concat([log]) }); }); track(db.dbInsertStrengthLog(userId, log)); }
  function addStrengthTemplate(t) { setState(function (p) { return Object.assign({}, p, { strengthTemplates: p.strengthTemplates.concat([t]) }); }); track(db.dbInsertStrengthTemplate(userId, t)); }
  function updateStrengthTemplate(patch) {
    var merged = null;
    setState(function (p) { return Object.assign({}, p, { strengthTemplates: p.strengthTemplates.map(function (t) { if (t.id === patch.id) { merged = Object.assign({}, t, patch); return merged; } return t; }) }); });
    if (merged) track(db.dbUpdateStrengthTemplate(userId, merged));
  }
  function deleteStrengthTemplate(id) { setState(function (p) { return Object.assign({}, p, { strengthTemplates: p.strengthTemplates.filter(function (t) { return t.id !== id; }) }); }); track(db.dbDeleteStrengthTemplate(id)); }
  function addHyroxLog(log) { setState(function (p) { return Object.assign({}, p, { hyroxLogs: p.hyroxLogs.concat([log]) }); }); track(db.dbInsertHyroxLog(userId, log)); }
  function logHyroxSession(log) {
    track(db.dbInsertHyroxLog(userId, log));
    setState(function (p) {
      var newHyroxLogs = p.hyroxLogs.concat([log]);
      var workout = p.hyroxLibrary.find(function (w) { return w.id === log.workoutId; });
      var workoutName = workout ? workout.name : 'Hyrox workout';
      var existingIdx = -1;
      p.scheduleEntries.forEach(function (x, i) { if (x.sport === 'Hyrox' && x.date === log.date && !x.completed && existingIdx === -1) existingIdx = i; });
      var scheduleEntries;
      if (existingIdx >= 0) {
        var updated = Object.assign({}, p.scheduleEntries[existingIdx], { completed: true, actual: { workoutId: log.workoutId, time: log.time, note: log.note, hr: log.hr != null ? log.hr : null } });
        scheduleEntries = p.scheduleEntries.map(function (x, i) { return i === existingIdx ? updated : x; });
        track(db.dbUpdateEntry(userId, updated));
      } else {
        var newEntry = { id: uid(), date: log.date, weekLabel: '', sport: 'Hyrox', type: workoutName, plannedText: workoutName, distance: null, pace: null, hr: null, completed: true, actual: { workoutId: log.workoutId, time: log.time, note: log.note, hr: log.hr != null ? log.hr : null } };
        scheduleEntries = p.scheduleEntries.concat([newEntry]);
        track(db.dbInsertEntry(userId, newEntry));
      }
      return Object.assign({}, p, { hyroxLogs: newHyroxLogs, scheduleEntries: scheduleEntries });
    });
  }
  function addHyroxWorkout(w) { setState(function (p) { return Object.assign({}, p, { hyroxLibrary: p.hyroxLibrary.concat([w]) }); }); track(db.dbInsertHyroxWorkout(userId, w)); }
  function updateHyroxWorkout(id, patch) {
    var merged = null;
    setState(function (p) { return Object.assign({}, p, { hyroxLibrary: p.hyroxLibrary.map(function (w) { if (w.id === id) { merged = Object.assign({}, w, patch); return merged; } return w; }) }); });
    if (merged) track(db.dbUpdateHyroxWorkout(userId, merged));
  }
  function deleteHyroxWorkout(id) {
    setState(function (p) { return Object.assign({}, p, { hyroxLibrary: p.hyroxLibrary.filter(function (w) { return w.id !== id; }), hyroxLogs: p.hyroxLogs.filter(function (l) { return l.workoutId !== id; }) }); });
    track(db.dbDeleteHyroxWorkout(id));
  }
  function addHyroxRaceResult(r) { setState(function (p) { return Object.assign({}, p, { hyroxRaceResults: p.hyroxRaceResults.concat([r]) }); }); track(db.dbInsertHyroxRaceResult(userId, r)); }
  function addRunRaceResult(r) { setState(function (p) { return Object.assign({}, p, { runRaceResults: p.runRaceResults.concat([r]) }); }); track(db.dbInsertRunRaceResult(userId, r)); }
  function setMood(mood) {
    var t = todayISO();
    setState(function (p) {
      var exists = p.moodLogs.some(function (m) { return m.date === t; });
      var logs = exists ? p.moodLogs.map(function (m) { return m.date === t ? Object.assign({}, m, { mood: mood }) : m; }) : p.moodLogs.concat([{ id: uid(), date: t, mood: mood }]);
      return Object.assign({}, p, { moodLogs: logs });
    });
    track(db.dbUpsertMood(userId, t, mood));
  }
  function addComplaint(c) { setState(function (p) { return Object.assign({}, p, { complaintLogs: p.complaintLogs.concat([c]) }); }); track(db.dbInsertComplaint(userId, c)); }
  function deleteComplaint(id) { setState(function (p) { return Object.assign({}, p, { complaintLogs: p.complaintLogs.filter(function (c) { return c.id !== id; }) }); }); track(db.dbDeleteComplaint(id)); }
  function updateRunRaceResult(id, patch) {
    var merged = null;
    setState(function (p) { return Object.assign({}, p, { runRaceResults: p.runRaceResults.map(function (r) { if (r.id === id) { merged = Object.assign({}, r, patch); return merged; } return r; }) }); });
    if (merged) track(db.dbUpdateRunRaceResult(userId, merged));
  }
  function deleteRunRaceResult(id) { setState(function (p) { return Object.assign({}, p, { runRaceResults: p.runRaceResults.filter(function (r) { return r.id !== id; }) }); }); track(db.dbDeleteRunRaceResult(id)); }
  function updateHyroxRaceResult(id, patch) {
    var merged = null;
    setState(function (p) { return Object.assign({}, p, { hyroxRaceResults: p.hyroxRaceResults.map(function (r) { if (r.id === id) { merged = Object.assign({}, r, patch); return merged; } return r; }) }); });
    if (merged) track(db.dbUpdateHyroxRaceResult(userId, merged));
  }
  function deleteHyroxRaceResult(id) { setState(function (p) { return Object.assign({}, p, { hyroxRaceResults: p.hyroxRaceResults.filter(function (r) { return r.id !== id; }) }); }); track(db.dbDeleteHyroxRaceResult(id)); }
  function seedMyPRs() {
    var defaults = defaultState();
    var newRun = defaults.runRaceResults.filter(function (r) { return !state.runRaceResults.some(function (x) { return x.km === r.km; }); });
    var newHyrox = defaults.hyroxRaceResults.filter(function (r) { return !state.hyroxRaceResults.some(function (x) { return x.category === r.category; }); });
    setState(function (p) { return Object.assign({}, p, { runRaceResults: p.runRaceResults.concat(newRun), hyroxRaceResults: p.hyroxRaceResults.concat(newHyrox) }); });
    newRun.forEach(function (r) { track(db.dbInsertRunRaceResult(userId, r)); });
    newHyrox.forEach(function (r) { track(db.dbInsertHyroxRaceResult(userId, r)); });
  }
  function fixSeptemberRunningData() {
    var before = state.scheduleEntries;
    var entries = before.filter(function (x) { return !(x.plannedText === '2k @5:52, 8k @4:36' && x.date !== '2026-09-16'); });
    var hasCorrect = entries.some(function (x) { return x.date === '2026-09-16' && x.plannedText === '2k @5:52, 8k @4:36'; });
    if (!hasCorrect) entries = entries.concat([mkEntry('2026-09-16', 'Week 16', 'Herstel', '2k @5:52, 8k @4:36', 10, '4:52', 162)]);
    var toAdd = [
      mkEntry('2026-09-07', 'Week 15 (Bali)', 'Herstel', '12k', 10.25, '5:55', 146),
      mkEntry('2026-09-09', 'Week 15 (Bali)', 'Interval', '6,5k', 6.5, '5:23', 144),
      mkEntry('2026-09-11', 'Week 15 (Bali)', 'Herstel', '13k, 2k @4:40, 1k @4:39', 13, '5:27', 157)
    ].filter(function (ne) { return !entries.some(function (x) { return x.date === ne.date && x.plannedText === ne.plannedText; }); });
    var after = entries.concat(toAdd);
    var removedIds = before.filter(function (x) { return !after.some(function (y) { return y.id === x.id; }); }).map(function (x) { return x.id; });
    var addedRows = after.filter(function (x) { return !before.some(function (y) { return y.id === x.id; }); });
    setState(function (p) { return Object.assign({}, p, { scheduleEntries: after }); });
    removedIds.forEach(function (id) { track(db.dbDeleteEntry(id)); });
    addedRows.forEach(function (row) { track(db.dbInsertEntry(userId, row)); });
  }
  function addEnduranceLog(log) { setState(function (p) { return Object.assign({}, p, { enduranceLogs: p.enduranceLogs.concat([log]) }); }); track(db.dbInsertEnduranceLog(userId, log)); }
  function deleteEnduranceLog(id) { setState(function (p) { return Object.assign({}, p, { enduranceLogs: p.enduranceLogs.filter(function (l) { return l.id !== id; }) }); }); track(db.dbDeleteEnduranceLog(id)); }
  function toggleChecklistItem(section, id) {
    var newChecked = null;
    setState(function (p) {
      var cl = Object.assign({}, p.triathlonChecklist);
      cl[section] = cl[section].map(function (it) { if (it.id === id) { newChecked = !it.checked; return Object.assign({}, it, { checked: newChecked }); } return it; });
      return Object.assign({}, p, { triathlonChecklist: cl });
    });
    if (newChecked !== null) track(db.dbToggleChecklistItem(id, newChecked));
  }
  function addChecklistItem(section, text) {
    var newId = uid();
    var sortOrder = (state.triathlonChecklist[section] || []).length;
    setState(function (p) { var cl = Object.assign({}, p.triathlonChecklist); cl[section] = cl[section].concat([{ id: newId, text: text, checked: false }]); return Object.assign({}, p, { triathlonChecklist: cl }); });
    track(db.dbAddChecklistItem(userId, section, text, sortOrder));
  }
  function removeChecklistItem(section, id) {
    setState(function (p) { var cl = Object.assign({}, p.triathlonChecklist); cl[section] = cl[section].filter(function (it) { return it.id !== id; }); return Object.assign({}, p, { triathlonChecklist: cl }); });
    track(db.dbRemoveChecklistItem(id));
  }
  function resetChecklist() {
    setState(function (p) { var cl = {}; ['t1', 't2', 'raceday'].forEach(function (section) { cl[section] = p.triathlonChecklist[section].map(function (it) { return Object.assign({}, it, { checked: false }); }); }); return Object.assign({}, p, { triathlonChecklist: cl }); });
    track(db.dbResetChecklist(userId));
  }

  function fallbackDownload(payload) {
    try {
      var blob = new Blob([payload], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'hybrid-athlete-backup-' + todayISO() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return Promise.resolve(true);
    } catch (err) { return Promise.resolve(false); }
  }
  function exportData() {
    var payload = JSON.stringify(state, null, 2);
    return fallbackDownload(payload);
  }
  function importData(data) {
    return db.importBackupToSupabase(userId, data).then(function () { return loadAll(); });
  }
  function loadDemoData() {
    db.seedDefaultData(userId, defaultState()).then(loadAll);
  }
  function signOut() { supabase.auth.signOut(); }

  if (loading) {
    return e('div', { className: 'min-h-screen flex items-center justify-center', style: { background: 'var(--bg-app)', color: 'var(--text-tertiary)' } }, 'Data laden…');
  }

  var content;
  if (tab === 'home') content = e(Home, { state: state, setTab: setTab, addRace: addRace, updateRace: updateRace, deleteRace: deleteRace, addEntry: addEntry, completeEntry: completeEntry, uncompleteEntry: uncompleteEntry, updateEntry: updateEntry, deleteEntry: deleteEntry, addStrengthLog: addStrengthLog, addHyroxLog: addHyroxLog, setMood: setMood, addComplaint: addComplaint, deleteComplaint: deleteComplaint, onOpenRecap: function () { setRecapOpen(true); } });
  else if (tab === 'schema') content = e(SchemaTab, { state: state, completeEntry: completeEntry, uncompleteEntry: uncompleteEntry, addEntry: addEntry, updateEntry: updateEntry, deleteEntry: deleteEntry, addStrengthLog: addStrengthLog, addHyroxLog: addHyroxLog });
  else if (tab === 'kracht') content = e(KrachtTab, { state: state, addStrengthLog: addStrengthLog, addStrengthTemplate: addStrengthTemplate, updateStrengthTemplate: updateStrengthTemplate, deleteStrengthTemplate: deleteStrengthTemplate });
  else if (tab === 'hyrox') content = e(HyroxTab, { state: state, addHyroxLog: addHyroxLog, logHyroxSession: logHyroxSession, addHyroxWorkout: addHyroxWorkout, updateHyroxWorkout: updateHyroxWorkout, deleteHyroxWorkout: deleteHyroxWorkout, addHyroxRaceResult: addHyroxRaceResult });
  else if (tab === 'duursport') content = e(DuursportTab, { state: state, addEnduranceLog: addEnduranceLog, deleteEntry: deleteEntry, deleteEnduranceLog: deleteEnduranceLog, toggleChecklistItem: toggleChecklistItem, addChecklistItem: addChecklistItem, removeChecklistItem: removeChecklistItem, resetChecklist: resetChecklist });
  else if (tab === 'prs') content = e(PRTab, { state: state, addHyroxRaceResult: addHyroxRaceResult, addRunRaceResult: addRunRaceResult, updateRunRaceResult: updateRunRaceResult, deleteRunRaceResult: deleteRunRaceResult, updateHyroxRaceResult: updateHyroxRaceResult, deleteHyroxRaceResult: deleteHyroxRaceResult, seedMyPRs: seedMyPRs });

  return e('div', { className: 'min-h-screen flex flex-col', style: { background: 'var(--bg-app)' } },
    dbError ? e('div', { className: 'sticky top-0 z-50 px-4 py-2.5 text-center text-xs font-semibold', style: { background: 'var(--danger)', color: '#2A0E0E' } },
      '⚠️ Wijzigingen worden niet opgeslagen! Controleer je internetverbinding en ververs de pagina.'
    ) : null,
    e('div', { className: 'sticky top-0 z-30 flex items-center justify-between px-4 pt-4 pb-2', style: { background: 'var(--bg-app)' } },
      e('span', { className: 'font-display text-sm font-semibold tracking-tight', style: { color: 'var(--text-tertiary)' } }, 'HYBRID LOG'),
      e('div', { className: 'flex items-center gap-2' },
        e('button', { onClick: function () { setSearchOpen(true); }, className: 'w-8 h-8 rounded-full flex items-center justify-center', style: { background: 'var(--bg-elevated)' } }, '🔎'),
        e('button', { onClick: function () { setSettingsOpen(true); }, className: 'w-8 h-8 rounded-full flex items-center justify-center', style: { background: 'var(--bg-elevated)' } }, '⚙️')
      )
    ),
    e('div', { className: 'flex-1 px-4 pb-28 pt-2 fade-in', key: tab }, content),
    e('div', { className: 'fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center px-1 pt-2', style: { background: 'var(--bg-card)', borderTop: '1px solid var(--border-soft)', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 8px)' } },
      NAV.map(function (n) {
        var active = n.key === tab;
        return e('button', { key: n.key, onClick: function () { setTab(n.key); }, className: 'flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl', style: { background: active ? 'var(--sage-bg)' : 'transparent' } },
          e('span', { style: { fontSize: '19px', opacity: active ? 1 : 0.55 } }, n.icon),
          e('span', { className: 'text-[10px] font-medium', style: { color: active ? 'var(--sage-strong)' : 'var(--text-tertiary)' } }, n.label)
        );
      })
    ),
    settingsOpen ? e(SettingsModal, { onClose: function () { setSettingsOpen(false); }, exportData: exportData, importData: importData, hasNoData: hasNoData, loadDemoData: loadDemoData, signOut: signOut }) : null,
    searchOpen ? e(SearchModal, { state: state, onClose: function () { setSearchOpen(false); },
      onOpenEntry: function (entry) { setSearchOpen(false); setSearchLogEntry(entry); },
      onGoTo: function (kind) { setSearchOpen(false); setTab(kind === 'strength' ? 'kracht' : kind === 'hyrox' || kind === 'hyroxLib' ? 'hyrox' : kind === 'endurance' ? 'duursport' : 'home'); } }) : null,
    searchLogEntry ? e(LogTrainingModal, { entry: searchLogEntry, onClose: function () { setSearchLogEntry(null); },
      onSave: function (id, actual) { completeEntry(id, actual); setSearchLogEntry(null); },
      onUncomplete: uncompleteEntry, onUpdateEntry: updateEntry, onDeleteEntry: deleteEntry, strengthLogs: state.strengthLogs, strengthTemplates: state.strengthTemplates, onSaveStrengthLog: addStrengthLog, hyroxLibrary: state.hyroxLibrary, onSaveHyroxLog: addHyroxLog }) : null,
    recapOpen ? e(AnnualRecapModal, { state: state, onClose: function () { setRecapOpen(false); } }) : null
  );
}

export default function App() {
  return e(AuthGate, {}, function (session) { return e(AppInner, { session: session }); });
}
