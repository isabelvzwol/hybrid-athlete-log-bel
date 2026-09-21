/* ---------------- gedeelde constanten ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html. */

export var SPORT_ICON = { Hardlopen: '🏃', 'Wielrennen / Kickr': '🚴', Zwemmen: '🏊', Brick: '🚴🏃', Triatlon: '🏊🚴🏃', Herstel: '🌙', Kracht: '🏋️', Hyrox: '⚡', Overig: '🔹', Voetbal: '⚽' };

export var NAV = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'schema', label: 'Schema', icon: '📅' },
  { key: 'kracht', label: 'Kracht', icon: '🏋️' },
  { key: 'hyrox', label: 'Hyrox', icon: '⚡' },
  { key: 'duursport', label: 'Duursport', icon: '📊' },
  { key: 'prs', label: 'PRs', icon: '🏆' }
];

export var STRENGTH_TEMPLATES = {
  'Leg day': ['Hip thrust', 'Lying leg curl', 'Bulgarian split squat', 'Back extensions', 'Leg raises', 'Calf raises', 'Walking lunges 3x20m'],
  'Upper': ['Lat pulldown', 'Single arm DB row', 'Incline DB press', 'DB shoulder press', 'Lateral raises', 'Single arm triceps pushdown'],
  'Full Body': ['Deadlift', 'Front squat', 'Pull-up', 'Push press', 'Farmers carry', 'Plank (seconden)']
};

export var HR_ZONES = [
  { key: 'Z1', label: 'Z1 Herstel (<130)', min: 0, max: 130, tone: 'slate' },
  { key: 'Z2', label: 'Z2 Aeroob (131-145)', min: 131, max: 145, tone: 'teal' },
  { key: 'Z3', label: 'Z3 Tempo (146-160)', min: 146, max: 160, tone: 'sage' },
  { key: 'Z4', label: 'Z4 Drempel (161-175)', min: 161, max: 175, tone: 'amber' },
  { key: 'Z5', label: 'Z5 VO2max (176+)', min: 176, max: 999, tone: 'danger' }
];
export function hrZone(hr) {
  if (hr == null) return null;
  for (var i = 0; i < HR_ZONES.length; i++) { if (hr >= HR_ZONES[i].min && hr <= HR_ZONES[i].max) return HR_ZONES[i]; }
  return null;
}
export var HR_SPORTS = ['Hardlopen', 'Wielrennen / Kickr', 'Zwemmen', 'Brick', 'Kracht', 'Hyrox', 'Voetbal', 'Overig'];

export var STANDARD_DISTANCES = [
  { km: 5, label: '5k' }, { km: 10, label: '10k' }, { km: 15, label: '15k' },
  { km: 16.09, label: '10 mijl' }, { km: 20, label: '20k' }, { km: 21.1, label: 'Halve marathon' },
  { km: 30, label: '30k' }, { km: 42.2, label: 'Marathon' }
];
export function nearestStandardDistance(d) {
  var best = null, bestDiff = Infinity;
  STANDARD_DISTANCES.forEach(function (sd) {
    var tol = sd.km >= 42 ? 2 : (sd.km >= 30 ? 1.5 : (sd.km >= 20 ? 1 : (sd.km >= 15 ? 0.7 : 0.6)));
    var diff = Math.abs(d - sd.km);
    if (diff <= tol && diff < bestDiff) { best = sd.km; bestDiff = diff; }
  });
  return best;
}

export var SPORT_OPTIONS = ['Hardlopen', 'Wielrennen / Kickr', 'Zwemmen', 'Brick', 'Kracht', 'Hyrox', 'Herstel', 'Voetbal', 'Overig'];
