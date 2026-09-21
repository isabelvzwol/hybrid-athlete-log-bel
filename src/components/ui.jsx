/* ---------------- ui primitives ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html (zelfde
   React.createElement-stijl, nu als losse module i.p.v. inline script). */
import React, { useState, useEffect, useRef } from 'react';
var e = React.createElement;

export function Badge(props) {
  var tone = props.tone || 'slate';
  var map = { sage: ['var(--sage-bg)', 'var(--sage-strong)'], amber: ['var(--amber-bg)', 'var(--amber)'], slate: ['var(--slate-bg)', 'var(--slate)'], danger: ['var(--danger-bg)', 'var(--danger)'], teal: ['var(--teal-bg)', 'var(--teal)'], coral: ['var(--coral-bg)', 'var(--coral)'] };
  var c = map[tone];
  return e('span', { className: 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', style: { background: c[0], color: c[1] } }, props.children);
}
export function Card(props) {
  return e('div', { className: (props.className || '') + ' rounded-2xl', style: { background: 'var(--bg-card)', border: '1px solid var(--border-soft)' }, onClick: props.onClick }, props.children);
}
export function Button(props) {
  var variant = props.variant || 'primary';
  var base = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-40';
  var style = {};
  if (variant === 'primary') style = { background: 'var(--sage)', color: '#12180F' };
  else if (variant === 'ghost') style = { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' };
  else if (variant === 'amber') style = { background: 'var(--amber)', color: '#1A1206' };
  else if (variant === 'danger') style = { background: 'var(--danger-bg)', color: 'var(--danger)' };
  else if (variant === 'text') { base = 'inline-flex items-center gap-1 text-sm font-medium'; style = { color: 'var(--slate)' }; }
  return e('button', { type: props.type || 'button', className: base + ' ' + (props.className || ''), style: style, onClick: props.onClick, disabled: props.disabled }, props.children);
}
export function Field(props) {
  return e('label', { className: 'block' },
    e('div', { className: 'text-xs mb-1.5', style: { color: 'var(--text-secondary)' } }, props.label),
    props.children
  );
}
export function TextInput(props) {
  return e('input', Object.assign({ type: props.type || 'text' }, props, { className: undefined, label: undefined }));
}
export function Modal(props) {
  return e('div', { className: 'fixed inset-0 z-50 flex items-end sm:items-center justify-center', style: { background: 'rgba(0,0,0,0.55)' }, onClick: props.onClose },
    e('div', {
      className: 'sheet-in w-full sm:max-w-md max-h-[88vh] overflow-y-auto scrollbar-none rounded-t-3xl sm:rounded-3xl p-5',
      style: { background: 'var(--bg-card)', border: '1px solid var(--border)' },
      onClick: function (ev) { ev.stopPropagation(); }
    },
      e('div', { className: 'flex items-center justify-between mb-4' },
        e('h3', { className: 'font-display text-lg font-semibold' }, props.title),
        e('button', { onClick: props.onClose, className: 'w-8 h-8 rounded-full flex items-center justify-center', style: { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' } }, '✕')
      ),
      props.children
    )
  );
}
export function SegTabs(props) {
  return e('div', { className: 'flex rounded-xl p-1 gap-1', style: { background: 'var(--bg-inset)' } },
    props.options.map(function (opt) {
      var active = opt.value === props.value;
      return e('button', {
        key: opt.value, onClick: function () { props.onChange(opt.value); },
        className: 'flex-1 rounded-lg py-2 text-sm font-medium transition-colors',
        style: active ? { background: 'var(--sage-bg)', color: 'var(--sage-strong)' } : { color: 'var(--text-secondary)' }
      }, opt.label);
    })
  );
}
export function ConfirmInline(props) {
  var st = useState(false); var confirming = st[0], setConfirming = st[1];
  if (!confirming) return e(Button, { variant: 'danger', onClick: function () { setConfirming(true); } }, props.label || 'Verwijderen');
  return e('div', { className: 'flex items-center gap-2' },
    e('span', { className: 'text-xs', style: { color: 'var(--text-secondary)' } }, 'Zeker weten?'),
    e(Button, { variant: 'danger', onClick: function () { props.onConfirm(); setConfirming(false); } }, 'Ja, verwijder'),
    e(Button, { variant: 'ghost', onClick: function () { setConfirming(false); } }, 'Annuleer')
  );
}
export function KebabMenu(props) {
  var st = useState(false); var open = st[0], setOpen = st[1];
  var st2 = useState(null); var confirmingIdx = st2[0], setConfirmingIdx = st2[1];
  var ref = useRef(null);
  useEffect(function () {
    if (!open) return;
    function onDocClick(ev) { if (ref.current && !ref.current.contains(ev.target)) { setOpen(false); setConfirmingIdx(null); } }
    document.addEventListener('click', onDocClick);
    return function () { document.removeEventListener('click', onDocClick); };
  }, [open]);
  return e('div', { className: 'relative shrink-0', ref: ref, onClick: function (ev) { ev.stopPropagation(); } },
    e('button', { onClick: function () { setOpen(!open); setConfirmingIdx(null); }, className: 'w-7 h-7 rounded-full flex items-center justify-center text-lg', style: { color: 'var(--text-tertiary)' } }, '⋯'),
    open ? e('div', { className: 'absolute right-0 top-8 z-20 rounded-xl overflow-hidden', style: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', minWidth: '160px' } },
      props.actions.map(function (a, i) {
        var isConfirming = confirmingIdx === i;
        return e('button', {
          key: i,
          onClick: function () {
            if (a.confirm && !isConfirming) { setConfirmingIdx(i); return; }
            setOpen(false); setConfirmingIdx(null); a.onClick();
          },
          className: 'w-full text-left px-3.5 py-2.5 text-sm block',
          style: { color: (a.danger || isConfirming) ? 'var(--danger)' : 'var(--text-primary)', borderTop: i > 0 ? '1px solid var(--border-soft)' : 'none' }
        }, isConfirming ? 'Bevestig verwijderen' : a.label);
      })
    ) : null
  );
}
