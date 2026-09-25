/* ---------------- domeinlogica over de app-state ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html (pure
   berekeningen, geen opslag-afhankelijke code - precies de functies die
   volgens de migratiespec ongewijzigd konden blijven). */
import { parseDuration, formatDuration, addDays, getMonday, todayISO, daysBetween, avgOf, isoWeekNumber, formatDateWithYear } from './helpers.js';
import { hrZone, STANDARD_DISTANCES, HR_SPORTS } from './constants.js';

export function computePreview(sport, f) {
  if (sport === 'Zwemmen') {
    var t = parseDuration(f.time); var d = parseFloat(f.distance);
    if (t && d) return 'Tempo: ' + formatDuration((t / d) * 100) + ' /100m';
  }
  if (sport === 'Wielrennen / Kickr') {
    var th = parseDuration(f.time); var dk = parseFloat(f.distance);
    if (th && dk) return 'Gem. snelheid: ' + ((dk / (th / 3600)).toFixed(1)) + ' km/h';
  }
  if (sport === 'Hardlopen') {
    var tr = parseDuration(f.time); var dr = parseFloat(f.distance);
    if (tr && dr) return 'Gem. pace: ' + formatDuration(tr / dr) + ' /km';
  }
  return null;
}

export function enduranceArchiveItems(state, sport) {
  var out = [];
  state.scheduleEntries.filter(function (x) { return x.sport === sport && x.completed && x.actual; }).forEach(function (x) {
    var a = x.actual;
    if (sport === 'Brick') {
      var distance, timeSec;
      if (a.bike || a.run) {
        var bikeSec = parseDuration(a.bike && a.bike.time) || 0;
        var runSec = parseDuration(a.run && a.run.time) || 0;
        var transSec = parseDuration(a.transition) || 0;
        distance = (a.bike && a.bike.distance || 0) + (a.run && a.run.distance || 0);
        timeSec = (bikeSec + runSec + transSec) || null;
      } else {
        distance = a.distance != null ? a.distance : x.distance;
        timeSec = a.time ? parseDuration(a.time) : null;
      }
      out.push({ id: x.id, date: x.date, distance: distance, timeSec: timeSec, hr: a.hr != null ? a.hr : null, note: a.note || x.type, source: 'schema' });
    } else {
      out.push({ id: x.id, date: x.date, distance: a.distance != null ? a.distance : x.distance, timeSec: a.time ? parseDuration(a.time) : null, hr: a.hr != null ? a.hr : null, power: a.power, cadence: a.cadence, note: a.note || x.type, source: 'schema' });
    }
  });
  state.enduranceLogs.filter(function (l) { return l.sport === sport; }).forEach(function (l) {
    if (sport === 'Brick') {
      out.push({ id: l.id, date: l.date, distance: l.totalDistance, timeSec: l.totalTime ? parseDuration(l.totalTime) : null, hr: null, note: l.note, source: 'logboek' });
    } else {
      out.push({ id: l.id, date: l.date, distance: l.distance, timeSec: l.time ? parseDuration(l.time) : null, hr: l.hr != null ? l.hr : null, power: l.power, cadence: l.cadence, note: l.note, source: 'logboek' });
    }
  });
  return out;
}

/* Geeft per sessie ook timeSec mee naast hr - nodig voor de trainingslast-
   berekening hieronder, die uren x hartslagzone rekent. Bestaand gebruik van
   deze functie (bv. de hartslagzone-verdeling op Duursport) kijkt alleen naar
   .hr en merkt dus niets van deze uitbreiding. */
