/* ---------------- Zoeken / Instellingen / Jaaroverzicht ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html. */
import React, { useState, useRef } from 'react';
import { Card, Button, TextInput, Modal, Badge, SegTabs } from '../components/ui.jsx';
import { buildSearchIndex, allSportEntriesForYear, allSportEntriesInRange, summarizeSportEntries, combinedRunEfforts, bestOf } from '../lib/domain.js';
import { STANDARD_DISTANCES, SPORT_ICON } from '../lib/constants.js';
import { yearOf, todayISO, formatDateShort, formatDateWithYear, parseDuration, getMonday, addDays, monthKeyOf, monthLabel, addMonthsToMonthKey, monthRange, isoWeekNumber } from '../lib/helpers.js';
var e = React.createElement;

export function SearchModal(props) {
  var st = useState(''); var q = st[0], setQ = st[1];
  var index = buildSearchIndex(props.state);
  var terms = q.trim().toLowerCase();
  var results = terms.length >= 2 ? index.filter(function (r) { return r.searchText.indexOf(terms) !== -1; }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 40) : [];
  return e(Modal, { title: 'Zoeken', onClose: props.onClose },
    e(TextInput, { placeholder: 'Zoek op oefening, training, workout…', value: q, onChange: function (ev) { setQ(ev.target.value); }, autoFocus: true }),
    e('div', { className: 'flex flex-col gap-2 mt-3' },
      terms.length < 2 ? e('p', { className: 'text-sm', style: { color: 'var(--text-tertiary)' } }, 'Typ minstens 2 tekens om te zoeken.') :
        !results.length ? e('p', { className: 'text-sm', style: { color: 'var(--text-tertiary)' } }, 'Niets gevonden.') :
          results.map(function (r, i) {
            return e(Card, { key: i, className: 'p-3 flex items-center gap-3 cursor-pointer', onClick: function () { if (r.kind === 'schedule') { props.onOpenEntry(r.entry); } else { props.onGoTo(r.kind); } } },
              e('span', { className: 'text-lg' }, SPORT_ICON[r.sport] || '🔎'),
              e('div', { className: 'flex-1 min-w-0' },
                e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, r.date ? formatDateWithYear(r.date) : 'bibliotheek'),
                e('div', { className: 'text-sm font-medium' }, r.title),
                r.detail ? e('div', { className: 'text-xs truncate', style: { color: 'var(--text-secondary)' } }, r.detail) : null
              )
            );
          })
    )
  );
}

export function SettingsModal(props) {
  var st = useState(null); var msg = st[0], setMsg = st[1];
  var fileRef = useRef(null);
  function doExport() {
    props.exportData().then(function (ok) { setMsg(ok ? 'Backup gedownload.' : null); }).catch(function () { setMsg('Downloaden is niet gelukt of geweigerd.'); });
  }
  function doImport(ev) {
    var file = ev.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        setMsg('Bezig met importeren…');
        props.importData(data).then(function () { setMsg('Data geïmporteerd.'); }).catch(function () { setMsg('Importeren is niet gelukt.'); });
      } catch (err) { setMsg('Bestand kon niet worden gelezen.'); }
    };
    reader.readAsText(file);
  }
  return e(Modal, { title: 'Data beheer', onClose: props.onClose },
    e('p', { className: 'text-sm mb-4', style: { color: 'var(--text-secondary)' } }, 'Al je data staat veilig in Supabase, gekoppeld aan jouw account. Maak toch af en toe een backup als extra vangnet.'),
    e('div', { className: 'flex flex-col gap-2' },
      e(Button, { onClick: doExport, className: 'w-full' }, 'Backup downloaden (JSON)'),
      e(Button, { variant: 'ghost', onClick: function () { fileRef.current && fileRef.current.click(); }, className: 'w-full' }, 'Backup importeren (overschrijft huidige data)'),
      e('input', { ref: fileRef, type: 'file', accept: 'application/json', style: { display: 'none' }, onChange: doImport }),
      props.hasNoData ? e(Button, { variant: 'ghost', onClick: function () { props.loadDemoData(); setMsg('Voorbeelddata geladen.'); }, className: 'w-full' }, 'Voorbeelddata laden (demo)') : null,
      e(Button, { variant: 'ghost', onClick: function () { props.signOut(); }, className: 'w-full' }, 'Uitloggen')
    ),
    msg ? e('p', { className: 'text-xs mt-3', style: { color: 'var(--slate)' } }, msg) : null
  );
}

