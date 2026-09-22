/* ---------------- standaard/demo-data ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html.
   Wordt alleen nog gebruikt om een gloednieuw (leeg) account eenmalig te
   vullen met voorbeelddata, en door "eerdere PR's invullen" in de PR-tab. */
import { uid, todayISO } from './helpers.js';

export function mkMeal(time, name, product, carbs, kcal) { return { id: uid(), time: time, name: name, product: product, carbs: carbs, kcal: kcal }; }
export function mkMealDay(title, meals) { return { id: uid(), title: title, meals: meals }; }

var VATHORST_MEALPLAN = { days: [
  mkMealDay('Zaterdag 26 september', [
    mkMeal('8:00', 'Ontbijt', '50g havermout, 200ml magere melk, 15g whey, 1 appel, 10g honing', 76.5, 445),
    mkMeal('10:00', 'Tussendoor', '75g bananenbrood + bietenshotje + 1 pannenkoek met poedersuiker', 68.5, 395),
    mkMeal('12:00', 'Lunch', '100g witte rijst, 100g mager gehakt, 100ml tomatenpassata, 1 wit bolletje met beetje hagelslag', 98, 635),
    mkMeal('14:00', 'Middag-bowl', 'witte sesam bagel, 14g aioli minder vet, 30g tum tum', 68, 370),
    mkMeal('15:30', 'Hydratatie', 'elektrolyten-drink (500ml)', 0, 5),
    mkMeal('17:30', 'Diner', '150g witte rijst + 100g passata + 75g mager rundergehakt + 30g bananenbrood', 136, 805)
  ]),
  mkMealDay('Zondag 27 september (racedag)', [
    mkMeal('8:00', 'Ontbijt', '2 witte bolletjes met vruchtenhagel + bietenshot', 65, 410),
    mkMeal('10:30', 'Pre-race ontbijt', 'havermoutbowl + electrolyte drankje', 65, 375),
    mkMeal('12:00', 'Laatste', '1 banaan', 27, 105),
    mkMeal('12:30', 'START', '16k Vathorst run, 1 gelletje', 30, 130)
  ])
] };
var VATHORST_SCENARIOS = [
  { label: 'Realistisch scenario: 4:45', rows: [
    ['1 km', '4:55', '155-160', '0:04:55', ''],
    ['2-5 km', '4:48', '160-165', '0:24:07', ''],
    ['5-10 km', '4:45', '165-170', '0:47:52', '6k: gel 1'],
    ['10-14 km', '4:42', '170-175', '1:06:40', '10k optie versnellen, 11k: gel 2'],
    ['14-16 km', '4:35 (alles)', '175-182+', '1:16:00', '']
  ] },
  { label: 'Midden scenario: 4:40', rows: [
    ['1 km', '4:50', '158-163', '0:04:50', ''],
    ['2-5 km', '4:43', '162-167', '0:23:42', ''],
    ['5-10 km', '4:40', '167-172', '0:47:02', '6k: gel 1'],
    ['10-14 km', '4:37', '172-177', '1:05:30', '10k optie versnellen, 11k: gel 2'],
    ['14-16 km', '4:30 (alles)', '178-185+', '1:14:40', '']
  ] }
];

export function defaultRaces() {
  return [
    { id: uid(), name: '16k Vathorst', date: '2026-09-27', type: '16k hardlopen', targetPace: '4:40/km (midden scenario)',
      pacingScenarios: VATHORST_SCENARIOS, pacingNotes: '', mealPlan: VATHORST_MEALPLAN, carbNotes: '', result: null },
    { id: uid(), name: 'Halve Marathon Malaga', date: '2026-11-08', type: 'Halve marathon', targetPace: '',
      pacingScenarios: null, pacingNotes: '', mealPlan: { days: [] }, carbNotes: '', result: null },
    { id: uid(), name: 'Hyrox Relay', date: '2027-01-29', type: 'Hyrox (relay)', targetPace: '',
      pacingScenarios: null, pacingNotes: '', mealPlan: { days: [] }, carbNotes: '', result: null }
  ];
}