export function hrSamplesForSport(state, sport) {
  var out = [];
  if (sport === 'Kracht') {
    /* Duur van een Kracht-sessie telt inclusief warming-up: de warming-up
       hoort bij dezelfde sessie en heeft geen eigen hartslagmeting, dus wordt
       hij bij de duur van de hoofd-training opgeteld i.p.v. apart gewogen. */
    state.strengthLogs.forEach(function (l) {
      if (l.hr == null) return;
      var totalMin = l.durationMin != null ? l.durationMin + (l.warmupMinutes || 0) : null;
      out.push({ date: l.date, hr: l.hr, timeSec: totalMin != null ? totalMin * 60 : null });
    });
    state.scheduleEntries.filter(function (x) { return x.sport === 'Kracht' && x.completed && x.actual && x.actual.hr != null; }).forEach(function (x) { out.push({ date: x.date, hr: x.actual.hr, timeSec: null }); });
    return out;
  }
  if (sport === 'Hyrox') {
    state.hyroxLogs.forEach(function (l) { if (l.hr != null) out.push({ date: l.date, hr: l.hr, timeSec: l.time ? parseDuration(l.time) : null }); });
    return out;
  }
  if (sport === 'Brick') {
    state.scheduleEntries.filter(function (x) { return x.sport === 'Brick' && x.completed && x.actual; }).forEach(function (x) {
      var a = x.actual; var hrs = []; if (a.bike && a.bike.hr != null) hrs.push(a.bike.hr); if (a.run && a.run.hr != null) hrs.push(a.run.hr);
      if (hrs.length) {
        var bikeSec = parseDuration(a.bike && a.bike.time) || 0, runSec = parseDuration(a.run && a.run.time) || 0, transSec = parseDuration(a.transition) || 0;
        out.push({ date: x.date, hr: hrs.reduce(function (s, h) { return s + h; }, 0) / hrs.length, timeSec: (bikeSec + runSec + transSec) || null });
      }
    });
    state.enduranceLogs.filter(function (l) { return l.sport === 'Brick'; }).forEach(function (l) {
      var hrs = []; if (l.bike && l.bike.hr != null) hrs.push(l.bike.hr); if (l.run && l.run.hr != null) hrs.push(l.run.hr);
      if (hrs.length) out.push({ date: l.date, hr: hrs.reduce(function (s, h) { return s + h; }, 0) / hrs.length, timeSec: l.totalTime ? parseDuration(l.totalTime) : null });
    });
    return out;
  }
  state.scheduleEntries.filter(function (x) { return x.sport === sport && x.completed && x.actual && x.actual.hr != null; }).forEach(function (x) { out.push({ date: x.date, hr: x.actual.hr, timeSec: x.actual.time ? parseDuration(x.actual.time) : null }); });
  state.enduranceLogs.filter(function (l) { return l.sport === sport && l.hr != null; }).forEach(function (l) { out.push({ date: l.date, hr: l.hr, timeSec: l.time ? parseDuration(l.time) : null }); });
  return out;
}
export function allHrSamples(state) {
  var out = [];
  HR_SPORTS.forEach(function (sp) { hrSamplesForSport(state, sp).forEach(function (s) { out.push(s); }); });
  return out;
}

/* Gewicht per hartslagzone (intensiteitspunten per uur) voor de
   trainingslast-grafiek (Gezondheid-tab): Z1 = 1 t/m Z5 = 5. Een sessie telt
   mee als uren x zone-gewicht, zodat lang+rustig en kort+heftig eerlijk
   vergelijkbaar zijn - 3 uur op Z1 (3 x 1 = 3) weegt zo ongeveer even zwaar
   als 45 minuten op Z4 (0,75 x 4 = 3). */
var LOAD_ZONE_WEIGHT = { Z1: 1, Z2: 2, Z3: 3, Z4: 4, Z5: 5 };

/* Trainingslast per week, per sport: telt voor elke sessie mét geregistreerde
   hartslag én duur het aantal uren x de intensiteitspunten van die
   hartslagzone op. Sessies zonder hartslag of zonder duur tellen niet mee
   (zonder allebei kan de belasting niet eerlijk berekend worden), en
   Herstel-dagen zitten niet in HR_SPORTS en horen hier dus ook niet bij. */
