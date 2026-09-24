/* ---------------- Supabase datalaag ----------------
   Deze module is de vervanging van loadState()/saveState() (localStorage) uit
   de originele app. Elke tabel komt exact overeen met het schema in
   supabase/schema.sql. Rij <-> app-object mapping zet snake_case
   kolomnamen om naar de camelCase velden die de rest van de app (1-op-1
   overgenomen uit de originele hybrid-athlete-app.html) al gebruikt.

   Alle mutaties vereisen een ingelogde gebruiker: RLS staat schrijven alleen
   toe als user_id = auth.uid(), dus elke insert zet expliciet user_id mee. */
import { supabase } from './supabaseClient.js';
import { uid } from './helpers.js';

function assertNoError(label, error) {
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Supabase-fout bij ' + label + ':', error);
    throw error;
  }
}

/* ---------- races ---------- */
function raceFromRow(row) {
  return {
    id: row.id, name: row.name, date: row.date, type: row.type, targetPace: row.target_pace || '',
    pacingScenarios: row.pacing_scenarios, pacingNotes: row.pacing_notes || '',
    mealPlan: row.meal_plan || { days: [] }, carbNotes: row.carb_notes || '', result: row.result || null
  };
}
function raceToRow(race, userId) {
  return {
    id: race.id, user_id: userId, name: race.name, date: race.date, type: race.type || null,
    target_pace: race.targetPace || null, pacing_scenarios: race.pacingScenarios || null,
    pacing_notes: race.pacingNotes || null, meal_plan: race.mealPlan || { days: [] },
    carb_notes: race.carbNotes || null, result: race.result || null
  };
}
export async function dbInsertRace(userId, race) {
  var { error } = await supabase.from('races').insert(raceToRow(race, userId));
  assertNoError('wedstrijd toevoegen', error);
}
export async function dbUpdateRace(userId, race) {
  var { error } = await supabase.from('races').update(raceToRow(race, userId)).eq('id', race.id);
  assertNoError('wedstrijd bijwerken', error);
}
export async function dbDeleteRace(id) {
  var { error } = await supabase.from('races').delete().eq('id', id);
  assertNoError('wedstrijd verwijderen', error);
}

/* ---------- schedule_entries ---------- */
function entryFromRow(row) {
  return {
    id: row.id, date: row.date, weekLabel: row.week_label || '', sport: row.sport, type: row.type,
    plannedText: row.planned_text || '', distance: row.distance, pace: row.pace, hr: row.hr,
    completed: !!row.completed, actual: row.actual || null
  };
}
function entryToRow(entry, userId) {
  return {
    id: entry.id, user_id: userId, date: entry.date, week_label: entry.weekLabel || null, sport: entry.sport,
    type: entry.type, planned_text: entry.plannedText || null, distance: entry.distance,
    pace: entry.pace || null, hr: entry.hr, completed: !!entry.completed, actual: entry.actual || null
  };
}
export async function dbInsertEntry(userId, entry) {
  var { error } = await supabase.from('schedule_entries').insert(entryToRow(entry, userId));
  assertNoError('training toevoegen', error);
}
export async function dbUpdateEntry(userId, entry) {
  var { error } = await supabase.from('schedule_entries').update(entryToRow(entry, userId)).eq('id', entry.id);
  assertNoError('training bijwerken', error);
}
export async function dbDeleteEntry(id) {
  var { error } = await supabase.from('schedule_entries').delete().eq('id', id);
  assertNoError('training verwijderen', error);
}

