export type TokyoDomeGateAnchor = {
  gate: string;
  /** Label-centre coordinate read directly from the official PDF text vectors. */
  label: { x: number; y: number };
  status: "confirmed";
  evidence: "official_pdf_text_vector";
};

export const TOKYO_DOME_GATE_ANCHORS: readonly TokyoDomeGateAnchor[] = [
  { gate: "GATE 11", label: { x: 339.8, y: 179.5 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 20", label: { x: 859.8, y: 390.2 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 21", label: { x: 749.9, y: 535.1 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 22", label: { x: 580.7, y: 633.3 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 23", label: { x: 414.0, y: 541.3 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 24", label: { x: 300.0, y: 392.8 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 25", label: { x: 696.1, y: 66.2 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 30", label: { x: 846.0, y: 487.4 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 31", label: { x: 674.1, y: 659.3 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 32", label: { x: 494.0, y: 663.8 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 33", label: { x: 314.9, y: 491.6 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 40", label: { x: 821.2, y: 696.8 }, status: "confirmed", evidence: "official_pdf_text_vector" },
  { gate: "GATE 41", label: { x: 336.9, y: 696.1 }, status: "confirmed", evidence: "official_pdf_text_vector" },
];