export function trainingLoadByWeek(state, weeksCount) {
  var weeks = weeksCount || 8;
  var mondayThisWeek = getMonday(todayISO());
  var byWeek = {};
  var order = [];
  for (var i = weeks - 1; i >= 0; i--) {
    var monday = addDays(mondayThisWeek, -7 * i);
    byWeek[monday] = {};
    order.push(monday);
  }
  HR_SPORTS.forEach(function (sport) {
    hrSamplesForSport(state, sport).forEach(function (s) {
      if (!s.timeSec) return;
      var monday = getMonday(s.date);
      if (byWeek[monday] == null) return;
      var zone = hrZone(s.hr);
      if (!zone) return;
      var w = (LOAD_ZONE_WEIGHT[zone.key] || 0) * (s.timeSec / 3600);
      byWeek[monday][sport] = (byWeek[monday][sport] || 0) + w;
    });
  });
  return order.map(function (monday) { return { label: '' + isoWeekNumber(monday), bySport: byWeek[monday] }; });
}

export function consecutiveTrainingDaysEndingToday(entries) {
  var count = 0; var d = todayISO();
  while (count <= 30) {
    var has = entries.some(function (x) { return x.date === d; });
    if (!has) break;
    count++;
    d = addDays(d, -1);
  }
  return count;
}

export function weekNumberLabel(scheduleEntries, monday) {
  var found = scheduleEntries.find(function (x) { return x.date >= monday && x.date <= addDays(monday, 6) && x.weekLabel; });
  if (found) {
    var m = found.weekLabel.match(/Week\s*(\d+)/i);
    if (m) return m[1];
  }
  return '' + isoWeekNumber(monday);
}

export function combinedRunEfforts(state, km) {
  var out = [];
  state.enduranceLogs.filter(function (l) { return l.sport === 'Hardlopen' && l.distance; }).forEach(function (l) {
    var nearest = nearestOf(l.distance);
    if (nearest !== km) return;
    var sec = l.time ? parseDuration(l.time) : (l.pace ? (parseDuration(l.pace) || 0) * l.distance : null);
    if (sec != null) out.push({ sec: sec, date: l.date, note: '', source: 'logboek' });
  });
  state.scheduleEntries.filter(function (x) { return x.sport === 'Hardlopen' && x.completed && x.actual; }).forEach(function (x) {
    var d = x.actual.distance != null ? x.actual.distance : x.distance;
    if (!d || nearestOf(d) !== km) return;
    var sec = x.actual.time ? parseDuration(x.actual.time) : ((x.actual.pace || x.pace) ? (parseDuration(x.actual.pace || x.pace) || 0) * d : null);
    if (sec != null) out.push({ sec: sec, date: x.date, note: x.type, source: 'schema' });
  });
  state.runRaceResults.filter(function (r) { return r.km === km; }).forEach(function (r) {
    var sec = parseDuration(r.time);
    if (sec != null) out.push({ id: r.id, sec: sec, date: r.date, time: r.time, note: r.note || '', source: 'pr-log' });
  });
  return out;
}
function nearestOf(d) {
  var best = null, bestDiff = Infinity;
  STANDARD_DISTANCES.forEach(function (sd) {
    var tol = sd.km >= 42 ? 2 : (sd.km >= 30 ? 1.5 : (sd.km >= 20 ? 1 : (sd.km >= 15 ? 0.7 : 0.6)));
    var diff = Math.abs(d - sd.km);
    if (diff <= tol && diff < bestDiff) { best = sd.km; bestDiff = diff; }
  });
  return best;
}
export function bestOf(efforts) { return efforts.reduce(function (min, x) { return (min == null || x.sec < min.sec) ? x : min; }, null); }

/* Zoekt, voor elke oefening die ooit gelogd is, naar kracht-PR's van de
   afgelopen 'days' dagen: een nieuw all-time hoogste gewicht, of hetzelfde
   gewicht met meer herhalingen dan ooit. Zelfde principe als de PR-detectie
   in components/strength.jsx, maar dan terugkijkend i.p.v. tijdens het
   loggen, zodat het ook in de automatische inzichten kan verschijnen. */