/* ---------- strength_logs ---------- */
function strengthLogFromRow(row) {
  return {
    id: row.id, date: row.date, template: row.template, exercises: row.exercises || [], hr: row.hr,
    warmupType: row.warmup_type || null, warmupMinutes: row.warmup_minutes, durationMin: row.duration_minutes
  };
}
function strengthLogToRow(log, userId) {
  return {
    id: log.id, user_id: userId, date: log.date, template: log.template || null, exercises: log.exercises || [], hr: log.hr,
    warmup_type: log.warmupType || null, warmup_minutes: log.warmupMinutes != null ? log.warmupMinutes : null,
    duration_minutes: log.durationMin != null ? log.durationMin : null
  };
}
export async function dbInsertStrengthLog(userId, log) {
  var { error } = await supabase.from('strength_logs').insert(strengthLogToRow(log, userId));
  assertNoError('krachttraining opslaan', error);
}

/* ---------- strength_templates ----------
   Elk krachtschema (ingebouwd of zelf aangemaakt) is hier één rij; "exercises"
   is een jsonb-array van { name, linkToNext } - linkToNext geeft aan dat deze
   oefening samen met de volgende als superset getoond moet worden. */
function templateExercisesFromRow(exercises) {
  return (exercises || []).map(function (x) {
    return typeof x === 'string' ? { name: x, linkToNext: false } : { name: x.name, linkToNext: !!x.linkToNext };
  });
}
function templateFromRow(row) {
  return { id: row.id, name: row.name, exercises: templateExercisesFromRow(row.exercises), sortOrder: row.sort_order || 0 };
}
function templateToRow(t, userId) {
  return { id: t.id, user_id: userId, name: t.name, exercises: t.exercises || [], sort_order: t.sortOrder || 0 };
}
export async function dbInsertStrengthTemplate(userId, t) {
  var { error } = await supabase.from('strength_templates').insert(templateToRow(t, userId));
  assertNoError('schema toevoegen', error);
}
export async function dbUpdateStrengthTemplate(userId, t) {
  var { error } = await supabase.from('strength_templates').update(templateToRow(t, userId)).eq('id', t.id);
  assertNoError('schema bijwerken', error);
}
export async function dbDeleteStrengthTemplate(id) {
  var { error } = await supabase.from('strength_templates').delete().eq('id', id);
  assertNoError('schema verwijderen', error);
}
export async function seedDefaultStrengthTemplates(userId, defaults) {
  var rows = defaults.map(function (t, idx) {
    return templateToRow({ id: uid(), name: t.name, exercises: t.exercises.map(function (name) { return { name: name, linkToNext: false }; }), sortOrder: idx }, userId);
  });
  var { error } = await supabase.from('strength_templates').insert(rows);
  assertNoError('standaardschema\'s aanmaken', error);
}

/* ---------- hyrox_library ---------- */
function hyroxWorkoutFromRow(row) { return { id: row.id, name: row.name, blocks: row.blocks || [] }; }
function hyroxWorkoutToRow(w, userId) { return { id: w.id, user_id: userId, name: w.name, blocks: w.blocks || [] }; }
export async function dbInsertHyroxWorkout(userId, w) {
  var { error } = await supabase.from('hyrox_library').insert(hyroxWorkoutToRow(w, userId));
  assertNoError('hyrox-workout toevoegen', error);
}
export async function dbUpdateHyroxWorkout(userId, w) {
  var { error } = await supabase.from('hyrox_library').update(hyroxWorkoutToRow(w, userId)).eq('id', w.id);
  assertNoError('hyrox-workout bijwerken', error);
}
export async function dbDeleteHyroxWorkout(id) {
  // hyrox_logs.workout_id heeft ON DELETE CASCADE, dus gekoppelde logs verdwijnen automatisch mee.
  var { error } = await supabase.from('hyrox_library').delete().eq('id', id);
  assertNoError('hyrox-workout verwijderen', error);
}

/* ---------- hyrox_logs ---------- */
function hyroxLogFromRow(row) { return { id: row.id, workoutId: row.workout_id, date: row.date, time: row.time, note: row.note || '', hr: row.hr }; }
function hyroxLogToRow(log, userId) { return { id: log.id, user_id: userId, workout_id: log.workoutId, date: log.date, time: log.time, note: log.note || null, hr: log.hr }; }
export async function dbInsertHyroxLog(userId, log) {
  var { error } = await supabase.from('hyrox_logs').insert(hyroxLogToRow(log, userId));
  assertNoError('hyrox-sessie opslaan', error);
}

