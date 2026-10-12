import rawGeometry from "./tokyoDomeSeatGeometry.json";

export type TokyoDomePoint = readonly [number, number];
export type TokyoDomeDivider = readonly [TokyoDomePoint, TokyoDomePoint];

export type TokyoDomeCBalconyPartition = {
  code: string;
  runId: string;
  /** Exact closed balcony-band outline extracted from the official PDF. */
  bandPath: string;
  /** Exact boundary vectors. Run ends come from the closing edges of bandPath. */
  beforeDivider: TokyoDomeDivider;
  afterDivider: TokyoDomeDivider;
  /** Select the partition containing this official printed-label anchor. */
  selectionPoint: TokyoDomePoint;
  status: "confirmed";
  evidence: "official_pdf_band_path_and_divider_vectors";
};

type BalconyRun = {
  id: string;
  codes: readonly string[];
  startDivider: TokyoDomeDivider;
  endDivider: TokyoDomeDivider;
  dividers: readonly TokyoDomeDivider[];
};

const codeRange = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => `C${String(from + index).padStart(2, "0")}`);

const RUNS: readonly BalconyRun[] = [
  {
    id: "C01-C18",
    codes: codeRange(1, 18),
    startDivider: [[763.2, 107.6], [771.6, 115.9]],
    endDivider: [[887.9, 256.6], [906.2, 249.3]],
    dividers: [
      [[767.8, 111.9], [775.7, 103.8]], [[786.6, 113.2], [777.8, 121.2]],
      [[785.9, 128.7], [801.3, 114.6]], [[793.8, 137.0], [809.6, 122.5]],
      [[801.5, 145.2], [817.3, 131.1]], [[809.0, 153.3], [825.2, 139.4]],
      [[816.9, 161.6], [832.8, 148.3]], [[824.5, 169.5], [839.7, 156.8]],
      [[831.3, 177.7], [846.8, 165.3]], [[838.6, 185.9], [853.6, 173.2]],
      [[845.8, 194.8], [860.6, 182.3]], [[852.7, 203.2], [867.8, 191.2]],
      [[859.7, 211.7], [874.7, 200.0]], [[866.8, 220.6], [881.3, 209.8]],
      [[872.7, 229.2], [887.9, 219.0]], [[878.3, 238.1], [894.5, 229.0]],
      [[883.6, 247.3], [900.5, 238.8]],
    ],
  },
  {
    id: "C19-C32",
    codes: codeRange(19, 32),
    startDivider: [[887.9, 256.6], [906.2, 249.3]],
    endDivider: [[864.4, 397.3], [885.5, 407.0]],
    dividers: [
      [[891.7, 266.4], [910.6, 260.2]], [[894.5, 275.4], [914.0, 271.2]],
      [[896.8, 285.6], [916.0, 283.3]], [[896.8, 296.0], [916.5, 296.0]],
      [[895.6, 306.8], [916.0, 308.5]], [[894.0, 317.9], [914.8, 320.6]],
      [[891.6, 328.0], [912.9, 332.2]], [[888.9, 338.3], [910.3, 343.5]],
      [[885.8, 347.9], [907.5, 354.2]], [[882.5, 357.4], [904.1, 364.7]],
      [[878.7, 367.3], [899.8, 375.4]], [[874.5, 377.0], [895.8, 385.8]],
      [[869.5, 387.5], [890.7, 397.0]],
    ],
  },
  {
    id: "C33-C48",
    codes: codeRange(33, 48),
    startDivider: [[864.4, 397.3], [885.5, 407.0]],
    endDivider: [[761.8, 535.4], [782.1, 551.5]],
    dividers: [
      [[859.1, 406.9], [880.0, 417.3]], [[874.6, 427.0], [853.8, 415.8]],
      [[848.2, 425.0], [868.7, 436.7]], [[842.2, 434.0], [863.0, 445.8]],
      [[836.2, 442.7], [856.6, 455.1]], [[829.9, 451.5], [849.9, 464.7]],
      [[823.5, 460.1], [843.5, 473.2]], [[817.5, 468.6], [837.6, 481.9]],
      [[811.6, 476.2], [831.5, 490.0]], [[805.5, 484.3], [825.0, 498.3]],
      [[798.5, 493.0], [818.0, 507.3]], [[791.0, 501.6], [811.2, 516.0]],
      [[784.0, 510.3], [804.1, 525.0]], [[776.7, 518.9], [796.8, 533.8]],
      [[769.3, 526.8], [789.5, 542.3]],
    ],
  },
  {
    id: "C50-C65",
    codes: codeRange(50, 65),
    startDivider: [[376.4, 551.5], [396.7, 535.4]],
    endDivider: [[272.9, 407.0], [294.1, 397.3]],
    dividers: [
      [[389.2, 526.8], [369.0, 542.3]], [[381.8, 518.9], [361.7, 533.8]],
      [[374.5, 510.3], [354.3, 525.0]], [[367.5, 501.6], [347.3, 516.0]],
      [[360.0, 493.0], [340.5, 507.3]], [[353.0, 484.3], [333.5, 498.3]],
      [[346.9, 476.2], [327.0, 490.0]], [[341.0, 468.6], [320.9, 481.9]],
      [[335.0, 460.1], [314.7, 473.5]], [[328.5, 451.5], [308.6, 464.7]],
      [[322.3, 442.7], [301.9, 455.1]], [[316.3, 434.0], [295.5, 445.8]],
      [[310.3, 425.0], [289.8, 436.7]], [[283.8, 427.0], [304.8, 415.8]],
      [[299.4, 406.9], [278.4, 417.3]],
    ],
  },
  {
    id: "C66-C79",
    codes: codeRange(66, 79),
    startDivider: [[272.9, 407.0], [294.1, 397.3]],
    endDivider: [[252.3, 249.3], [270.5, 256.6]],
    dividers: [
      [[288.9, 387.6], [267.7, 397.0]], [[284.1, 377.0], [262.7, 385.8]],
      [[279.9, 367.3], [258.7, 375.4]], [[276.0, 357.4], [254.4, 364.7]],
      [[272.8, 347.9], [251.0, 354.2]], [[269.7, 338.3], [248.2, 343.5]],
      [[266.9, 328.0], [245.6, 332.2]], [[264.6, 317.9], [243.6, 320.6]],
      [[262.8, 306.8], [242.5, 308.5]], [[261.7, 296.0], [241.9, 296.0]],
      [[261.7, 285.6], [242.5, 283.3]], [[264.0, 275.4], [244.5, 271.2]],
      [[266.8, 266.4], [247.9, 260.2]],
    ],
  },
  {
    id: "C80-C97",
    codes: codeRange(80, 97),
    startDivider: [[252.3, 249.3], [270.5, 256.6]],
    endDivider: [[386.9, 115.9], [395.3, 107.6]],
    dividers: [
      [[274.9, 247.3], [257.9, 238.8]], [[280.2, 238.1], [264.0, 229.0]],
      [[285.8, 229.2], [270.6, 219.0]], [[291.6, 220.6], [277.1, 209.8]],
      [[298.8, 211.7], [283.7, 200.0]], [[305.8, 203.2], [290.7, 191.2]],
      [[312.7, 194.8], [297.9, 182.3]], [[319.9, 185.9], [304.9, 173.2]],
      [[327.2, 177.7], [311.7, 165.3]], [[334.2, 169.8], [318.8, 156.8]],
      [[341.6, 161.6], [326.1, 148.6]], [[349.4, 153.3], [333.2, 139.4]],
      [[357.0, 145.2], [341.2, 131.1]], [[364.7, 137.0], [348.9, 122.5]],
      [[372.6, 128.7], [357.2, 114.6]], [[371.8, 113.2], [380.7, 121.2]],
      [[390.7, 111.9], [382.8, 103.8]],
    ],
  },
];

const sourceSections = new Map(rawGeometry.sections.map((section) => [section.code, section]));

export const TOKYO_DOME_C_BALCONY_PARTITIONS: Record<string, TokyoDomeCBalconyPartition> =
  Object.fromEntries(RUNS.flatMap((run) => {
    if (run.dividers.length !== run.codes.length - 1) {
      throw new Error(`C balcony divider count mismatch: ${run.id}`);
    }
    const bandPath = sourceSections.get(run.codes[0])?.path;
    if (!bandPath) throw new Error(`C balcony band path missing: ${run.id}`);

    return run.codes.map((code, index) => {
      const source = sourceSections.get(code);
      if (!source) throw new Error(`C balcony label missing: ${code}`);
      return [code, {
        code,
        runId: run.id,
        bandPath,
        beforeDivider: index === 0 ? run.startDivider : run.dividers[index - 1],
        afterDivider: index === run.codes.length - 1 ? run.endDivider : run.dividers[index],
        selectionPoint: [source.label[0], source.label[1]] as const,
        status: "confirmed" as const,
        evidence: "official_pdf_band_path_and_divider_vectors" as const,
      }];
    });
  }));

export const TOKYO_DOME_C_BALCONY_RUNS = RUNS;
