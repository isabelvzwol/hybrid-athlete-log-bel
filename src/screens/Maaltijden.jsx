/* ---------------- Eten-tab (avondeten per week) ----------------
   Op zondag het avondeten voor de week samenstellen. Per dag kies je: koken
   (uit je eigen maaltijden of een nieuwe), uit eten, of niet thuis. De
   ingrediënten van een geplande maaltijd zijn een kopie: je kunt ze voor die
   ene dag aanpassen (bv. sperziebonen i.p.v. snijbonen) zonder je bewaarde
   maaltijd te veranderen. Uit alle geplande maaltijden van de week rolt een
   boodschappenlijst. Hoeveelheden worden niet bijgehouden: een ingrediënt is
   gewoon een regel tekst.
   Per product onthoudt de app de winkel, de plek in je boodschappenvolgorde en
   of je het altijd in huis hebt (tabel meal_products). Dat geldt elke week. */
import React, { useState } from 'react';
import { Card, Button, Field, TextInput, Modal, SegTabs, ConfirmInline, KebabMenu } from '../components/ui.jsx';
import { uid, getMonday, todayISO, addDays, formatDateShort, isoWeekNumber, WEEKDAYS_FULL, toDate } from '../lib/helpers.js';
var e = React.createElement;

var FOOD_STORES = ['AH', 'Lidl', 'Jumbo', 'Anders'];
var OTHER_STORES = ['Kruidvat', 'Etos', 'Anders'];
var FIXED_GUESTS = ['Papa', 'Mart', 'Vriendinnen'];
/* Alles wat je zelf als extra toevoegt (Week, Tussendoor of Drogist) hoort niet
   bij één week: het blijft staan tot je het zelf verwijdert. Die items worden
   bewaard in een eigen rij van meal_shopping met een vaste datum in plaats van
   een weekdatum (zo is er geen extra SQL nodig). Extra's die vóór deze
   wijziging per week zijn bewaard blijven gewoon zichtbaar in hun eigen week. */
var QUICK_WEEK = '1900-01-01';

function chipStyle(active) {
  return active ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' };
}
function lastGuests(plan) {
  var best = null;
  plan.forEach(function (x) { if ((x.kind === 'meal' || x.kind === 'freezer') && x.guests && (!best || x.date > best.date)) best = x; });
  return best ? best.guests : [];
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function dayLabel(iso) { return cap(WEEKDAYS_FULL[toDate(iso).getDay()]) + ' ' + formatDateShort(iso); }
function parseLines(text) {
  return ('' + (text || '')).split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l; });
}
function keyOf(text) { return ('' + text).trim().toLowerCase(); }

/* Standaard staat de week van vandaag open. Op zondag (het planmoment) is dat
   de week die morgen begint. */
function defaultMonday() {
  var today = todayISO();
  var isSunday = toDate(today).getDay() === 0;
  return isSunday ? addDays(today, 1) : getMonday(today);
}

/* Boodschappen van een week: alle ingrediënten van de dagen waarop je kookt,
   samengevoegd als ze (op hoofdletters na) hetzelfde zijn. */
function weekIngredients(plan, monday) {
  var map = {};
  var order = [];
  for (var i = 0; i < 7; i++) {
    var date = addDays(monday, i);
    var item = plan.find(function (x) { return x.date === date && x.kind === 'meal'; });
    if (!item) continue;
    (item.ingredients || []).forEach(function (ing) {
      var k = keyOf(ing);
      if (!k) return;
      if (!map[k]) { map[k] = { key: k, text: ing, days: [] }; order.push(k); }
      var short = WEEKDAYS_FULL[toDate(date).getDay()].slice(0, 2);
      if (map[k].days.indexOf(short) === -1) map[k].days.push(short);
    });
  }
  return order.map(function (k) { return map[k]; });
}