/* ---------- hyrox_race_results ---------- */
function hyroxRaceResultFromRow(row) { return { id: row.id, category: row.category, date: row.date, time: row.time, note: row.note || '' }; }
function hyroxRaceResultToRow(r, userId) { return { id: r.id, user_id: userId, category: r.category, date: r.date, time: r.time, note: r.note || null }; }
export async function dbInsertHyroxRaceResult(userId, r) {
  var { error } = await supabase.from('hyrox_race_results').insert(hyroxRaceResultToRow(r, userId));
  assertNoError('hyrox-resultaat toevoegen', error);
}
export async function dbUpdateHyroxRaceResult(userId, r) {
  var { error } = await supabase.from('hyrox_race_results').update(hyroxRaceResultToRow(r, userId)).eq('id', r.id);
  assertNoError('hyrox-resultaat bijwerken', error);
}
export async function dbDeleteHyroxRaceResult(id) {
  var { error } = await supabase.from('hyrox_race_results').delete().eq('id', id);
  assertNoError('hyrox-resultaat verwijderen', error);
}

/* ---------- run_race_results ---------- */
function runRaceResultFromRow(row) { return { id: row.id, km: row.km, date: row.date, time: row.time, note: row.note || '' }; }
function runRaceResultToRow(r, userId) { return { id: r.id, user_id: userId, km: r.km, date: r.date, time: r.time, note: r.note || null }; }
export async function dbInsertRunRaceResult(userId, r) {
  var { error } = await supabase.from('run_race_results').insert(runRaceResultToRow(r, userId));
  assertNoError('hardloop-PR toevoegen', error);
}
export async function dbUpdateRunRaceResult(userId, r) {
  var { error } = await supabase.from('run_race_results').update(runRaceResultToRow(r, userId)).eq('id', r.id);
  assertNoError('hardloop-PR bijwerken', error);
}
export async function dbDeleteRunRaceResult(id) {
  var { error } = await supabase.from('run_race_results').delete().eq('id', id);
  assertNoError('hardloop-PR verwijderen', error);
}

/* ---------- endurance_logs ----------
   "data" bevat alle sportafhankelijke velden (distance, time, hr, pace, power,
   cadence, totalDistance, totalTime, note, ...) - precies zoals dat voorheen
   los in het enduranceLogs-object van de app stond. */
function enduranceLogFromRow(row) {
  return Object.assign({ id: row.id, sport: row.sport, date: row.date }, row.data || {});
}
function enduranceLogToRow(log, userId) {
  var data = Object.assign({}, log);
  delete data.id; delete data.sport; delete data.date;
  return { id: log.id, user_id: userId, sport: log.sport, date: log.date, data: data };
}
export async function dbInsertEnduranceLog(userId, log) {
  var { error } = await supabase.from('endurance_logs').insert(enduranceLogToRow(log, userId));
  assertNoError('duursport-log toevoegen', error);
}
export async function dbDeleteEnduranceLog(id) {
  var { error } = await supabase.from('endurance_logs').delete().eq('id', id);
  assertNoError('duursport-log verwijderen', error);
}

/* ---------- mood_logs ----------
   Eén rij per dag per gebruiker (unieke index op user_id+date) - upsert dus
   in plaats van los insert/update, net als het origineel dat per dag maar
   één mood-registratie bijhoudt. */
function moodLogFromRow(row) { return { id: row.id, date: row.date, mood: row.mood }; }
export async function dbUpsertMood(userId, date, mood) {
  var { error } = await supabase.from('mood_logs').upsert(
    { user_id: userId, date: date, mood: mood },
    { onConflict: 'user_id,date' }
  );
  assertNoError('stemming opslaan', error);
}

