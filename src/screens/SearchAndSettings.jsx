/* ---------------- Zoeken / Instellingen / Jaaroverzicht ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html. */
import React, { useState, useRef } from 'react';
import { Card, Button, TextInput, Modal } from '../components/ui.jsx';
import { buildSearchIndex, allSportEntriesForYear, combinedRunEfforts, bestOf } from '../lib/domain.js';
import { STANDARD_DISTANCES, SPORT_ICON } from '../lib/constants.js';
import { yearOf, todayISO, formatDateShort, formatDateWithYear, parseDuration } from '../lib/helpers.js';
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

  var entries = allSportEntriesForYear(state, year);
  var totalsBySport = {};
  entries.forEach(function (en) { totalsBySport[en.sport] = (totalsBySport[en.sport] || 0) + 1; });
  var totalTrainings = entries.length;
  var kmSwim = entries.filter(function (en) { return en.sport === 'Zwemmen'; }).reduce(function (s, en) { return s + ((en.distance || 0) / 1000); }, 0);
  var kmRun = entries.filter(function (en) { return en.sport === 'Hardlopen'; }).reduce(function (s, en) { return s + (en.distance || 0); }, 0);
  var kmBike = entries.filter(function (en) { return en.sport === 'Wielrennen / Kickr'; }).reduce(function (s, en) { return s + (en.distance || 0); }, 0);
  var hasDuration = entries.filter(function (en) { return en.timeSec; });
  var totalHours = hasDuration.reduce(function (s, en) { return s + (en.timeSec / 3600); }, 0);
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
    e('div', { className: 'flex gap-2 overflow-x-auto scrollbar-none mb-4' }, years.map(function (y) {
      var active = y === year;
      return e('button', { key: y, onClick: function () { setYear(y); }, className: 'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
        style: active ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, y);
    })),
    e('div', { className: 'flex flex-col gap-4' },
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
    )
  );
}
