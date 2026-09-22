/* ---------------- Gezondheid-tab ----------------
   Nieuw tabblad (was niet in het origineel): bundelt klachten & blessures
   (verplaatst vanaf Home) en lichaamsgewicht op één plek, met ruimte om er
   later nog gezondheidsmetrics aan toe te voegen. Stemming blijft bewust op
   Home staan, dat is een losse keuze geweest. */
import React from 'react';
import { ComplaintTracker, ComplaintTrend, BodyWeightTracker } from '../components/health.jsx';
var e = React.createElement;

export function GezondheidTab(props) {
  var s = props.state;
  return e('div', { className: 'flex flex-col gap-5' },
    e(BodyWeightTracker, { bodyWeightLogs: s.bodyWeightLogs, onSave: props.saveBodyWeight, onDelete: props.deleteBodyWeight }),
    e(ComplaintTracker, { complaintLogs: s.complaintLogs, onAdd: props.addComplaint, onDelete: props.deleteComplaint }),
    e(ComplaintTrend, { complaintLogs: s.complaintLogs })
  );
}