export function recentStrengthPRs(state, days) {
  var window = days || 30;
  var today = todayISO();
  var names = {};
  state.strengthLogs.forEach(function (l) { l.exercises.forEach(function (ex) { names[ex.name] = true; }); });
  var out = [];
  Object.keys(names).forEach(function (name) {
    var allSets = [];
    state.strengthLogs.forEach(function (l) {
      var ex = l.exercises.find(function (x) { return x.name === name; });
      if (!ex) return;
      ex.sets.forEach(function (s) { if (s.weight != null) allSets.push({ date: l.date, weight: s.weight, reps: s.reps }); });
    });
    if (!allSets.length) return;

    var maxWeight = allSets.reduce(function (m, s) { return Math.max(m, s.weight); }, 0);
    var weightPRDate = allSets.filter(function (s) { return s.weight === maxWeight; }).map(function (s) { return s.date; }).sort().pop();
    if (weightPRDate && daysBetween(weightPRDate, today) >= 0 && daysBetween(weightPRDate, today) <= window) {
      out.push({ name: name, type: 'weight', weight: maxWeight, date: weightPRDate });
    }

    var bestByWeight = {};
    allSets.forEach(function (s) {
      if (s.reps == null) return;
      var cur = bestByWeight[s.weight];
      if (!cur || s.reps > cur.reps || (s.reps === cur.reps && s.date > cur.date)) bestByWeight[s.weight] = { reps: s.reps, date: s.date };
    });
    Object.keys(bestByWeight).forEach(function (w) {
      var rec = bestByWeight[w];
      var isSameAsWeightPR = weightPRDate === rec.date && Number(w) === maxWeight;
      if (!isSameAsWeightPR && daysBetween(rec.date, today) >= 0 && daysBetween(rec.date, today) <= window) {
        out.push({ name: name, type: 'reps', weight: Number(w), reps: rec.reps, date: rec.date });
      }
    });
  });
  return out;
}

export function generateInsights(state) {
  var insights = [];
  var runs = [];
  state.scheduleEntries.filter(function (x) { return x.sport === 'Hardlopen' && x.completed && x.actual; }).forEach(function (x) {
    var a = x.actual; var d = a.distance != null ? a.distance : x.distance;
    var sec = a.time ? parseDuration(a.time) : (a.pace ? (parseDuration(a.pace) || 0) * d : null);
    if (d && sec) runs.push({ date: x.date, pace: sec / d });
  });
  state.enduranceLogs.filter(function (l) { return l.sport === 'Hardlopen' && l.distance; }).forEach(function (l) {
    var sec = l.time ? parseDuration(l.time) : (l.pace ? (parseDuration(l.pace) || 0) * l.distance : null);
    if (sec) runs.push({ date: l.date, pace: sec / l.distance });
  });
  runs.sort(function (a, b) { return a.date.localeCompare(b.date); });

  if (runs.length >= 6) {
    var byDate = {};
    state.scheduleEntries.forEach(function (x) { byDate[x.date] = (byDate[x.date] || 0) + 1; });
    var afterRest = [], notAfterRest = [];
    runs.forEach(function (r) {
      var wasRest = !byDate[addDays(r.date, -1)];
      (wasRest ? afterRest : notAfterRest).push(r.pace);
    });
    if (afterRest.length >= 3 && notAfterRest.length >= 3) {
      var a1 = avgOf(afterRest), a2 = avgOf(notAfterRest);
      if (Math.abs(a1 - a2) > 3) {
        insights.push(a1 < a2 ?
          'Je loopt gemiddeld sneller na een rustdag: ' + formatDuration(a1) + '/km tegenover ' + formatDuration(a2) + '/km op andere dagen.' :
          'Je loopt gemiddeld sneller op dagen zonder voorafgaande rustdag: ' + formatDuration(a2) + '/km tegenover ' + formatDuration(a1) + '/km na een rustdag.');
      }
    }
  }
  if (runs.length >= 6) {
    var today = todayISO();
    var recent = runs.filter(function (r) { return daysBetween(r.date, today) <= 30; });
    var older = runs.filter(function (r) { var db = daysBetween(r.date, today); return db > 60 && db <= 150; });
    if (recent.length >= 2 && older.length >= 2) {
      var pr = avgOf(recent.map(function (r) { return r.pace; }));
      var po = avgOf(older.map(function (r) { return r.pace; }));
      if (Math.abs(po - pr) > 3) {
        insights.push(po > pr ?
          'Je huidige gemiddelde tempo (' + formatDuration(pr) + '/km) is sneller dan zo’n 3 maanden geleden (' + formatDuration(po) + '/km).' :
          'Je tempo van 3 maanden geleden (' + formatDuration(po) + '/km) was sneller dan je huidige gemiddelde (' + formatDuration(pr) + '/km).');
      }
    }
  }
  STANDARD_DISTANCES.forEach(function (sd) {
    var best = bestOf(combinedRunEfforts(state, sd.km));
    if (best) { var db = daysBetween(best.date, todayISO()); if (db >= 0 && db <= 30) insights.push('Nieuwe PR op ' + sd.label + ': ' + formatDuration(best.sec, true) + ' op ' + formatDateWithYear(best.date) + '.'); }
  });
  recentStrengthPRs(state, 30).forEach(function (pr) {
    if (pr.type === 'weight') insights.push('Nieuwe kracht-PR bij ' + pr.name + ': ' + pr.weight + ' kg op ' + formatDateWithYear(pr.date) + '.');
    else insights.push('Nieuwe kracht-PR bij ' + pr.name + ': ' + pr.reps + ' herhalingen op ' + pr.weight + ' kg (' + formatDateWithYear(pr.date) + ').');
  });
  var monday = getMonday(todayISO());
  var weekMoods = state.moodLogs.filter(function (m) { return m.date >= monday && m.date <= todayISO(); });
  if (weekMoods.length >= 3) {
    var counts = { green: 0, orange: 0, red: 0 };
    weekMoods.forEach(function (m) { counts[m.mood] = (counts[m.mood] || 0) + 1; });
    if (counts.red >= 2 && counts.red >= counts.green) insights.push('Je voelde je deze week vaker minder goed (' + counts.red + 'x rood) — misschien tijd voor wat extra rust.');
    else if (counts.green >= weekMoods.length - 1) insights.push('Je voelde je deze week bijna elke dag goed (' + counts.green + 'x groen). 👍');
  }
  return insights.slice(0, 4);
}