function seedSport(type) {
  if (type === 'Brick') return 'Brick';
  if (type === 'Triatlon') return 'Triatlon';
  return 'Hardlopen';
}
export function mkEntry(date, weekLabel, type, plannedText, distance, pace, hr) {
  return { id: uid(), date: date, weekLabel: weekLabel, sport: seedSport(type), type: type, plannedText: plannedText,
    distance: distance, pace: pace, hr: hr, completed: true,
    actual: { distance: distance, pace: pace, hr: hr, note: '' } };
}
export function mkPlanned(date, weekLabel, sport, type, plannedText, distance, pace) {
  return { id: uid(), date: date, weekLabel: weekLabel, sport: sport, type: type, plannedText: plannedText,
    distance: distance, pace: pace, hr: null, completed: false, actual: null };
}
export function defaultScheduleEntries() {
  return [
    mkEntry('2026-08-18', 'Week 12', 'Tempo run', '2k @5:44, 11k @4:35, 1k @5:23', 14, '4:48', 161),
    mkEntry('2026-08-22', 'Week 12', 'TAPER', '21k @5:55, 4k @4:48', 25, '5:44', 144),
    mkEntry('2026-08-23', 'Week 12', 'Brick', '5,5k @5:00', 5.5, '5:00', 148),
    mkEntry('2026-08-26', 'Week 13 (Deload)', 'Interval', '8k @5:48', 8, '5:48', 143),
    mkEntry('2026-08-29', 'Week 13 (Deload)', 'Triatlon', 'Kwart triatlon', 9.46, '4:46', 169),
    mkEntry('2026-09-01', 'Week 14 (Bali)', 'Herstel', 'Indoor 7k', 7.33, '5:29', 145),
    mkEntry('2026-09-03', 'Week 14 (Bali)', 'Interval', '10k @5:50', 10.4, '5:50', 145),
    mkEntry('2026-09-05', 'Week 14 (Bali)', 'Herstel', '12k @5:47', 12.31, '5:47', 146),
    mkEntry('2026-09-07', 'Week 15 (Bali)', 'Herstel', '12k', 10.25, '5:55', 146),
    mkEntry('2026-09-09', 'Week 15 (Bali)', 'Interval', '6,5k', 6.5, '5:23', 144),
    mkEntry('2026-09-11', 'Week 15 (Bali)', 'Herstel', '13k, 2k @4:40, 1k @4:39', 13, '5:27', 157),
    mkEntry('2026-09-16', 'Week 16', 'Herstel', '2k @5:52, 8k @4:36', 10, '4:52', 162)
  ].concat([
    mkPlanned('2026-09-17', 'Week 16', 'Kracht', 'Leg day', 'Leg day', null, null),
    mkPlanned('2026-09-17', 'Week 16', 'Hardlopen', 'Herstel', 'Indoor 5k @5:50', 5, '5:50'),
    mkPlanned('2026-09-19', 'Week 16', 'Kracht', 'Upper', 'Upper', null, null),
    mkPlanned('2026-09-19', 'Week 16', 'Wielrennen / Kickr', 'Duurrit', '2 uur wielrennen', null, null),
    mkPlanned('2026-09-20', 'Week 16', 'Hardlopen', 'Interval', '2k WU + 2x: 3k @4:40, 2k @6:00', 10, '4:40'),
    mkPlanned('2026-09-21', 'Week 17', 'Kracht', 'Leg day', 'Leg day (minder sets en minder zwaar)', null, null),
    mkPlanned('2026-09-22', 'Week 17', 'Hardlopen', 'Interval', '2k WU, 4x 1k @4:36 (3 min dribbelen), 1k CD', 7, '4:36'),
    mkPlanned('2026-09-23', 'Week 17', 'Wielrennen / Kickr', 'Duurrit', '2 uur wielrennen', null, null),
    mkPlanned('2026-09-24', 'Week 17', 'Kracht', 'Upper', 'Upper', null, null),
    mkPlanned('2026-09-24', 'Week 17', 'Hardlopen', 'Herstel', 'Indoor 5k @5:50', 5, '5:50'),
    mkPlanned('2026-09-25', 'Week 17', 'Zwemmen', 'Herstel', '45 min herstel zwemmen', null, null),
    mkPlanned('2026-09-26', 'Week 17', 'Hardlopen', 'Herstel', '4km @6:15 + 4 versnellingen 100m @4:36', 4, '6:15'),
    mkPlanned('2026-09-27', 'Week 17', 'Hardlopen', 'Wedstrijd', '16k Vathorst wedstrijd', 16, null),
    mkPlanned('2026-09-29', 'Week 18', 'Wielrennen / Kickr', 'Herstel', '1 uur herstel fietsen', null, null),
    mkPlanned('2026-09-30', 'Week 18', 'Hardlopen', 'Herstel', '6k @HR 140', 6, null),
    mkPlanned('2026-10-01', 'Week 18', 'Kracht', 'Leg day', 'Leg day', null, null),
    mkPlanned('2026-10-02', 'Week 18', 'Hardlopen', 'Tempo run', '2k WU, 6k @4:45, 1k CD (indien weinig spierpijn, anders herstel)', 9, '4:45'),
    mkPlanned('2026-10-03', 'Week 18', 'Kracht', 'Upper', 'Upper', null, null),
    mkPlanned('2026-10-04', 'Week 18', 'Hardlopen', 'Long run', '14k @HR 140, 2k @4:45', 16, null)
  ]);
}

