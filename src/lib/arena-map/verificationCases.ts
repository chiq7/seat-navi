import type { OracleParameters } from "./referenceValidationV3";

// Fixed before evaluating the joint-search change. This module is used by the
// independent sample generator and preview only; the inference engine never imports it.
export const verificationCases: readonly { id: string; label: string; seed: number; parameters: OracleParameters }[] = [
  { id: "basic", label: "基本配置", seed: 101, parameters: { offset: 0, width: 1, grid: 1 } },
  { id: "compound-a", label: "前寄り・花道幅を変更", seed: 7309, parameters: { offset: -8.1, width: .943, grid: .983, runwayWidth: 1.09, shiftX: -4, rearOffset: 8 } },
  { id: "compound-b", label: "後寄り・横ずれあり", seed: 7309, parameters: { offset: 10.2, width: 1.123, grid: 1.019, runwayWidth: .98, shiftX: 5, rearOffset: -8 } },
  { id: "holdout", label: "新しい完成図", seed: 9341, parameters: { offset: -3.4, width: 1.081, grid: 1.027, runwayWidth: .887, shiftX: 6.7, rearOffset: -10.5 } },
];
