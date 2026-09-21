/* WorkoutBlocks wordt zowel in de Hyrox-tab als in de trainingslog-modal
   (Schema/Home) gebruikt - vandaar een gedeelde module. 1-op-1 overgenomen. */
import React from 'react';
import { Badge } from './ui.jsx';
var e = React.createElement;

export function WorkoutBlocks(props) {
  return e('div', { className: 'flex flex-col gap-2 mb-4' },
    props.blocks.map(function (b, i) {
      var isRest = b.movements.length === 0;
      return e('div', { key: i, className: 'rounded-xl p-3', style: { background: isRest ? 'var(--bg-inset)' : 'var(--bg-elevated)', border: '1px solid var(--border-soft)' } },
        e('div', { className: 'flex items-center justify-between mb-1' },
          e('span', { className: 'text-sm font-semibold' }, b.title),
          b.duration ? e(Badge, { tone: isRest ? 'slate' : 'amber' }, b.duration) : null
        ),
        b.movements.length ? e('ul', { className: 'text-xs flex flex-col gap-0.5', style: { color: 'var(--text-secondary)' } },
          b.movements.map(function (m, j) { return e('li', { key: j }, '• ' + m); })
        ) : null
      );
    })
  );
}