export function mkBlock(title, duration, movements) { return { title: title, duration: duration, movements: movements }; }
export function defaultHyroxLibrary() {
  return [
    { id: uid(), name: '1km Run + 100 Wall Balls', blocks: [mkBlock('Werkblok', '', ['1km run', '100 wall balls op wedstrijdgewicht'])] },
    { id: uid(), name: 'Sled Push & SkiErg EMOM', blocks: [mkBlock('EMOM', '12 min', ['20m sled push', '200m SkiErg'])] },
    { id: uid(), name: '1km Run + 50m Sled Push + 50m Sled Pull', blocks: [mkBlock('Werkblok', '', ['1km run', '50m sled push', '50m sled pull'])] },
    { id: uid(), name: 'SkiErg 1000m + 80m Burpee Broad Jumps', blocks: [mkBlock('Werkblok', '', ['1000m SkiErg', '80m burpee broad jumps'])] },
    { id: uid(), name: 'Farmers Carry 200m + 100m Sandbag Lunges', blocks: [mkBlock('Werkblok', '', ['200m farmers carry', '100m sandbag lunges'])] },
    { id: uid(), name: 'Full Hyrox simulatie', blocks: [mkBlock('Simulatie', '', ['8x 1km run afgewisseld met de 8 hyrox-stations'])] },
    { id: uid(), name: 'AMRAP combo (voorbeeld)', blocks: [
        mkBlock('AMRAP 1', '5 min', ['15 wall balls', '150m row', '12 hand release push-ups']),
        mkBlock('Rust', '1 min', []),
        mkBlock('AMRAP 2', '5 min', ['15 kettlebell swings', '150m SkiErg', '10 burpees']),
        mkBlock('Rust', '1 min', []),
        mkBlock('Finisher', '4 min', ['10 wall balls', '10m sled push (150kg)'])
      ] }
  ];
}
export function mkRunPR(km, time, note) { return { id: uid(), km: km, date: todayISO(), time: time, note: note || '' }; }
export function mkHyroxPR(category, time, note) { return { id: uid(), category: category, date: todayISO(), time: time, note: note || '' }; }
export function defaultRunRaceResults() {
  return [
    mkRunPR(5, '22:32'),
    mkRunPR(10, '45:53'),
    mkRunPR(15, '1:14:31'),
    mkRunPR(16.09, '1:19:55'),
    mkRunPR(20, '1:39:42'),
    mkRunPR(21.1, '1:45:18'),
    mkRunPR(30, '2:53:16')
  ];
}
export function defaultHyroxRaceResults() {
  return [
    mkHyroxPR('solo', '1:26:03'),
    mkHyroxPR('doubles', '1:13:49')
  ];
}
export function defaultTriathlonChecklist() {
  function items(arr) { return arr.map(function (t) { return { id: uid(), text: t, checked: false }; }); }
  return {
    t1: items(['Wetsuit uit', 'Fietshelm op (voor fiets van rek!)', 'Fietsschoenen aan', 'Zonnebril op', 'Startnummer zichtbaar', 'Bidon gecontroleerd']),
    t2: items(['Fiets terug op rek', 'Fietshelm af', 'Hardloopschoenen aan', 'Gel/voeding gepakt', 'Pet/zonnebril gewisseld']),
    raceday: items(['Materiaal klaargelegd de avond ervoor', 'Ontbijt volgens carbload-schema', 'Bodymarking gedaan', 'Fiets ingecheckt in wisselzone', 'Bandenspanning gecontroleerd', 'Wetsuit gecontroleerd', 'Chip/timing bevestigd', 'Vervoer/parkeren geregeld'])
  };
}
export function defaultState() {
  return {
    races: defaultRaces(),
    scheduleEntries: defaultScheduleEntries(),
    strengthLogs: [],
    strengthTemplates: [],
    hyroxLibrary: defaultHyroxLibrary(),
    hyroxLogs: [],
    hyroxRaceResults: defaultHyroxRaceResults(),
    runRaceResults: defaultRunRaceResults(),
    enduranceLogs: [],
    moodLogs: [],
    complaintLogs: [],
    bodyWeightLogs: [],
    triathlonChecklist: defaultTriathlonChecklist()
  };
}
export function emptyState() {
  return {
    races: [], scheduleEntries: [], strengthLogs: [], strengthTemplates: [], hyroxLibrary: [], hyroxLogs: [],
    hyroxRaceResults: [], runRaceResults: [], enduranceLogs: [], moodLogs: [], complaintLogs: [], bodyWeightLogs: [],
    triathlonChecklist: { t1: [], t2: [], raceday: [] }
  };
}