/* ---------- complaint_logs ---------- */
function complaintFromRow(row) { return { id: row.id, date: row.date, type: row.type, pain: row.pain }; }
function complaintToRow(c, userId) { return { id: c.id, user_id: userId, date: c.date, type: c.type, pain: c.pain }; }
export async function dbInsertComplaint(userId, c) {
  var { error } = await supabase.from('complaint_logs').insert(complaintToRow(c, userId));
  assertNoError('klacht toevoegen', error);
}
export async function dbDeleteComplaint(id) {
  var { error } = await supabase.from('complaint_logs').delete().eq('id', id);
  assertNoError('klacht verwijderen', error);
}

/* ---------- body_weight_logs ----------
   Eén rij per dag per gebruiker (unieke index op user_id+date) - upsert dus,
   net als bij mood_logs, zodat een dubbele meting op dezelfde dag de vorige
   overschrijft in plaats van een tweede rij aan te maken. */
function bodyWeightFromRow(row) { return { id: row.id, date: row.date, weightKg: row.weight_kg }; }
export async function dbUpsertBodyWeight(userId, date, weightKg) {
  var { error } = await supabase.from('body_weight_logs').upsert(
    { user_id: userId, date: date, weight_kg: weightKg },
    { onConflict: 'user_id,date' }
  );
  assertNoError('lichaamsgewicht opslaan', error);
}
export async function dbDeleteBodyWeight(id) {
  var { error } = await supabase.from('body_weight_logs').delete().eq('id', id);
  assertNoError('lichaamsgewicht verwijderen', error);
}

/* ---------- triathlon_checklist_items ---------- */
function groupChecklistRows(rows) {
  var cl = { t1: [], t2: [], raceday: [] };
  rows.slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }).forEach(function (row) {
    if (!cl[row.section]) cl[row.section] = [];
    cl[row.section].push({ id: row.id, text: row.text, checked: !!row.checked });
  });
  return cl;
}
export async function dbToggleChecklistItem(id, checked) {
  var { error } = await supabase.from('triathlon_checklist_items').update({ checked: checked }).eq('id', id);
  assertNoError('checklist-item bijwerken', error);
}
export async function dbAddChecklistItem(userId, section, text, sortOrder) {
  var row = { id: uid(), user_id: userId, section: section, text: text, checked: false, sort_order: sortOrder };
  var { error } = await supabase.from('triathlon_checklist_items').insert(row);
  assertNoError('checklist-item toevoegen', error);
  return row.id;
}
export async function dbRemoveChecklistItem(id) {
  var { error } = await supabase.from('triathlon_checklist_items').delete().eq('id', id);
  assertNoError('checklist-item verwijderen', error);
}
export async function dbResetChecklist(userId) {
  var { error } = await supabase.from('triathlon_checklist_items').update({ checked: false }).eq('user_id', userId);
  assertNoError('checklist resetten', error);
}
export async function dbSeedChecklistIfEmpty(userId, defaultChecklist) {
  var sections = ['t1', 't2', 'raceday'];
  var rows = [];
  sections.forEach(function (section) {
    (defaultChecklist[section] || []).forEach(function (item, idx) {
      rows.push({ id: item.id, user_id: userId, section: section, text: item.text, checked: !!item.checked, sort_order: idx });
    });
  });
  if (!rows.length) return;
  var { error } = await supabase.from('triathlon_checklist_items').insert(rows);
  assertNoError('checklist seeden', error);
}

/* ---------- alles ophalen ---------- */
// Los van de rest opgehaald en met een eigen vangnet: als de SQL-migratie
// voor "strength_templates" nog niet is uitgevoerd (tabel bestaat nog niet),
// mag dat de rest van de app niet blokkeren - dan laden we gewoon verder met
// een lege lijst schema's i.p.v. dat de hele app vastloopt. De query wordt
// hier al gestart (niet pas na de Promise.all hieronder afgewacht), zodat hij
// gelijktijdig met de andere tabellen ophaalt in plaats van er sequentieel
// achteraan te lopen.
async function fetchStrengthTemplatesSafely(userId) {
  try {
    var res = await supabase.from('strength_templates').select('*').eq('user_id', userId).order('sort_order', { ascending: true });
    if (res.error) throw res.error;
    return res.data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Supabase-fout bij krachtschema\'s ophalen (mogelijk migratie nog niet uitgevoerd):', err);
    return [];
  }
}

