/* ---------------- eenvoudige svg-grafiekjes ----------------
   1-op-1 overgenomen uit de originele hybrid-athlete-app.html. */
import React from 'react';
import { HR_ZONES, hrZone } from '../lib/constants.js';
import { Badge } from './ui.jsx';
var e = React.createElement;

export function SimpleLineChart(props) {
  var points = props.points;
  if (!points || points.length < 2) return e('p', { className: 'text-xs text-center py-4', style: { color: 'var(--text-tertiary)' } }, 'Nog niet genoeg data voor een grafiek.');
  var w = 300, h = props.height || 110, pad = 10;
  var values = points.map(function (p) { return p.value; });
  var minV = Math.min.apply(null, values), maxV = Math.max.apply(null, values);
  if (minV === maxV) { minV -= 1; maxV += 1; }
  var stepX = (w - 2 * pad) / (points.length - 1);
  function xAt(i) { return pad + i * stepX; }
  function yAt(v) { return h - pad - ((v - minV) / (maxV - minV)) * (h - 2 * pad); }
  var path = points.map(function (p, i) { return (i === 0 ? 'M' : 'L') + xAt(i).toFixed(1) + ',' + yAt(p.value).toFixed(1); }).join(' ');
  return e('div', {},
    e('svg', { viewBox: '0 0 ' + w + ' ' + h, style: { width: '100%', height: h + 'px' } },
      e('path', { d: path, fill: 'none', stroke: props.color || 'var(--sage)', strokeWidth: 2 }),
      points.map(function (p, i) { return e('circle', { key: i, cx: xAt(i), cy: yAt(p.value), r: 2.5, fill: props.color || 'var(--sage)' }); }),
      e('text', { x: pad, y: h - 1, fontSize: '8', fill: 'var(--text-tertiary)' }, points[0].label),
      e('text', { x: w - pad, y: h - 1, fontSize: '8', fill: 'var(--text-tertiary)', textAnchor: 'end' }, points[points.length - 1].label)
    ),
    props.note ? e('p', { className: 'text-[10px] text-center mt-1', style: { color: 'var(--text-tertiary)' } }, props.note) : null
  );
}
export function SimpleBarChart(props) {
  var bars = props.bars;
  if (!bars || !bars.length) return null;
  var h = props.height || 90;
  var maxV = Math.max.apply(null, bars.map(function (b) { return b.value; }).concat([1]));
  return e('div', { className: 'flex items-end gap-1.5', style: { height: h + 'px' } },
    bars.map(function (b, i) {
      var barH = maxV > 0 ? Math.max(2, (b.value / maxV) * (h - 28)) : 2;
      return e('div', { key: i, className: 'flex-1 flex flex-col items-center justify-end gap-1' },
        e('div', { className: 'text-[9px]', style: { color: 'var(--text-tertiary)' } }, b.value > 0 ? b.value.toFixed(0) : ''),
        e('div', { style: { width: '100%', height: barH + 'px', background: props.color || 'var(--sage)', borderRadius: '3px 3px 0 0', minHeight: '2px' } }),
        e('div', { className: 'text-[9px]', style: { color: 'var(--text-tertiary)' } }, b.label)
      );
    })
  );
}
export function HRZoneBadge(props) {
  var z = hrZone(props.hr);
  if (!z) return null;
  return e(Badge, { tone: z.tone }, z.key);
}
export { HR_ZONES };