function DinnerModal(props) {
  var item = props.item;
  var meals = props.meals;
  // Oude "Niet thuis"-dagen tellen voortaan als "Buiten de deur".
  var stKind = useState(item ? (item.kind === 'skip' ? 'out' : item.kind) : 'meal'); var kind = stKind[0], setKind = stKind[1];
  var stName = useState(item && (item.kind === 'meal' || item.kind === 'freezer') ? item.name || '' : ''); var name = stName[0], setName = stName[1];
  var stIng = useState(item && item.kind === 'meal' ? (item.ingredients || []).join('\n') : ''); var ingText = stIng[0], setIngText = stIng[1];
  var initialGuests = item ? ((item.kind === 'meal' || item.kind === 'freezer') ? item.guests || [] : []) : (props.defaultGuests || []);
  var stFixed = useState(initialGuests.filter(function (g) { return FIXED_GUESTS.indexOf(g) !== -1; })); var fixed = stFixed[0], setFixed = stFixed[1];
  var otherInit = initialGuests.filter(function (g) { return FIXED_GUESTS.indexOf(g) === -1; });
  var stOtherOn = useState(otherInit.length > 0); var otherOn = stOtherOn[0], setOtherOn = stOtherOn[1];
  var stOtherText = useState(otherInit.join(', ')); var otherText = stOtherText[0], setOtherText = stOtherText[1];
  var stPersons = useState(item && item.persons ? item.persons : 1 + initialGuests.length); var persons = stPersons[0], setPersons = stPersons[1];
  var stNote = useState(item && item.kind !== 'meal' && item.kind !== 'freezer' ? item.note || '' : ''); var note = stNote[0], setNote = stNote[1];
  var stQuery = useState(''); var query = stQuery[0], setQuery = stQuery[1];
  var stMealId = useState(item ? item.mealId || null : null); var mealId = stMealId[0], setMealId = stMealId[1];
  var stLib = useState(null); var libOverride = stLib[0], setLibOverride = stLib[1];

  var q = query.trim().toLowerCase();
  var matches = meals.filter(function (m) { return !q || m.name.toLowerCase().indexOf(q) !== -1; }).slice(0, q ? 20 : 8);
  var trimmedName = name.trim();
  var matchMeal = trimmedName ? meals.find(function (m) { return m.name.toLowerCase() === trimmedName.toLowerCase(); }) : null;
  var libChecked = libOverride !== null ? libOverride : !matchMeal;
  var alone = fixed.length === 0 && !otherOn;

  function pick(m) { setName(m.name); setIngText((m.ingredients || []).join('\n')); setMealId(m.id); setLibOverride(null); setQuery(''); }
  function selectAlone() { setFixed([]); setOtherOn(false); setOtherText(''); setPersons(1); }
  function toggleFixed(g) {
    var next = fixed.indexOf(g) === -1 ? fixed.concat([g]) : fixed.filter(function (x) { return x !== g; });
    setFixed(next);
    setPersons(1 + next.length + (otherOn ? 1 : 0));
  }
  function toggleOther() {
    var on = !otherOn;
    setOtherOn(on);
    setPersons(1 + fixed.length + (on ? 1 : 0));
  }
  var cooks = kind === 'meal' || kind === 'freezer';
  function save() {
    if (cooks && !trimmedName) return;
    var guests = cooks ? fixed.concat(otherOn ? [otherText.trim() || 'Anders'] : []) : [];
    var entry = {
      id: item ? item.id : uid(), date: props.date, kind: kind,
      mealId: kind === 'meal' ? (matchMeal ? matchMeal.id : mealId) : null,
      name: cooks ? trimmedName : '',
      ingredients: kind === 'meal' ? parseLines(ingText) : [],
      persons: cooks ? persons : null,
      guests: guests,
      note: cooks ? '' : note.trim()
    };
    props.onSave(entry, kind === 'meal' ? { saveNew: !matchMeal && libChecked, updateExisting: (matchMeal && libChecked) ? matchMeal : null } : null);
  }

  var guestBlock = e('div', { className: 'flex flex-col gap-3' },
    e('div', { className: 'flex flex-col gap-2' },
      e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, 'Wie eet er mee?'),
      e('div', { className: 'flex gap-2 flex-wrap' },
        e('button', { onClick: selectAlone, className: 'rounded-full px-3 py-1.5 text-xs font-medium', style: chipStyle(alone) }, 'Alleen'),
        FIXED_GUESTS.map(function (g) {
          return e('button', { key: g, onClick: function () { toggleFixed(g); }, className: 'rounded-full px-3 py-1.5 text-xs font-medium', style: chipStyle(fixed.indexOf(g) !== -1) }, g);
        }),
        e('button', { onClick: toggleOther, className: 'rounded-full px-3 py-1.5 text-xs font-medium', style: chipStyle(otherOn) }, 'Anders')
      ),
      otherOn ? e(TextInput, { placeholder: 'Wie? (optioneel)', value: otherText, onChange: function (ev) { setOtherText(ev.target.value); } }) : null
    ),
    e('div', { className: 'flex items-center justify-between rounded-xl px-3 py-2', style: { background: 'var(--bg-inset)' } },
      e('span', { className: 'text-sm' }, 'Aantal personen'),
      e('div', { className: 'flex items-center gap-3' },
        e('button', { onClick: function () { setPersons(Math.max(1, persons - 1)); }, className: 'w-8 h-8 rounded-full', style: { background: 'var(--bg-elevated)' } }, '−'),
        e('span', { className: 'font-display text-base font-semibold w-4 text-center' }, persons),
        e('button', { onClick: function () { setPersons(Math.min(12, persons + 1)); }, className: 'w-8 h-8 rounded-full', style: { background: 'var(--bg-elevated)' } }, '+')
      )
    )
  );

  return e(Modal, { title: 'Avondeten ' + dayLabel(props.date).toLowerCase(), onClose: props.onClose },
    e('div', { className: 'flex flex-col gap-3' },
      e(SegTabs, { value: kind, onChange: setKind, options: [{ value: 'meal', label: '🍳 Koken' }, { value: 'freezer', label: '🧊 Vriezer' }, { value: 'out', label: '🚪 Buiten' }] }),
      kind === 'meal' ? e('div', { className: 'flex flex-col gap-3' },
        meals.length ? e('div', { className: 'flex flex-col gap-2' },
          e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, 'Kies uit je eigen maaltijden'),
          meals.length > 6 ? e(TextInput, { placeholder: 'Zoek in je maaltijden', value: query, onChange: function (ev) { setQuery(ev.target.value); } }) : null,
          e('div', { className: 'flex gap-2 flex-wrap' }, matches.map(function (m) {
            var active = matchMeal && matchMeal.id === m.id;
            return e('button', { key: m.id, onClick: function () { pick(m); }, className: 'rounded-full px-3 py-1.5 text-xs font-medium', style: chipStyle(active) }, m.name);
          })),
          !matches.length ? e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Geen maaltijd gevonden.') : null
        ) : e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Je hebt nog geen eigen maaltijden. Vul hieronder een maaltijd in en bewaar hem voor de volgende keer.'),
        e(Field, { label: 'Maaltijd' }, e(TextInput, { value: name, onChange: function (ev) { setName(ev.target.value); }, placeholder: 'bv. Stamppot met snijbonen' })),
        e(Field, { label: 'Boodschappen voor deze maaltijd (één per regel)' }, e('textarea', { rows: 5, value: ingText, onChange: function (ev) { setIngText(ev.target.value); }, placeholder: 'snijbonen\naardappelen\nrookworst' })),
        e('p', { className: 'text-xs -mt-1', style: { color: 'var(--text-tertiary)' } }, 'Dit geldt alleen voor deze dag. Wissel je sperziebonen voor snijbonen, dan blijft je bewaarde maaltijd gewoon staan.'),
        guestBlock,
        trimmedName ? e('button', { onClick: function () { setLibOverride(!libChecked); }, className: 'flex items-center gap-2 text-left' },
          e('span', { className: 'w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0', style: libChecked ? { background: 'var(--sage)', color: '#12180F' } : { border: '1.5px solid var(--border)' } }, libChecked ? '✓' : ''),
          e('span', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, matchMeal ? 'Pas ook mijn bewaarde maaltijd "' + matchMeal.name + '" aan' : 'Bewaar in mijn maaltijden (met boodschappen)')
        ) : null
      ) : kind === 'freezer' ? e('div', { className: 'flex flex-col gap-3' },
        props.freezerNames && props.freezerNames.length ? e('div', { className: 'flex flex-col gap-2' },
          e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, 'Eerder uit de vriezer'),
          e('div', { className: 'flex gap-2 flex-wrap' }, props.freezerNames.map(function (n) {
            return e('button', { key: n, onClick: function () { setName(n); }, className: 'rounded-full px-3 py-1.5 text-xs font-medium', style: chipStyle(trimmedName.toLowerCase() === n.toLowerCase()) }, n);
          }))
        ) : null,
        e(Field, { label: 'Wat eet je uit de vriezer?' }, e(TextInput, { value: name, onChange: function (ev) { setName(ev.target.value); }, placeholder: 'bv. Chili con carne' })),
        e('p', { className: 'text-xs -mt-1', style: { color: 'var(--text-tertiary)' } }, 'Er komt niets op je boodschappenlijst.'),
        guestBlock
      ) : e(Field, { label: 'Waar of bij wie? (optioneel)' },
        e(TextInput, { value: note, onChange: function (ev) { setNote(ev.target.value); }, placeholder: 'bv. Pizzeria met Sanne, of bij Mart' })),
      e('div', { className: 'flex gap-2 mt-1' },
        e(Button, { className: 'flex-1', onClick: save, disabled: cooks && !trimmedName }, 'Opslaan'),
        item ? e(ConfirmInline, { label: 'Leegmaken', onConfirm: function () { props.onClear(props.date); } }) : null
      )
    )
  );
}