export function buildSearchIndex(state) {
  var results = [];
  state.scheduleEntries.forEach(function (x) {
    var text = [x.type, x.plannedText, x.sport, x.weekLabel].filter(Boolean).join(' ');
    results.push({ kind: 'schedule', date: x.date, sport: x.sport, title: x.type, detail: x.plannedText, searchText: text.toLowerCase(), entry: x });
  });
  state.strengthLogs.forEach(function (l) {
    l.exercises.forEach(function (ex) {
      var text = ex.name + ' ' + (ex.note || '') + ' ' + l.template;
      results.push({ kind: 'strength', date: l.date, sport: 'Kracht', title: ex.name, detail: l.template + ' · ' + ex.sets.map(function (s) { return s.reps + 'x' + s.weight + 'kg'; }).join(', '), searchText: text.toLowerCase() });
    });
  });
  state.hyroxLogs.forEach(function (l) {
    var w = state.hyroxLibrary.find(function (x) { return x.id === l.workoutId; });
    if (!w) return;
    var text = w.name + ' ' + (l.note || '');
    results.push({ kind: 'hyrox', date: l.date, sport: 'Hyrox', title: w.name, detail: l.time, searchText: text.toLowerCase() });
  });
  state.hyroxLibrary.forEach(function (w) {
    var blockText = (w.blocks || []).map(function (b) { return b.title + ' ' + b.movements.join(' '); }).join(' ');
    results.push({ kind: 'hyroxLib', date: null, sport: 'Hyrox', title: w.name, detail: blockText.slice(0, 80), searchText: (w.name + ' ' + blockText).toLowerCase() });
  });
  state.enduranceLogs.forEach(function (l) {
    var text = (l.note || '') + ' ' + (l.activityName || '') + ' ' + l.sport;
    results.push({ kind: 'endurance', date: l.date, sport: l.sport, title: l.activityName || l.sport, detail: l.note, searchText: text.toLowerCase() });
  });
  state.races.forEach(function (r) {
    results.push({ kind: 'race', date: r.date, sport: 'Race', title: r.name, detail: r.type, searchText: (r.name + ' ' + (r.type || '')).toLowerCase() });
  });
  return results;
}
export function kindToTab(kind) { return { strength: 'kracht', hyrox: 'hyrox', hyroxLib: 'hyrox', endurance: 'duursport', race: 'home' }[kind] || 'home'; }