function RecapStat(props) {
  return e('div', { className: 'text-center' },
    e('div', { className: 'font-display text-lg font-semibold', style: { color: 'var(--sage-strong)' } }, props.value),
    e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, props.label)
  );
}

/* Zelfde als RecapStat, maar met een klein deltaatje eronder t.o.v. de vorige
   periode (gebruikt door de maand-/weekvergelijking hieronder). */
function PeriodCompareStat(props) {
  var delta = props.delta;
  var deltaText = delta == null ? null : (delta > 0 ? '+' : '') + delta.toFixed(1);
  return e('div', { className: 'text-center' },
    e('div', { className: 'font-display text-lg font-semibold', style: { color: 'var(--sage-strong)' } }, props.value),
    e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, props.label),
    deltaText != null ? e('div', { className: 'text-[10px] mt-0.5', style: { color: delta > 0 ? 'var(--sage-strong)' : 'var(--text-tertiary)' } }, (delta > 0 ? '▲ ' : delta < 0 ? '▼ ' : '') + deltaText) : null
  );
}

/* Periodevergelijking: huidige maand/week t.o.v. de direct voorgaande maand/
   week, met pijltjes om terug (en, tot vandaag, weer vooruit) te bladeren. */
function PeriodCompareView(props) {
  var state = props.state, mode = props.mode;
  var curFrom, curTo, prevFrom, prevTo, label, isCurrentPeriod;
  if (mode === 'maand') {
    var range = monthRange(props.periodKey);
    curFrom = range.start; curTo = range.end;
    var prevRange = monthRange(addMonthsToMonthKey(props.periodKey, -1));
    prevFrom = prevRange.start; prevTo = prevRange.end;
    label = monthLabel(props.periodKey);
    isCurrentPeriod = props.periodKey === monthKeyOf(todayISO());
  } else {
    curFrom = props.periodKey; curTo = addDays(props.periodKey, 6);
    prevFrom = addDays(props.periodKey, -7); prevTo = addDays(props.periodKey, -1);
    label = 'Week ' + isoWeekNumber(props.periodKey) + ' (' + formatDateShort(curFrom) + ' – ' + formatDateShort(curTo) + ')';
    isCurrentPeriod = props.periodKey === getMonday(todayISO());
  }
  var cur = summarizeSportEntries(allSportEntriesInRange(state, curFrom, curTo));
  var prev = summarizeSportEntries(allSportEntriesInRange(state, prevFrom, prevTo));
  var spKeys = {};
  Object.keys(cur.totalsBySport).forEach(function (k) { spKeys[k] = true; });
  Object.keys(prev.totalsBySport).forEach(function (k) { spKeys[k] = true; });
  var sportList = Object.keys(spKeys).sort(function (a, b) { return (cur.totalsBySport[b] || 0) - (cur.totalsBySport[a] || 0); });

  return e('div', { className: 'flex flex-col gap-4' },
    e('div', { className: 'flex items-center justify-between' },
      e('button', { onClick: function () { props.onNavigate(-1); }, className: 'w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0', style: { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, '‹'),
      e('span', { className: 'text-sm font-semibold text-center' }, label),
      e('button', { onClick: function () { if (!isCurrentPeriod) props.onNavigate(1); }, disabled: isCurrentPeriod, className: 'w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0', style: { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', opacity: isCurrentPeriod ? 0.4 : 1 } }, '›')
    ),
    e('p', { className: 'text-xs text-center -mt-2', style: { color: 'var(--text-tertiary)' } }, 'Vergeleken met de voorgaande periode'),
    e(Card, { className: 'p-4' },
      e('div', { className: 'text-sm font-semibold mb-3' }, 'Totaal km'),
      e('div', { className: 'grid grid-cols-3 gap-2' },
        e(PeriodCompareStat, { value: cur.kmSwim.toFixed(1), label: 'zwemmen', delta: cur.kmSwim - prev.kmSwim }),
        e(PeriodCompareStat, { value: cur.kmRun.toFixed(1), label: 'hardlopen', delta: cur.kmRun - prev.kmRun }),
        e(PeriodCompareStat, { value: cur.kmBike.toFixed(1), label: 'fietsen', delta: cur.kmBike - prev.kmBike })
      )
    ),
    e(Card, { className: 'p-4' },
      e('div', { className: 'grid grid-cols-2 gap-2' },
        e(PeriodCompareStat, { value: cur.totalTrainings, label: 'trainingen', delta: cur.totalTrainings - prev.totalTrainings }),
        e(PeriodCompareStat, { value: cur.totalHours.toFixed(1), label: 'sporturen', delta: cur.totalHours - prev.totalHours })
      )
    ),
    e(Card, { className: 'p-4' },
      e('div', { className: 'text-sm font-semibold mb-3' }, 'Trainingen per sport'),
      sportList.length ? e('div', { className: 'flex flex-col gap-1.5' }, sportList.map(function (sp) {
        var c = cur.totalsBySport[sp] || 0, p = prev.totalsBySport[sp] || 0, d = c - p;
        return e('div', { key: sp, className: 'flex items-center justify-between text-sm' },
          e('span', { style: { color: 'var(--text-secondary)' } }, (SPORT_ICON[sp] || '•') + ' ' + sp),
          e('div', { className: 'flex items-center gap-2' },
            e('span', { className: 'font-medium' }, c),
            d !== 0 ? e(Badge, { tone: d > 0 ? 'sage' : 'slate' }, (d > 0 ? '+' : '') + d) : null
          )
        );
      })) : e('p', { className: 'text-sm', style: { color: 'var(--text-tertiary)' } }, 'Nog geen data in deze periodes.')
    )
  );
}

export function AnnualRecapModal(props) {
  var state = props.state;
  var allYears = {};
  state.scheduleEntries.forEach(function (x) { if (x.completed) allYears[yearOf(x.date)] = true; });
  state.enduranceLogs.forEach(function (l) { allYears[yearOf(l.date)] = true; });
  state.strengthLogs.forEach(function (l) { allYears[yearOf(l.date)] = true; });
  state.hyroxLogs.forEach(function (l) { allYears[yearOf(l.date)] = true; });
  state.races.forEach(function (r) { allYears[yearOf(r.date)] = true; });
  var years = Object.keys(allYears).sort().reverse();
  if (!years.length) years = [yearOf(todayISO())];
  var st = useState(years.indexOf(yearOf(todayISO())) >= 0 ? yearOf(todayISO()) : years[0]); var year = st[0], setYear = st[1];
  var stMode = useState('jaar'); var mode = stMode[0], setMode = stMode[1];
  var stMonth = useState(monthKeyOf(todayISO())); var monthKey = stMonth[0], setMonthKey = stMonth[1];
  var stWeek = useState(getMonday(todayISO())); var weekMonday = stWeek[0], setWeekMonday = stWeek[1];

  var entries = allSportEntriesForYear(state, year);
  var yearSummary = summarizeSportEntries(entries);
  var totalsBySport = yearSummary.totalsBySport;
  var totalTrainings = yearSummary.totalTrainings;
  var kmSwim = yearSummary.kmSwim, kmRun = yearSummary.kmRun, kmBike = yearSummary.kmBike, totalHours = yearSummary.totalHours;
  var longestRun = entries.filter(function (en) { return en.sport === 'Hardlopen' && en.distance; }).sort(function (a, b) { return b.distance - a.distance; })[0];
  var longestRide = entries.filter(function (en) { return en.sport === 'Wielrennen / Kickr' && en.distance; }).sort(function (a, b) { return b.distance - a.distance; })[0];

  var prCount = 0;
  STANDARD_DISTANCES.forEach(function (sd) { var best = bestOf(combinedRunEfforts(state, sd.km)); if (best && yearOf(best.date) === year) prCount++; });
  ['solo', 'doubles', 'relay'].forEach(function (cat) {
    var items = state.hyroxRaceResults.filter(function (r) { return r.category === cat; }).map(function (r) { return { sec: parseDuration(r.time), date: r.date }; }).filter(function (x) { return x.sec != null; });
    var best = bestOf(items); if (best && yearOf(best.date) === year) prCount++;
  });
  var racesCompleted = state.races.filter(function (r) { return yearOf(r.date) === year && r.result && (r.result.time || r.result.note); }).length;

  return e(Modal, { title: 'Jaaroverzicht', onClose: props.onClose },
    e(SegTabs, {
      options: [{ value: 'jaar', label: 'Jaar' }, { value: 'maand', label: 'Maand' }, { value: 'week', label: 'Week' }],
      value: mode, onChange: setMode
    }),
    mode !== 'jaar' ? e('div', { className: 'mt-4' }, e(PeriodCompareView, {
      state: state, mode: mode, periodKey: mode === 'maand' ? monthKey : weekMonday,
      onNavigate: function (dir) {
        if (mode === 'maand') setMonthKey(function (mk) { return addMonthsToMonthKey(mk, dir); });
        else setWeekMonday(function (wm) { return addDays(wm, dir * 7); });
      }
    })) : null,
    mode === 'jaar' ? e('div', { className: 'flex gap-2 overflow-x-auto scrollbar-none my-4' }, years.map(function (y) {
      var active = y === year;
      return e('button', { key: y, onClick: function () { setYear(y); }, className: 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
        style: active ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, y);
    })) : null,
    mode === 'jaar' ? e('div', { className: 'flex flex-col gap-4' },
      e(Card, { className: 'p-4' },
        e('div', { className: 'text-sm font-semibold mb-3' }, 'Totaal km'),
        e('div', { className: 'grid grid-cols-3 gap-2' },
          e(RecapStat, { value: kmSwim.toFixed(1), label: 'zwemmen' }),
          e(RecapStat, { value: kmRun.toFixed(1), label: 'hardlopen' }),
          e(RecapStat, { value: kmBike.toFixed(1), label: 'fietsen' })
        )
      ),
      e(Card, { className: 'p-4' },
        e('div', { className: 'text-sm font-semibold mb-3' }, 'Trainingen (' + totalTrainings + ' totaal)'),
        e('div', { className: 'flex flex-col gap-1.5' }, Object.keys(totalsBySport).sort(function (a, b) { return totalsBySport[b] - totalsBySport[a]; }).map(function (sp) {
          return e('div', { key: sp, className: 'flex items-center justify-between text-sm' },
            e('span', { style: { color: 'var(--text-secondary)' } }, (SPORT_ICON[sp] || '•') + ' ' + sp),
            e('span', { className: 'font-medium' }, totalsBySport[sp])
          );
        }))
      ),
      e(Card, { className: 'p-4' },
        e('div', { className: 'grid grid-cols-3 gap-2' },
          e(RecapStat, { value: prCount, label: 'PR’s behaald' }),
          e(RecapStat, { value: racesCompleted, label: 'wedstrijden volbracht' }),
          e(RecapStat, { value: totalHours.toFixed(1), label: 'sporturen' })
        ),
        e('p', { className: 'text-xs mt-2', style: { color: 'var(--text-tertiary)' } }, 'Sporturen zijn berekend uit sessies met een gelogde tijd — krachttraining telt hier niet in mee, omdat daar geen sessieduur voor wordt bijgehouden.')
      ),
      e(Card, { className: 'p-4' },
        e('div', { className: 'text-sm font-semibold mb-3' }, 'Highlights'),
        e('div', { className: 'flex flex-col gap-2' },
          longestRun ? e('div', { className: 'flex items-center justify-between text-sm' }, e('span', { style: { color: 'var(--text-secondary)' } }, '🏃 Langste hardlooprit'), e('span', { className: 'font-medium' }, longestRun.distance + ' km · ' + formatDateShort(longestRun.date))) : null,
          longestRide ? e('div', { className: 'flex items-center justify-between text-sm' }, e('span', { style: { color: 'var(--text-secondary)' } }, '🚴 Langste fietsrit'), e('span', { className: 'font-medium' }, longestRide.distance + ' km · ' + formatDateShort(longestRide.date))) : null,
          (!longestRun && !longestRide) ? e('p', { className: 'text-sm', style: { color: 'var(--text-tertiary)' } }, 'Nog geen data dit jaar.') : null
        )
      )
    ) : null
  );
}