function MealEditModal(props) {
  var meal = props.meal;
  var stName = useState(meal ? meal.name : ''); var name = stName[0], setName = stName[1];
  var stIng = useState(meal ? (meal.ingredients || []).join('\n') : ''); var ingText = stIng[0], setIngText = stIng[1];
  return e(Modal, { title: meal ? 'Maaltijd bewerken' : 'Nieuwe maaltijd', onClose: props.onClose },
    e('div', { className: 'flex flex-col gap-3' },
      e(Field, { label: 'Naam' }, e(TextInput, { value: name, onChange: function (ev) { setName(ev.target.value); }, placeholder: 'bv. Pasta pesto met kip' })),
      e(Field, { label: 'Standaard boodschappen (één per regel)' }, e('textarea', { rows: 6, value: ingText, onChange: function (ev) { setIngText(ev.target.value); }, placeholder: 'pasta\npesto\nkipfilet' })),
      e('div', { className: 'flex gap-2' },
        e(Button, { className: 'flex-1', disabled: !name.trim(), onClick: function () {
          if (!name.trim()) return;
          props.onSave({ id: meal ? meal.id : uid(), name: name.trim(), ingredients: parseLines(ingText) });
        } }, 'Opslaan'),
        meal ? e(ConfirmInline, { label: 'Verwijderen', onConfirm: function () { props.onDelete(meal.id); } }) : null
      )
    )
  );
}

function PlanView(props) {
  var monday = props.monday;
  var days = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return addDays(monday, i); });
  var today = todayISO();
  return e('div', { className: 'flex flex-col gap-2' },
    days.map(function (date) {
      var item = props.plan.find(function (x) { return x.date === date; });
      var isToday = date === today;
      var body;
      if (!item) {
        body = e('div', { className: 'text-sm', style: { color: 'var(--text-tertiary)' } }, '+ Kies avondeten');
      } else if (item.kind === 'out' || item.kind === 'skip') {
        body = e('div', {},
          e('div', { className: 'text-sm font-semibold' }, '🚪 Buiten de deur'),
          item.note ? e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, item.note) : null
        );
      } else if (item.kind === 'freezer') {
        var fguests = item.guests || [];
        var fwith = fguests.length ? 'Met ' + fguests.join(', ') : (item.persons === 1 ? 'Alleen' : null);
        body = e('div', {},
          e('div', { className: 'flex items-center gap-2' },
            e('span', { className: 'text-sm font-semibold' }, '🧊 ' + item.name),
            item.persons ? e('span', { className: 'text-xs rounded-full px-2 py-0.5', style: { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, item.persons + ' pers.') : null
          ),
          e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Uit de vriezer' + (fwith ? ' · ' + fwith : ''))
        );
      } else {
        var guests = item.guests || [];
        var withLine = guests.length ? 'Met ' + guests.join(', ') : (item.persons === 1 ? 'Alleen' : null);
        body = e('div', {},
          e('div', { className: 'flex items-center gap-2' },
            e('span', { className: 'text-sm font-semibold' }, item.name),
            item.persons ? e('span', { className: 'text-xs rounded-full px-2 py-0.5', style: { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, item.persons + ' pers.') : null
          ),
          withLine ? e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, withLine) : null,
          (item.ingredients && item.ingredients.length) ? e('div', { className: 'text-xs truncate', style: { color: 'var(--text-tertiary)' } }, item.ingredients.join(', ')) : null
        );
      }
      return e(Card, { key: date, onClick: function () { props.onOpenDay(date); }, className: 'p-3.5 flex items-center gap-3 cursor-pointer' },
        e('div', { className: 'shrink-0 w-24 text-xs font-medium leading-tight', style: { color: isToday ? 'var(--sage-strong)' : 'var(--text-secondary)' } }, dayLabel(date)),
        e('div', { className: 'flex-1 min-w-0' }, body)
      );
    })
  );
}

/* Sorteert producten op de onthouden volgorde; producten zonder plek komen
   onderaan, in de volgorde waarin ze voorkomen. */
function sortByOrder(items) {
  return items.map(function (it, i) { return { it: it, i: i }; }).sort(function (a, b) {
    var sa = a.it.sort == null ? Infinity : a.it.sort;
    var sb = b.it.sort == null ? Infinity : b.it.sort;
    if (sa !== sb) return sa < sb ? -1 : 1;
    return a.i - b.i;
  }).map(function (x) { return x.it; });
}

function ProductModal(props) {
  var item = props.item;
  return e(Modal, { title: item.text, onClose: props.onClose },
    e('div', { className: 'flex flex-col gap-4' },
      e('div', { className: 'flex flex-col gap-2' },
        e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, 'Bij welke winkel haal je dit? (geldt elke week)'),
        e('div', { className: 'flex gap-2 flex-wrap' },
          e('button', { onClick: function () { props.onStore(''); }, className: 'rounded-full px-3 py-1.5 text-xs font-medium', style: chipStyle(!item.store) }, 'Geen vaste winkel'),
          FOOD_STORES.map(function (st) {
            return e('button', { key: st, onClick: function () { props.onStore(st); }, className: 'rounded-full px-3 py-1.5 text-xs font-medium', style: chipStyle(item.store === st) }, st);
          })
        )
      ),
      e('div', { className: 'flex flex-col gap-2' },
        e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, 'Heb je dit al thuis?'),
        e(Button, { variant: 'ghost', onClick: props.onHomeWeek }, 'Heb ik al, alleen deze week'),
        e(Button, { variant: 'ghost', onClick: props.onHomeAlways }, 'Heb ik altijd in huis'),
        e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Je vindt ze onderaan de lijst terug onder "Thuis", zodat je ze weer op de lijst kunt zetten.')
      ),
      e(Button, { onClick: props.onClose }, 'Klaar')
    )
  );
}

