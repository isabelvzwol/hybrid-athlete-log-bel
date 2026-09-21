/* ---------------- Login ----------------
   Nieuw onderdeel t.o.v. het origineel (dat geen login had): eenvoudige
   e-mail + wachtwoord aanmelding via Supabase Auth. Er is bewust GEEN
   registratieformulier - dit is een single-user app. Het (enige) account
   maak je eenmalig aan via Supabase Dashboard > Authentication > Users
   (zie README.md). */
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient.js';
import { Card, Button, Field, TextInput } from './components/ui.jsx';
var e = React.createElement;

function LoginScreen() {
  var st = useState({ email: '', password: '' }); var f = st[0], setF = st[1];
  var stErr = useState(''); var error = stErr[0], setError = stErr[1];
  var stBusy = useState(false); var busy = stBusy[0], setBusy = stBusy[1];
  function set(k) { return function (ev) { var v = ev.target.value; setF(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }; }
  function submit(ev) {
    ev.preventDefault();
    setError(''); setBusy(true);
    supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password }).then(function (res) {
      setBusy(false);
      if (res.error) setError(res.error.message === 'Invalid login credentials' ? 'E-mailadres of wachtwoord klopt niet.' : res.error.message);
    });
  }
  return e('div', { className: 'min-h-screen flex items-center justify-center px-4', style: { background: 'var(--bg-app)' } },
    e(Card, { className: 'p-6 w-full max-w-sm' },
      e('div', { className: 'font-display text-lg font-semibold mb-1 text-center' }, 'Hybrid Athlete Log'),
      e('p', { className: 'text-xs text-center mb-5', style: { color: 'var(--text-tertiary)' } }, 'Log in om je trainingsdata te bekijken en bij te werken.'),
      e('form', { onSubmit: submit, className: 'flex flex-col gap-3' },
        e(Field, { label: 'E-mailadres' }, e(TextInput, { type: 'email', required: true, autoComplete: 'username', value: f.email, onChange: set('email') })),
        e(Field, { label: 'Wachtwoord' }, e(TextInput, { type: 'password', required: true, autoComplete: 'current-password', value: f.password, onChange: set('password') })),
        error ? e('p', { className: 'text-xs', style: { color: 'var(--danger)' } }, error) : null,
        e(Button, { type: 'submit', className: 'w-full mt-1', disabled: busy }, busy ? 'Bezig…' : 'Inloggen')
      )
    )
  );
}

export function AuthGate(props) {
  var st = useState(undefined); var session = st[0], setSession = st[1]; // undefined = nog aan het laden
  useEffect(function () {
    supabase.auth.getSession().then(function (res) { setSession(res.data.session); });
    var sub = supabase.auth.onAuthStateChange(function (_event, newSession) { setSession(newSession); });
    return function () { sub.data.subscription.unsubscribe(); };
  }, []);

  if (session === undefined) {
    return e('div', { className: 'min-h-screen flex items-center justify-center', style: { background: 'var(--bg-app)', color: 'var(--text-tertiary)' } }, 'Laden…');
  }
  if (!session) return e(LoginScreen);
  return props.children(session);
}