/* Generieke versie van allSportEntriesForYear: verzamelt alle sportsessies
   binnen een willekeurige datumrange (i.p.v. alleen een heel jaar). Dit maakt
   'm ook bruikbaar voor de maand- en weekvergelijking in het Jaaroverzicht. */
export function allSportEntriesInRange(state, fromIso, toIso) {
  var out = [];
  state.scheduleEntries.filter(function (x) { return x.completed && x.actual && x.date >= fromIso && x.date <= toIso; }).forEach(function (x) {
    var a = x.actual;
    if (x.sport === 'Brick') {
      var bikeSec = parseDuration(a.bike && a.bike.time) || 0, runSec = parseDuration(a.run && a.run.time) || 0, transSec = parseDuration(a.transition) || 0;
      out.push({ sport: 'Brick', date: x.date, distance: (a.bike && a.bike.distance || 0) + (a.run && a.run.distance || 0), timeSec: (bikeSec + runSec + transSec) || null });
    } else if (x.sport === 'Kracht') {
      out.push({ sport: 'Kracht', date: x.date, distance: null, timeSec: null });
    } else {
      out.push({ sport: x.sport, date: x.date, distance: a.distance != null ? a.distance : x.distance, timeSec: a.time ? parseDuration(a.time) : null });
    }
  });
  state.enduranceLogs.filter(function (l) { return l.date >= fromIso && l.date <= toIso; }).forEach(function (l) {
    if (l.sport === 'Brick') { out.push({ sport: 'Brick', date: l.date, distance: l.totalDistance, timeSec: l.totalTime ? parseDuration(l.totalTime) : null }); }
    else out.push({ sport: l.sport, date: l.date, distance: l.distance, timeSec: l.time ? parseDuration(l.time) : null });
  });
  state.strengthLogs.filter(function (l) { return l.date >= fromIso && l.date <= toIso; }).forEach(function (l) { out.push({ sport: 'Kracht', date: l.date, distance: null, timeSec: null }); });
  state.hyroxLogs.filter(function (l) { return l.date >= fromIso && l.date <= toIso; }).forEach(function (l) { out.push({ sport: 'Hyrox', date: l.date, distance: null, timeSec: parseDuration(l.time) }); });
  return out;
}
export function allSportEntriesForYear(state, year) {
  return allSportEntriesInRange(state, year + '-01-01', year + '-12-31');
}

/* Vat een lijst sportsessies (zoals allSportEntriesInRange teruggeeft) samen
   tot de kerncijfers die zowel het jaaroverzicht als de periodevergelijking
   (maand/week) nodig hebben. */
export function summarizeSportEntries(entries) {
  var totalsBySport = {};
  entries.forEach(function (en) { totalsBySport[en.sport] = (totalsBySport[en.sport] || 0) + 1; });
  var kmSwim = entries.filter(function (en) { return en.sport === 'Zwemmen'; }).reduce(function (s, en) { return s + ((en.distance || 0) / 1000); }, 0);
  var kmRun = entries.filter(function (en) { return en.sport === 'Hardlopen'; }).reduce(function (s, en) { return s + (en.distance || 0); }, 0);
  var kmBike = entries.filter(function (en) { return en.sport === 'Wielrennen / Kickr'; }).reduce(function (s, en) { return s + (en.distance || 0); }, 0);
  var hasDuration = entries.filter(function (en) { return en.timeSec; });
  var totalHours = hasDuration.reduce(function (s, en) { return s + (en.timeSec / 3600); }, 0);
  return { totalsBySport: totalsBySport, totalTrainings: entries.length, kmSwim: kmSwim, kmRun: kmRun, kmBike: kmBike, totalHours: totalHours };
}
