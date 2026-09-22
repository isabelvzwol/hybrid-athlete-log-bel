/* ---------------- Wekelijkse backup-mail ----------------
   Dit script draait NIET in de app zelf, maar in een GitHub Action
   (.github/workflows/weekly-backup.yml) op een vast schema. Het haalt alle
   tabellen rechtstreeks op met de "service role key" (die omzeilt Row Level
   Security, want dit script logt niet in als gebruiker) en mailt het
   resultaat als JSON-bijlage via Resend.

   Let op: dit bestand bevat GEEN sleutels. Alles komt uit environment
   variabelen die de GitHub Action meegeeft vanuit de repo-secrets. Zie
   README.md voor de setup-stappen (welke secrets aangemaakt moeten worden).

   Het formaat van deze backup is een rechtstreekse kopie van de
   database-tabellen (dus met de kolomnamen zoals in supabase/schema.sql,
   niet de camelCase-vorm die de app intern gebruikt). Dat is bewust: zo is
   deze backup altijd een getrouwe, direct in Supabase terug te zetten
   momentopname, ook als de app-code ooit verandert. Voor een dagelijkse
   handmatige backup in het exacte app-formaat kan nog steeds de knop
   "Backup downloaden (JSON)" in Instellingen gebruikt worden. */

import { createClient } from '@supabase/supabase-js';

var SUPABASE_URL = process.env.SUPABASE_URL;
var SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
var USER_ID = process.env.SUPABASE_USER_ID;
var RESEND_API_KEY = process.env.RESEND_API_KEY;
var BACKUP_TO_EMAIL = process.env.BACKUP_TO_EMAIL;
var BACKUP_FROM_EMAIL = process.env.BACKUP_FROM_EMAIL || 'Hybrid Athlete Log <onboarding@resend.dev>';

var REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_USER_ID', 'RESEND_API_KEY', 'BACKUP_TO_EMAIL'];
var missing = REQUIRED_VARS.filter(function (name) { return !process.env[name]; });
if (missing.length) {
  console.error('Ontbrekende environment variabelen: ' + missing.join(', '));
  console.error('Zet deze als GitHub Actions secrets (zie README.md).');
  process.exit(1);
}

var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

var TABLES = [
  'races',
  'schedule_entries',
  'strength_logs',
  'strength_templates',
  'hyrox_library',
  'hyrox_logs',
  'hyrox_race_results',
  'run_race_results',
  'endurance_logs',
  'mood_logs',
  'complaint_logs',
  'body_weight_logs',
  'triathlon_checklist_items',
];

async function fetchTable(table) {
  var res = await supabase.from(table).select('*').eq('user_id', USER_ID);
  if (res.error) {
    throw new Error('Fout bij ophalen van "' + table + '": ' + res.error.message);
  }
  return res.data;
}

async function sendBackupMail(filename, jsonText, totalRows, dateLabel) {
  var attachmentBase64 = Buffer.from(jsonText, 'utf-8').toString('base64');

  var response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: BACKUP_FROM_EMAIL,
      to: BACKUP_TO_EMAIL,
      subject: 'Hybrid Athlete Log - wekelijkse backup (' + dateLabel + ')',
      html:
        '<p>Automatische wekelijkse backup van je Hybrid Athlete Log.</p>' +
        '<p>Datum: ' + dateLabel + '<br>Totaal aantal rijen: ' + totalRows + '</p>' +
        '<p>Bewaar dit bestand ergens veilig (bv. een map in Google Drive). ' +
        'Bij herstel: geef dit JSON-bestand aan Claude en vraag om het terug te zetten in Supabase.</p>',
      attachments: [{ filename: filename, content: attachmentBase64 }],
    }),
  });

  if (!response.ok) {
    var errorText = await response.text();
    throw new Error('E-mail versturen mislukt (status ' + response.status + '): ' + errorText);
  }
}

async function main() {
  var createdAt = new Date().toISOString();
  var dateLabel = createdAt.slice(0, 10);

  var backup = { createdAt: createdAt, tables: {} };
  var totalRows = 0;

  for (var i = 0; i < TABLES.length; i++) {
    var table = TABLES[i];
    var rows = await fetchTable(table);
    backup.tables[table] = rows;
    totalRows += rows.length;
  }

  var jsonText = JSON.stringify(backup, null, 2);
  var filename = 'hybrid-athlete-log-backup-' + dateLabel + '.json';

  await sendBackupMail(filename, jsonText, totalRows, dateLabel);

  console.log('Backup verstuurd naar ' + BACKUP_TO_EMAIL + ' (' + totalRows + ' rijen totaal, bestand ' + filename + ').');
}

main().catch(function (err) {
  console.error('Backup mislukt:', err);
  process.exit(1);
});