function ShoppingView(props) {
  var monday = props.monday;
  var row = props.shopping || { checked: [], extras: [], home: [] };
  var products = props.products || [];
  var stNew = useState(''); var newText = stNew[0], setNewText = stNew[1];
  var stNewStore = useState(''); var newStore = stNewStore[0], setNewStore = stNewStore[1];
  var stNewKind = useState('food'); var newKind = stNewKind[0], setNewKind = stNewKind[1];
  var stCopied = useState(false); var copied = stCopied[0], setCopied = stCopied[1];
  var stReorder = useState(false); var reorder = stReorder[0], setReorder = stReorder[1];
  var stSheet = useState(null); var sheetKey = stSheet[0], setSheetKey = stSheet[1];
  var stHidden = useState(false); var showHidden = stHidden[0], setShowHidden = stHidden[1];
  var stDoneOpen = useState(true); var doneOpen = stDoneOpen[0], setDoneOpen = stDoneOpen[1];
  var stAddOpen = useState(false); var addOpen = stAddOpen[0], setAddOpen = stAddOpen[1];

  var checkedKeys = row.checked || [];
  var extras = row.extras || [];
  /* Extra's van de supermarkt horen in dezelfde lijst als de maaltijd-boodschappen.
     Alleen drogist en overig komt in het aparte lijstje eronder. Oudere extra's
     zonder 'kind' worden herkend aan hun winkel. */
  function extraKind(x) {
    if (x.kind) return x.kind;
    return (x.store === 'Kruidvat' || x.store === 'Etos' || x.store === 'Anders') ? 'other' : 'food';
  }
  var home = row.home || [];
  var quickItems = props.quickItems || [];
  var checkedSet = {};
  checkedKeys.forEach(function (k) { checkedSet[k] = true; });
  var prodMap = {};
  products.forEach(function (p) { prodMap[p.key] = p; });
  var maxSort = 0;
  products.forEach(function (p) { if (p.sortOrder > maxSort) maxSort = p.sortOrder; });

  var all = weekIngredients(props.plan, monday).map(function (it) {
    var p = prodMap[it.key];
    return { key: it.key, text: it.text, days: it.days, store: p ? p.store : '', sort: p ? p.sortOrder : null, permHome: !!(p && p.atHome), weekHome: home.indexOf(it.key) !== -1 };
  });
  var visible = all.filter(function (it) { return !it.permHome && !it.weekHome; });
  var hidden = all.filter(function (it) { return it.permHome || it.weekHome; });
  /* Alle extra's op één hoop: de blijvende (src 'perm') en de oude per-week
     extra's (src 'week'). 'kind' bepaalt in welke lijst ze staan. */
  var allExtras = quickItems.map(function (x) { return Object.assign({}, x, { kind: x.kind || 'quick', src: 'perm' }); })
    .concat(extras.map(function (x) { return Object.assign({}, x, { kind: extraKind(x), src: 'week' }); }));
  var foodExtraItems = allExtras.filter(function (x) { return x.kind === 'food'; }).map(function (x) {
    return { key: (x.src === 'perm' ? 'p-' : 'x-') + x.id, id: x.id, src: x.src, text: x.text, days: null, store: x.store || '', sort: null, isExtra: true, checked: !!x.checked };
  });
  var quickAll = allExtras.filter(function (x) { return x.kind === 'quick'; });
  var otherExtras = allExtras.filter(function (x) { return x.kind === 'other'; });
  var hasStores = visible.some(function (it) { return it.store; }) || foodExtraItems.some(function (it) { return it.store; });

  function persist(nextChecked, nextExtras, nextHome) { props.onSave(monday, nextChecked, nextExtras, nextHome); }
  function toggleItem(key) {
    var next = checkedKeys.slice();
    var i = next.indexOf(key);
    if (i === -1) next.push(key); else next.splice(i, 1);
    persist(next, extras, home);
  }
  /* Extra's: de blijvende staan in de vaste rij, oude per-week extra's in hun week. */
  function toggleExtra(x) {
    if (x.src === 'perm') props.onSaveQuick(quickItems.map(function (q) { return q.id === x.id ? Object.assign({}, q, { checked: !q.checked }) : q; }));
    else persist(checkedKeys, extras.map(function (q) { return q.id === x.id ? Object.assign({}, q, { checked: !q.checked }) : q; }), home);
  }
  function removeExtra(x) {
    if (x.src === 'perm') props.onSaveQuick(quickItems.filter(function (q) { return q.id !== x.id; }));
    else persist(checkedKeys, extras.filter(function (q) { return q.id !== x.id; }), home);
  }
  function clearDoneExtras(kind) {
    if (quickItems.some(function (q) { return q.checked && (q.kind || 'quick') === kind; })) {
      props.onSaveQuick(quickItems.filter(function (q) { return !(q.checked && (q.kind || 'quick') === kind); }));
    }
    if (extras.some(function (q) { return q.checked && extraKind(q) === kind; })) {
      persist(checkedKeys, extras.filter(function (q) { return !(q.checked && extraKind(q) === kind); }), home);
    }
  }
  function addExtra() {
    var t = newText.trim();
    if (!t) return;
    props.onSaveQuick(quickItems.concat([{ id: uid(), text: t, checked: false, store: newStore, kind: newKind }]));
    setNewText('');
  }
  /* Verwijdert een product van de lijst door het uit de geplande maaltijden van
     deze week te halen. Je bewaarde maaltijd in "Maaltijden" blijft ongewijzigd. */
  function removeProduct(key) {
    for (var i = 0; i < 7; i++) {
      var date = addDays(monday, i);
      var item = props.plan.find(function (x) { return x.date === date && x.kind === 'meal'; });
      if (!item) continue;
      var ings = item.ingredients || [];
      var left = ings.filter(function (ing) { return keyOf(ing) !== key; });
      if (left.length !== ings.length) props.onSaveDay(Object.assign({}, item, { ingredients: left }));
    }
    if (checkedKeys.indexOf(key) !== -1) persist(checkedKeys.filter(function (k) { return k !== key; }), extras, home);
  }

  /* Alle producten van deze week die de app nog niet kent krijgen nu een plek
     onderaan, in de volgorde waarin ze op het scherm staan. Zo schuift er niets
     om als je daarna één product instelt. */
  function baseProducts() {
    var map = {};
    var next = maxSort;
    all.forEach(function (it) {
      var p = prodMap[it.key];
      if (p) map[it.key] = Object.assign({}, p);
      else { next += 10; map[it.key] = { key: it.key, name: it.text, store: '', sortOrder: next, atHome: false, isNew: true }; }
    });
    return map;
  }
  function saveProduct(key, patch) {
    var map = baseProducts();
    var target = map[key];
    Object.assign(target, patch);
    var changed = Object.keys(map).filter(function (k) { return k === key || map[k].isNew; }).map(function (k) { var o = Object.assign({}, map[k]); delete o.isNew; return o; });
    props.onSaveProducts(changed);
  }
  function moveItem(group, i, dir) {
    var j = i + dir;
    if (j < 0 || j >= group.length) return;
    var slots = group.filter(function (it) { return it.sort != null; }).map(function (it) { return it.sort; }).sort(function (a, b) { return a - b; });
    var vals = [];
    var next = maxSort;
    for (var k = 0; k < group.length; k++) {
      if (k < slots.length) vals.push(slots[k]); else { next += 10; vals.push(next); }
    }
    var order = group.slice();
    var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    var list = [];
    order.forEach(function (it, idx) {
      var p = prodMap[it.key];
      if (!p || p.sortOrder !== vals[idx]) list.push({ key: it.key, name: p ? p.name : it.text, store: p ? p.store : '', sortOrder: vals[idx], atHome: p ? p.atHome : false });
    });
    if (list.length) props.onSaveProducts(list);
  }
  function backOnList(it) {
    if (it.weekHome) persist(checkedKeys, extras, home.filter(function (k) { return k !== it.key; }));
    if (it.permHome) { var p = prodMap[it.key]; props.onSaveProducts([{ key: it.key, name: p.name, store: p.store, sortOrder: p.sortOrder, atHome: false }]); }
  }

  function copyList() {
    var lines = [];
    var openAll = visible.filter(function (it) { return !checkedSet[it.key]; }).concat(foodExtraItems.filter(function (it) { return !it.checked; }));
    storeGroups(openAll).forEach(function (g) {
      if (!g.items.length) return;
      if (hasStores) lines.push((g.store || 'Gewone boodschappen') + ':');
      g.items.forEach(function (it) { lines.push('- ' + it.text); });
      lines.push('');
    });
    var openQuick = quickAll.filter(function (x) { return !x.checked; });
    quickGroups(openQuick).forEach(function (g) {
      if (!g.items.length) return;
      lines.push('Tussendoor' + (g.store ? ' (' + g.store + ')' : '') + ':');
      g.items.forEach(function (x) { lines.push('- ' + x.text); });
      lines.push('');
    });
    var openExtras = otherExtras.filter(function (x) { return !x.checked; });
    extraGroups(openExtras).forEach(function (g) {
      if (!g.items.length) return;
      lines.push('Drogist en overig' + (g.store ? ' (' + g.store + ')' : '') + ':');
      g.items.forEach(function (x) { lines.push('- ' + x.text); });
      lines.push('');
    });
    var text = 'Boodschappen week ' + isoWeekNumber(monday) + ':\n' + lines.join('\n').trim();
    try {
      navigator.clipboard.writeText(text).then(function () { setCopied(true); setTimeout(function () { setCopied(false); }, 2000); }).catch(function () {});
    } catch (err) { /* kopiëren niet beschikbaar op dit apparaat */ }
  }

  function storeGroups(items) {
    var order = [''].concat(FOOD_STORES);
    return order.map(function (st) {
      return { store: st, items: sortByOrder(items.filter(function (it) { return (it.store || '') === st; })) };
    });
  }
  function quickGroups(items) {
    var order = [''].concat(FOOD_STORES);
    return order.map(function (st) {
      return { store: st, items: items.filter(function (x) { return (x.store || '') === st; }) };
    });
  }
  function extraGroups(items) {
    var order = [''].concat(OTHER_STORES);
    return order.map(function (st) {
      return { store: st, items: items.filter(function (x) { return (x.store || '') === st; }) };
    });
  }

  function rowEl(key, text, sub, checked, onToggle, onRemove, onOpen, arrows) {
    return e('div', { key: key, className: 'flex items-center gap-3 py-2' },
      arrows ? e('div', { className: 'flex gap-1 shrink-0' },
        e('button', { onClick: arrows.up, disabled: !arrows.up, className: 'w-7 h-7 rounded-lg text-xs', style: { background: 'var(--bg-elevated)', opacity: arrows.up ? 1 : 0.3 } }, '▲'),
        e('button', { onClick: arrows.down, disabled: !arrows.down, className: 'w-7 h-7 rounded-lg text-xs', style: { background: 'var(--bg-elevated)', opacity: arrows.down ? 1 : 0.3 } }, '▼')
      ) : e('button', { onClick: onToggle, className: 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
        style: checked ? { background: 'var(--sage)', color: '#12180F' } : { border: '1.5px solid var(--border)' } }, checked ? '✓' : ''),
      e('div', { className: 'flex-1 min-w-0' + (onOpen && !arrows ? ' cursor-pointer' : ''), onClick: (onOpen && !arrows) ? onOpen : undefined },
        e('div', { className: 'text-sm', style: checked ? { textDecoration: 'line-through', color: 'var(--text-tertiary)' } : {} }, text),
        sub ? e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, sub) : null
      ),
      (onRemove && !arrows) ? e('button', { onClick: onRemove, className: 'text-xs shrink-0', style: { color: 'var(--danger)' } }, '✕') : null
    );
  }
  function doneHeader(key, count) {
    return e('button', { key: key, onClick: function () { setDoneOpen(!doneOpen); }, className: 'flex items-center gap-1 text-xs pt-3 pb-1 text-left', style: { color: 'var(--text-tertiary)' } },
      e('span', {}, doneOpen ? '▾' : '▸'),
      e('span', {}, 'Al in het mandje (' + count + ')')
    );
  }
  function heading(label) {
    return e('div', { key: 'h-' + label, className: 'text-xs font-semibold pt-3 pb-0.5', style: { color: 'var(--text-secondary)' } }, label);
  }

  var open = visible.filter(function (it) { return !checkedSet[it.key]; }).concat(foodExtraItems.filter(function (it) { return !it.checked; }));
  var done = sortByOrder(visible.filter(function (it) { return checkedSet[it.key]; })).concat(foodExtraItems.filter(function (it) { return it.checked; }));
  var openGroups = storeGroups(open);
  var extraOpenGroups = extraGroups(otherExtras.filter(function (x) { return !x.checked; }));
  var doneExtras = otherExtras.filter(function (x) { return x.checked; });
  var empty = !all.length && !allExtras.length;
  var sheetItem = sheetKey ? all.find(function (it) { return it.key === sheetKey; }) : null;
  var extraHasStores = otherExtras.some(function (x) { return x.store; });
  var quickOpen = quickAll.filter(function (x) { return !x.checked; });
  var quickDone = quickAll.filter(function (x) { return x.checked; });
  var quickHasStores = quickAll.some(function (x) { return x.store; });
  var doneExtraCount = foodExtraItems.filter(function (it) { return it.checked; }).length;

  var mainRows = [];
  openGroups.forEach(function (g) {
    if (!g.items.length) return;
    if (hasStores) mainRows.push(heading(g.store || 'Gewone boodschappen'));
    var prodItems = g.items.filter(function (it) { return !it.isExtra; });
    g.items.forEach(function (it) {
      if (it.isExtra) {
        mainRows.push(rowEl(it.key, it.text, 'extra', false, function () { toggleExtra(it); }, function () { removeExtra(it); }, null,
          reorder ? { up: null, down: null } : null));
        return;
      }
      var i = prodItems.indexOf(it);
      mainRows.push(rowEl('i-' + it.key, it.text, it.days.join(', '), false, function () { toggleItem(it.key); }, function () { removeProduct(it.key); }, function () { setSheetKey(it.key); },
        reorder ? { up: i > 0 ? function () { moveItem(prodItems, i, -1); } : null, down: i < prodItems.length - 1 ? function () { moveItem(prodItems, i, 1); } : null } : null));
    });
  });

  var addForm = e(Card, { className: 'p-3.5' },
    e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Alles wat je hier toevoegt blijft staan tot je het zelf verwijdert, ook in volgende weken.'),
    e('div', { className: 'flex flex-col gap-2 mt-2' },
      e(TextInput, { placeholder: 'Extra boodschap (bv. melk of tandpasta)', value: newText, onChange: function (ev) { setNewText(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === 'Enter') addExtra(); } }),
      e(SegTabs, { value: newKind, onChange: function (v) { setNewKind(v); setNewStore(''); },
        options: [{ value: 'food', label: '🛒 Week' }, { value: 'quick', label: '🏃 Tussendoor' }, { value: 'other', label: '🧴 Drogist' }] }),
      e('div', { className: 'flex gap-2 flex-wrap items-center' },
        e('button', { onClick: function () { setNewStore(''); }, className: 'rounded-full px-3 py-1.5 text-xs font-medium', style: chipStyle(!newStore) }, 'Geen winkel'),
        (newKind === 'other' ? OTHER_STORES : FOOD_STORES).map(function (st) {
          return e('button', { key: st, onClick: function () { setNewStore(st); }, className: 'rounded-full px-3 py-1.5 text-xs font-medium', style: chipStyle(newStore === st) }, st);
        }),
        e(Button, { variant: 'ghost', className: 'ml-auto', onClick: addExtra, disabled: !newText.trim() }, '+ Toevoegen')
      )
    )
  );
  function extraKey(x) { return (x.src === 'perm' ? 'p-' : 'x-') + x.id; }

  return e('div', { className: 'flex flex-col gap-3' },
    e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'De lijst komt uit je geplande maaltijden. Tik op een product voor de winkel of om aan te geven dat je het al thuis hebt. Wil je iets wisselen, pas het dan aan bij de maaltijd van die dag.'),
    e(Button, { variant: 'ghost', onClick: function () { setAddOpen(!addOpen); } }, addOpen ? '✕ Sluiten' : '+ Extra toevoegen'),
    addOpen ? addForm : null,
    e(Card, { className: 'p-3.5' },
      e('div', { className: 'text-sm font-semibold' }, '🛒 Weekboodschappen'),
      empty ? e('div', { className: 'text-sm py-2', style: { color: 'var(--text-tertiary)' } }, 'Nog niets te kopen. Plan eerst maaltijden met boodschappen, of voeg zelf iets toe.') : null,
      visible.length > 1 ? e('div', { className: 'flex justify-end' },
        e('button', { onClick: function () { setReorder(!reorder); }, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, reorder ? '✓ Klaar met volgorde' : '↕ Volgorde aanpassen')
      ) : null,
      reorder ? e('p', { className: 'text-xs pt-1', style: { color: 'var(--text-tertiary)' } }, 'Gebruik de pijltjes. De volgorde wordt onthouden voor volgende weken.') : null,
      e('div', { className: 'flex flex-col' },
        mainRows,
        done.length ? doneHeader('done-h', done.length) : null,
        done.length && doneOpen ? done.map(function (it) {
          if (it.isExtra) return rowEl(it.key, it.text, null, true, function () { toggleExtra(it); }, function () { removeExtra(it); }, null, null);
          return rowEl('i-' + it.key, it.text, null, true, function () { toggleItem(it.key); }, function () { removeProduct(it.key); }, null, null);
        }) : null,
        doneExtraCount && doneOpen ? e('button', { key: 'clear-food', onClick: function () { clearDoneExtras('food'); }, className: 'text-xs font-medium text-left pt-1 pb-1', style: { color: 'var(--danger)' } }, 'Afgevinkte extra\'s verwijderen') : null
      )
    ),
    quickAll.length ? e(Card, { className: 'p-3.5' },
      e('div', { className: 'text-sm font-semibold' }, '🏃 Tussendoor'),
      e('div', { className: 'flex flex-col' },
        quickGroups(quickOpen).map(function (g) {
          if (!g.items.length) return null;
          var rows = [];
          if (quickHasStores) rows.push(heading(g.store || 'Geen vaste winkel'));
          g.items.forEach(function (x) { rows.push(rowEl(extraKey(x), x.text, null, false, function () { toggleExtra(x); }, function () { removeExtra(x); }, null, null)); });
          return e('div', { key: 'qg-' + g.store, className: 'flex flex-col' }, rows);
        }),
        quickDone.length ? doneHeader('qdone-h', quickDone.length) : null,
        quickDone.length && doneOpen ? quickDone.map(function (x) { return rowEl(extraKey(x), x.text + (x.store ? ' (' + x.store + ')' : ''), null, true, function () { toggleExtra(x); }, function () { removeExtra(x); }, null, null); }) : null,
        quickDone.length && doneOpen ? e('button', { key: 'q-clear', onClick: function () { clearDoneExtras('quick'); }, className: 'text-xs font-medium text-left pt-1 pb-1', style: { color: 'var(--danger)' } }, 'Afgevinkte verwijderen') : null
      )
    ) : null,
    (otherExtras.length) ? e(Card, { className: 'p-3.5' },
      e('div', { className: 'text-sm font-semibold' }, '🧴 Drogist en overig'),
      e('div', { className: 'flex flex-col' },
        extraOpenGroups.map(function (g) {
          if (!g.items.length) return null;
          var rows = [];
          if (extraHasStores) rows.push(heading(g.store || 'Overig'));
          g.items.forEach(function (x) { rows.push(rowEl(extraKey(x), x.text, null, false, function () { toggleExtra(x); }, function () { removeExtra(x); }, null, null)); });
          return e('div', { key: 'xg-' + g.store, className: 'flex flex-col' }, rows);
        }),
        doneExtras.length ? doneHeader('xdone-h', doneExtras.length) : null,
        doneExtras.length && doneOpen ? doneExtras.map(function (x) { return rowEl(extraKey(x), x.text + (x.store ? ' (' + x.store + ')' : ''), null, true, function () { toggleExtra(x); }, function () { removeExtra(x); }, null, null); }) : null,
        doneExtras.length && doneOpen ? e('button', { key: 'x-clear', onClick: function () { clearDoneExtras('other'); }, className: 'text-xs font-medium text-left pt-1 pb-1', style: { color: 'var(--danger)' } }, 'Afgevinkte verwijderen') : null
      )
    ) : null,
    hidden.length ? e(Card, { className: 'p-3.5' },
      e('button', { onClick: function () { setShowHidden(!showHidden); }, className: 'w-full flex items-center justify-between text-sm font-medium', style: { color: 'var(--text-secondary)' } },
        e('span', {}, '🏠 Thuis (' + hidden.length + ' verborgen)'),
        e('span', { className: 'text-xs' }, showHidden ? 'Verberg' : 'Toon')
      ),
      showHidden ? e('div', { className: 'flex flex-col mt-1' }, hidden.map(function (it) {
        return e('div', { key: 'hid-' + it.key, className: 'flex items-center gap-3 py-2' },
          e('div', { className: 'flex-1 min-w-0' },
            e('div', { className: 'text-sm' }, it.text),
            e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, (it.permHome ? 'altijd thuis' : '') + (it.permHome && it.weekHome ? ' en ' : '') + (it.weekHome ? 'deze week thuis' : ''))
          ),
          e('button', { onClick: function () { backOnList(it); }, className: 'text-xs font-medium shrink-0', style: { color: 'var(--slate)' } }, 'Terug op lijst')
        );
      })) : null
    ) : null,
    e(Button, { variant: 'ghost', onClick: copyList, disabled: empty }, copied ? '✓ Gekopieerd' : 'Kopieer lijst'),
    sheetItem ? e(ProductModal, { item: sheetItem, onClose: function () { setSheetKey(null); },
      onStore: function (st) { saveProduct(sheetItem.key, { store: st }); },
      onHomeWeek: function () { persist(checkedKeys, extras, home.concat([sheetItem.key])); setSheetKey(null); },
      onHomeAlways: function () { saveProduct(sheetItem.key, { atHome: true }); setSheetKey(null); } }) : null
  );
}

