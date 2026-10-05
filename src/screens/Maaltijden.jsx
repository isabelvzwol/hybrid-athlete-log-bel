/* ---------------- Eten-tab (avondeten per week) ----------------
   Op zondag het avondeten voor de week samenstellen. Per dag kies je: koken
   (uit je eigen maaltijden of een nieuwe), uit eten, of niet thuis. De
   ingrediënten van een geplande maaltijd zijn een kopie: je kunt ze voor die
   ene dag aanpassen (bv. sperziebonen i.p.v. snijbonen) zonder je bewaarde
   maaltijd te veranderen. Uit alle geplande maaltijden van de week rolt een
   boodschappenlijst. Hoeveelheden worden niet bijgehouden: een ingrediënt is
   gewoon een regel tekst. */
import React, { useState } from 'react';
import { Card, Button, Field, TextInput, Modal, SegTabs, ConfirmInline, KebabMenu } from '../components/ui.jsx';
import { uid, getMonday, todayISO, addDays, formatDateShort, isoWeekNumber, WEEKDAYS_FULL, toDate } from '../lib/helpers.js';
var e = React.createElement;

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
  var stKind = useState(item ? item.kind : 'meal'); var kind = stKind[0], setKind = stKind[1];
  var stName = useState(item && item.kind === 'meal' ? item.name || '' : ''); var name = stName[0], setName = stName[1];
  var stIng = useState(item && item.kind === 'meal' ? (item.ingredients || []).join('\n') : ''); var ingText = stIng[0], setIngText = stIng[1];
  var stPersons = useState(item && item.persons ? item.persons : 2); var persons = stPersons[0], setPersons = stPersons[1];
  var stNote = useState(item && item.kind !== 'meal' ? item.note || '' : ''); var note = stNote[0], setNote = stNote[1];
  var stQuery = useState(''); var query = stQuery[0], setQuery = stQuery[1];
  var stMealId = useState(item ? item.mealId || null : null); var mealId = stMealId[0], setMealId = stMealId[1];
  var stLib = useState(null); var libOverride = stLib[0], setLibOverride = stLib[1];

  var q = query.trim().toLowerCase();
  var matches = meals.filter(function (m) { return !q || m.name.toLowerCase().indexOf(q) !== -1; }).slice(0, q ? 20 : 8);
  var trimmedName = name.trim();
  var matchMeal = trimmedName ? meals.find(function (m) { return m.name.toLowerCase() === trimmedName.toLowerCase(); }) : null;
  var libChecked = libOverride !== null ? libOverride : !matchMeal;

  function pick(m) { setName(m.name); setIngText((m.ingredients || []).join('\n')); setMealId(m.id); setLibOverride(null); setQuery(''); }
  function save() {
    if (kind === 'meal' && !trimmedName) return;
    var entry = {
      id: item ? item.id : uid(), date: props.date, kind: kind,
      mealId: kind === 'meal' ? (matchMeal ? matchMeal.id : mealId) : null,
      name: kind === 'meal' ? trimmedName : '',
      ingredients: kind === 'meal' ? parseLines(ingText) : [],
      persons: kind === 'meal' ? persons : null,
      note: kind === 'meal' ? '' : note.trim()
    };
    props.onSave(entry, kind === 'meal' ? { saveNew: !matchMeal && libChecked, updateExisting: (matchMeal && libChecked) ? matchMeal : null } : null);
  }

  return e(Modal, { title: 'Avondeten ' + dayLabel(props.date).toLowerCase(), onClose: props.onClose },
    e('div', { className: 'flex flex-col gap-3' },
      e(SegTabs, { value: kind, onChange: setKind, options: [{ value: 'meal', label: '🍳 Koken' }, { value: 'out', label: '🍽️ Uit eten' }, { value: 'skip', label: '🚫 Niet thuis' }] }),
      kind === 'meal' ? e('div', { className: 'flex flex-col gap-3' },
        meals.length ? e('div', { className: 'flex flex-col gap-2' },
          e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, 'Kies uit je eigen maaltijden'),
          meals.length > 6 ? e(TextInput, { placeholder: 'Zoek in je maaltijden', value: query, onChange: function (ev) { setQuery(ev.target.value); } }) : null,
          e('div', { className: 'flex gap-2 flex-wrap' }, matches.map(function (m) {
            var active = matchMeal && matchMeal.id === m.id;
            return e('button', { key: m.id, onClick: function () { pick(m); }, className: 'rounded-full px-3 py-1.5 text-xs font-medium',
              style: active ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, m.name);
          })),
          !matches.length ? e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Geen maaltijd gevonden.') : null
        ) : e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'Je hebt nog geen eigen maaltijden. Vul hieronder een maaltijd in en bewaar hem voor de volgende keer.'),
        e(Field, { label: 'Maaltijd' }, e(TextInput, { value: name, onChange: function (ev) { setName(ev.target.value); }, placeholder: 'bv. Stamppot met snijbonen' })),
        e(Field, { label: 'Boodschappen voor deze maaltijd (één per regel)' }, e('textarea', { rows: 5, value: ingText, onChange: function (ev) { setIngText(ev.target.value); }, placeholder: 'snijbonen\naardappelen\nrookworst' })),
        e('p', { className: 'text-xs -mt-1', style: { color: 'var(--text-tertiary)' } }, 'Dit geldt alleen voor deze dag. Wissel je sperziebonen voor snijbonen, dan blijft je bewaarde maaltijd gewoon staan.'),
        e('div', { className: 'flex items-center justify-between rounded-xl px-3 py-2', style: { background: 'var(--bg-inset)' } },
          e('span', { className: 'text-sm' }, 'Aantal personen'),
          e('div', { className: 'flex items-center gap-3' },
            e('button', { onClick: function () { setPersons(Math.max(1, persons - 1)); }, className: 'w-8 h-8 rounded-full', style: { background: 'var(--bg-elevated)' } }, '−'),
            e('span', { className: 'font-display text-base font-semibold w-4 text-center' }, persons),
            e('button', { onClick: function () { setPersons(Math.min(12, persons + 1)); }, className: 'w-8 h-8 rounded-full', style: { background: 'var(--bg-elevated)' } }, '+')
          )
        ),
        trimmedName ? e('button', { onClick: function () { setLibOverride(!libChecked); }, className: 'flex items-center gap-2 text-left' },
          e('span', { className: 'w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0', style: libChecked ? { background: 'var(--sage)', color: '#12180F' } : { border: '1.5px solid var(--border)' } }, libChecked ? '✓' : ''),
          e('span', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, matchMeal ? 'Pas ook mijn bewaarde maaltijd "' + matchMeal.name + '" aan' : 'Bewaar in mijn maaltijden')
        ) : null
      ) : e(Field, { label: kind === 'out' ? 'Waar? (optioneel)' : 'Reden (optioneel)' },
        e(TextInput, { value: note, onChange: function (ev) { setNote(ev.target.value); }, placeholder: kind === 'out' ? 'bv. Pizzeria met Sanne' : 'bv. Sporten en eten bij vrienden' })),
      e('div', { className: 'flex gap-2 mt-1' },
        e(Button, { className: 'flex-1', onClick: save, disabled: kind === 'meal' && !trimmedName }, 'Opslaan'),
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
      } else if (item.kind === 'out') {
        body = e('div', {},
          e('div', { className: 'text-sm font-semibold' }, '🍽️ Uit eten'),
          item.note ? e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, item.note) : null
        );
      } else if (item.kind === 'skip') {
        body = e('div', {},
          e('div', { className: 'text-sm font-semibold' }, '🚫 Niet thuis'),
          item.note ? e('div', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, item.note) : null
        );
      } else {
        body = e('div', {},
          e('div', { className: 'flex items-center gap-2' },
            e('span', { className: 'text-sm font-semibold' }, item.name),
            item.persons ? e('span', { className: 'text-xs rounded-full px-2 py-0.5', style: { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, item.persons + ' pers.') : null
          ),
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

function ShoppingView(props) {
  var monday = props.monday;
  var row = props.shopping || { checked: [], extras: [] };
  var items = weekIngredients(props.plan, monday);
  var stNew = useState(''); var newText = stNew[0], setNewText = stNew[1];
  var stCopied = useState(false); var copied = stCopied[0], setCopied = stCopied[1];
  var checkedSet = {};
  (row.checked || []).forEach(function (k) { checkedSet[k] = true; });
  var extras = row.extras || [];

  function persist(checkedKeys, nextExtras) { props.onSave(monday, checkedKeys, nextExtras); }
  function toggleItem(key) {
    var next = (row.checked || []).slice();
    var i = next.indexOf(key);
    if (i === -1) next.push(key); else next.splice(i, 1);
    persist(next, extras);
  }
  function toggleExtra(id) { persist(row.checked || [], extras.map(function (x) { return x.id === id ? Object.assign({}, x, { checked: !x.checked }) : x; })); }
  function removeExtra(id) { persist(row.checked || [], extras.filter(function (x) { return x.id !== id; })); }
  function addExtra() {
    var t = newText.trim();
    if (!t) return;
    persist(row.checked || [], extras.concat([{ id: uid(), text: t, checked: false }]));
    setNewText('');
  }
  function resetChecks() { persist([], extras.map(function (x) { return Object.assign({}, x, { checked: false }); })); }
  function copyList() {
    var lines = [];
    items.forEach(function (it) { if (!checkedSet[it.key]) lines.push('- ' + it.text); });
    extras.forEach(function (x) { if (!x.checked) lines.push('- ' + x.text); });
    var text = 'Boodschappen week ' + isoWeekNumber(monday) + ':\n' + lines.join('\n');
    try {
      navigator.clipboard.writeText(text).then(function () { setCopied(true); setTimeout(function () { setCopied(false); }, 2000); }).catch(function () {});
    } catch (err) { /* kopiëren niet beschikbaar op dit apparaat */ }
  }

  function rowEl(key, text, sub, checked, onToggle, onRemove) {
    return e('div', { key: key, className: 'flex items-center gap-3 py-2' },
      e('button', { onClick: onToggle, className: 'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
        style: checked ? { background: 'var(--sage)', color: '#12180F' } : { border: '1.5px solid var(--border)' } }, checked ? '✓' : ''),
      e('div', { className: 'flex-1 min-w-0' },
        e('div', { className: 'text-sm', style: checked ? { textDecoration: 'line-through', color: 'var(--text-tertiary)' } : {} }, text),
        sub ? e('div', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, sub) : null
      ),
      onRemove ? e('button', { onClick: onRemove, className: 'text-xs shrink-0', style: { color: 'var(--danger)' } }, '✕') : null
    );
  }

  var open = items.filter(function (it) { return !checkedSet[it.key]; });
  var done = items.filter(function (it) { return checkedSet[it.key]; });
  var openExtras = extras.filter(function (x) { return !x.checked; });
  var doneExtras = extras.filter(function (x) { return x.checked; });
  var empty = !items.length && !extras.length;

  return e('div', { className: 'flex flex-col gap-3' },
    e('p', { className: 'text-xs', style: { color: 'var(--text-tertiary)' } }, 'De lijst komt uit je geplande maaltijden en past zich aan als je de planning wijzigt. Wil je een ingrediënt wisselen, pas dat dan aan bij de maaltijd van die dag.'),
    e(Card, { className: 'p-3.5' },
      empty ? e('div', { className: 'text-sm py-2', style: { color: 'var(--text-tertiary)' } }, 'Nog niets te kopen. Plan eerst maaltijden met boodschappen, of voeg hieronder zelf iets toe.') : null,
      e('div', { className: 'flex flex-col', style: { } },
        open.map(function (it) { return rowEl('i-' + it.key, it.text, it.days.join(', '), false, function () { toggleItem(it.key); }); }),
        openExtras.map(function (x) { return rowEl('x-' + x.id, x.text, 'extra', false, function () { toggleExtra(x.id); }, function () { removeExtra(x.id); }); }),
        (done.length || doneExtras.length) ? e('div', { className: 'text-xs pt-2 pb-1', style: { color: 'var(--text-tertiary)' } }, 'Al in het mandje') : null,
        done.map(function (it) { return rowEl('i-' + it.key, it.text, null, true, function () { toggleItem(it.key); }); }),
        doneExtras.map(function (x) { return rowEl('x-' + x.id, x.text, null, true, function () { toggleExtra(x.id); }, function () { removeExtra(x.id); }); })
      )
    ),
    e('div', { className: 'flex gap-2' },
      e(TextInput, { placeholder: 'Extra boodschap (bv. wc-papier)', value: newText, onChange: function (ev) { setNewText(ev.target.value); }, onKeyDown: function (ev) { if (ev.key === 'Enter') addExtra(); } }),
      e(Button, { variant: 'ghost', onClick: addExtra }, '+ Toevoegen')
    ),
    e('div', { className: 'flex gap-2' },
      e(Button, { variant: 'ghost', className: 'flex-1', onClick: copyList, disabled: empty }, copied ? '✓ Gekopieerd' : 'Kopieer lijst'),
      e(Button, { variant: 'ghost', onClick: resetChecks, disabled: !(row.checked || []).length && !extras.some(function (x) { return x.checked; }) }, 'Vinkjes wissen')
    )
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
    view === 'shop' ? e(ShoppingView, { key: monday, monday: monday, plan: plan, shopping: shoppingRows.find(function (r) { return r.week === monday; }), onSave: props.saveShopping }) : null,
    view === 'meals' ? e(LibraryView, { meals: meals, onNew: function () { setMealModal('new'); }, onEdit: function (m) { setMealModal(m); } }) : null,
    openDay ? e(DinnerModal, { key: openDay, date: openDay, item: openItem, meals: meals, onClose: function () { setOpenDay(null); },
      onSave: saveDay, onClear: function (d) { props.clearMealDay(d); setOpenDay(null); } }) : null,
    mealModal ? e(MealEditModal, { meal: mealModal === 'new' ? null : mealModal, onClose: function () { setMealModal(null); },
      onSave: function (m) { if (mealModal === 'new') props.addMeal(m); else props.updateMeal(m); setMealModal(null); },
      onDelete: function (id) { props.deleteMeal(id); setMealModal(null); } }) : null
  );
}