// Zelfde vangnet als hierboven, voor de nieuwe tabel "body_weight_logs": als
// die migratie nog niet gedraaid is, laadt de rest van de app gewoon door
// met een lege lijst metingen.
async function fetchBodyWeightLogsSafely(userId) {
  try {
    var res = await supabase.from('body_weight_logs').select('*').eq('user_id', userId).order('date', { ascending: true });
    if (res.error) throw res.error;
    return res.data;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Supabase-fout bij lichaamsgewicht ophalen (mogelijk migratie nog niet uitgevoerd):', err);
    return [];
  }
}

export async function fetchAllData(userId) {
  var strengthTemplatesPromise = fetchStrengthTemplatesSafely(userId);
  var bodyWeightLogsPromise = fetchBodyWeightLogsSafely(userId);

  var results = await Promise.all([
    supabase.from('races').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('schedule_entries').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('strength_logs').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('hyrox_library').select('*').eq('user_id', userId),
    supabase.from('hyrox_logs').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('hyrox_race_results').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('run_race_results').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('endurance_logs').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('mood_logs').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('complaint_logs').select('*').eq('user_id', userId).order('date', { ascending: true }),
    supabase.from('triathlon_checklist_items').select('*').eq('user_id', userId),
  ]);
  results.forEach(function (r) { assertNoError('data ophalen', r.error); });

  var strengthTemplatesRows = await strengthTemplatesPromise;
  var bodyWeightLogsRows = await bodyWeightLogsPromise;

  var [races, entries, strength, hyroxLib, hyroxLogs, hyroxRace, runRace, endurance, mood, complaints, checklist] = results;

  return {
    races: races.data.map(raceFromRow),
    scheduleEntries: entries.data.map(entryFromRow),
    strengthLogs: strength.data.map(strengthLogFromRow),
    strengthTemplates: strengthTemplatesRows.map(templateFromRow),
    hyroxLibrary: hyroxLib.data.map(hyroxWorkoutFromRow),
    hyroxLogs: hyroxLogs.data.map(hyroxLogFromRow),
    hyroxRaceResults: hyroxRace.data.map(hyroxRaceResultFromRow),
    runRaceResults: runRace.data.map(runRaceResultFromRow),
    enduranceLogs: endurance.data.map(enduranceLogFromRow),
    moodLogs: mood.data.map(moodLogFromRow),
    complaintLogs: complaints.data.map(complaintFromRow),
    bodyWeightLogs: bodyWeightLogsRows.map(bodyWeightFromRow),
    triathlonChecklist: groupChecklistRows(checklist.data),
    isEmpty: races.data.length === 0 && entries.data.length === 0 && hyroxLib.data.length === 0 && checklist.data.length === 0,
  };
}

/* ---------- eenmalig voorbeelddata laden (optioneel, alleen bij leeg account) ---------- */
export async function seedDefaultData(userId, defaultState) {
  await Promise.all([
    supabase.from('races').insert(defaultState.races.map(function (r) { return raceToRow(r, userId); })),
    supabase.from('schedule_entries').insert(defaultState.scheduleEntries.map(function (x) { return entryToRow(x, userId); })),
    supabase.from('hyrox_library').insert(defaultState.hyroxLibrary.map(function (w) { return hyroxWorkoutToRow(w, userId); })),
    supabase.from('hyrox_race_results').insert(defaultState.hyroxRaceResults.map(function (r) { return hyroxRaceResultToRow(r, userId); })),
    supabase.from('run_race_results').insert(defaultState.runRaceResults.map(function (r) { return runRaceResultToRow(r, userId); })),
    dbSeedChecklistIfEmpty(userId, defaultState.triathlonChecklist),
  ]);
}