function LibraryView(props) {
  var meals = props.meals.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  return e('div', { className: 'flex flex-col gap-2' },
    e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Je eigen maaltijden met hun standaard boodschappen. Bij het plannen kies je hieruit en kun je de boodschappen voor die dag nog aanpassen.'),
    e(Button, { onClick: props.onNew, className: 'w-full' }, '+ Nieuwe maaltijd'),
    !meals.length ? e('p', { className: 'text-sm text-center py-4', style: { color: 'var(--text-tertiary)' } }, 'Nog geen maaltijden.') : null,
    meals.map(function (m) {
      return e(Card, { key: m.id, onClick: function () { props.onEdit(m); }, className: 'p-3.5 cursor-pointer' },
        e('div', { className: 'text-sm font-semibold' }, m.name),
        (m.ingredients && m.ingredients.length) ? e('div', { className: 'text-xs truncate', style: { color: 'var(--text-tertiary)' } }, m.ingredients.join(', ')) : e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Geen boodschappen ingevuld')
      );
    })
  );
}

export function MealsTab(props) {
  var s = props.state;
  var meals = s.meals || [];
  var plan = s.mealPlan || [];
  var shoppingRows = s.mealShopping || [];
  var stView = useState('plan'); var view = stView[0], setView = stView[1];
  var stMonday = useState(defaultMonday()); var monday = stMonday[0], setMonday = stMonday[1];
  var stDay = useState(null); var openDay = stDay[0], setOpenDay = stDay[1];
  var stMeal = useState(null); var mealModal = stMeal[0], setMealModal = stMeal[1]; // null | 'new' | meal
  var freezerNames = [];
  plan.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).forEach(function (x) {
    if (x.kind === 'freezer' && x.name && freezerNames.every(function (n) { return n.toLowerCase() !== x.name.toLowerCase(); })) freezerNames.push(x.name);
  });
  var openItem = openDay ? plan.find(function (x) { return x.date === openDay; }) || null : null;

  function copyPrevWeek() {
    var prev = addDays(monday, -7);
    for (var i = 0; i < 7; i++) {
      var from = plan.find(function (x) { return x.date === addDays(prev, i); });
      var target = addDays(monday, i);
      var has = plan.some(function (x) { return x.date === target; });
      if (from && !has) props.saveMealDay(Object.assign({}, from, { id: uid(), date: target }));
    }
  }
  function clearWeek() {
    for (var i = 0; i < 7; i++) {
      var d = addDays(monday, i);
      if (plan.some(function (x) { return x.date === d; })) props.clearMealDay(d);
    }
  }
  function saveDay(entry, lib) {
    props.saveMealDay(entry);
    if (lib && lib.saveNew) props.addMeal({ id: uid(), name: entry.name, ingredients: entry.ingredients });
    if (lib && lib.updateExisting) props.updateMeal(Object.assign({}, lib.updateExisting, { name: entry.name, ingredients: entry.ingredients }));
    setOpenDay(null);
  }

  return e('div', { className: 'flex flex-col gap-4' },
    e('h2', { className: 'font-display text-xl font-semibold text-center' }, 'Avondeten'),
    e(SegTabs, { value: view, onChange: setView, options: [{ value: 'plan', label: 'Planning' }, { value: 'shop', label: 'Boodschappen' }, { value: 'meals', label: 'Maaltijden' }] }),
    view !== 'meals' ? e('div', { className: 'flex items-center justify-between' },
      e('button', { onClick: function () { setMonday(addDays(monday, -7)); }, className: 'w-8 h-8 rounded-full', style: { background: 'var(--bg-elevated)' } }, '←'),
      e('div', { className: 'text-sm font-semibold' }, 'Week ' + isoWeekNumber(monday) + ' · ' + formatDateShort(monday) + ' t/m ' + formatDateShort(addDays(monday, 6))),
      e('button', { onClick: function () { setMonday(addDays(monday, 7)); }, className: 'w-8 h-8 rounded-full', style: { background: 'var(--bg-elevated)' } }, '→')
    ) : null,
    view === 'plan' ? e('div', { className: 'flex items-center justify-between -mt-2' },
      e('button', { onClick: copyPrevWeek, className: 'text-xs font-medium', style: { color: 'var(--slate)' } }, '📄 Vul lege dagen met vorige week'),
      e(KebabMenu, { actions: [{ label: 'Wis deze week', danger: true, confirm: true, onClick: clearWeek }] })
    ) : null,
    view === 'plan' ? e(PlanView, { monday: monday, plan: plan, onOpenDay: setOpenDay }) : null,
    view === 'shop' ? e(ShoppingView, { key: monday, monday: monday, plan: plan, shopping: shoppingRows.find(function (r) { return r.week === monday; }), products: s.mealProducts || [], onSave: props.saveShopping, onSaveProducts: props.saveProducts, onSaveDay: props.saveMealDay,
      quickItems: ((shoppingRows.find(function (r) { return r.week === QUICK_WEEK; }) || {}).extras) || [],
      onSaveQuick: function (items) { props.saveShopping(QUICK_WEEK, [], items, []); } }) : null,
    view === 'meals' ? e(LibraryView, { meals: meals, onNew: function () { setMealModal('new'); }, onEdit: function (m) { setMealModal(m); } }) : null,
    openDay ? e(DinnerModal, { key: openDay, date: openDay, item: openItem, meals: meals, defaultGuests: lastGuests(plan), freezerNames: freezerNames.slice(0, 8), onClose: function () { setOpenDay(null); },
      onSave: saveDay, onClear: function (d) { props.clearMealDay(d); setOpenDay(null); } }) : null,
    mealModal ? e(MealEditModal, { meal: mealModal === 'new' ? null : mealModal, onClose: function () { setMealModal(null); },
      onSave: function (m) { if (mealModal === 'new') props.addMeal(m); else props.updateMeal(m); setMealModal(null); },
      onDelete: function (id) { props.deleteMeal(id); setMealModal(null); } }) : null
  );
}