/* ---------- backup (export/import) ----------
   exportBackup(state) levert exact dezelfde JSON-vorm op als de oude
   localStorage-app, zodat een bestaande backup uit de oude app hier
   geïmporteerd kan worden en andersom.
   LET OP - bewuste bugfix t.o.v. het origineel: de oude import-functie liet
   moodLogs, complaintLogs en triathlonChecklist per ongeluk weg (die gingen
   verloren bij een import, ook al zaten ze wel in de export). Hier worden
   ze wél meegenomen. */
export async function importBackupToSupabase(userId, data) {
  async function replaceTable(table, rows) {
    var del = await supabase.from(table).delete().eq('user_id', userId);
    assertNoError('backup importeren (' + table + ' wissen)', del.error);
    if (rows.length) {
      var ins = await supabase.from(table).insert(rows);
      assertNoError('backup importeren (' + table + ' schrijven)', ins.error);
    }
  }
  if (data.races) await replaceTable('races', data.races.map(function (r) { return raceToRow(Object.assign({ id: r.id || uid() }, r), userId); }));
  if (data.scheduleEntries) await replaceTable('schedule_entries', data.scheduleEntries.map(function (x) { return entryToRow(Object.assign({ id: x.id || uid() }, x), userId); }));
  if (data.strengthLogs) await replaceTable('strength_logs', data.strengthLogs.map(function (l) { return strengthLogToRow(Object.assign({ id: l.id || uid() }, l), userId); }));
  if (data.strengthTemplates) await replaceTable('strength_templates', data.strengthTemplates.map(function (t) { return templateToRow(Object.assign({ id: t.id || uid() }, t), userId); }));
  if (data.hyroxLibrary) await replaceTable('hyrox_library', data.hyroxLibrary.map(function (w) { return hyroxWorkoutToRow(Object.assign({ id: w.id || uid() }, w), userId); }));
  if (data.hyroxLogs) await replaceTable('hyrox_logs', data.hyroxLogs.map(function (l) { return hyroxLogToRow(Object.assign({ id: l.id || uid() }, l), userId); }));
  if (data.hyroxRaceResults) await replaceTable('hyrox_race_results', data.hyroxRaceResults.map(function (r) { return hyroxRaceResultToRow(Object.assign({ id: r.id || uid() }, r), userId); }));
  if (data.runRaceResults) await replaceTable('run_race_results', data.runRaceResults.map(function (r) { return runRaceResultToRow(Object.assign({ id: r.id || uid() }, r), userId); }));
  if (data.enduranceLogs) await replaceTable('endurance_logs', data.enduranceLogs.map(function (l) { return enduranceLogToRow(Object.assign({ id: l.id || uid() }, l), userId); }));
  if (data.moodLogs) await replaceTable('mood_logs', data.moodLogs.map(function (m) { return { id: m.id || uid(), user_id: userId, date: m.date, mood: m.mood }; }));
  if (data.complaintLogs) await replaceTable('complaint_logs', data.complaintLogs.map(function (c) { return complaintToRow(Object.assign({ id: c.id || uid() }, c), userId); }));
  if (data.bodyWeightLogs) await replaceTable('body_weight_logs', data.bodyWeightLogs.map(function (b) { return { id: b.id || uid(), user_id: userId, date: b.date, weight_kg: b.weightKg }; }));
  if (data.triathlonChecklist) {
    var rows = [];
    ['t1', 't2', 'raceday'].forEach(function (section) {
      (data.triathlonChecklist[section] || []).forEach(function (item, idx) {
        rows.push({ id: item.id || uid(), user_id: userId, section: section, text: item.text, checked: !!item.checked, sort_order: idx });
      });
    });
    await replaceTable('triathlon_checklist_items', rows);
  }
}
