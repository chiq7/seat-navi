import styles from "./VenueGateLabel.module.css";

/** Preserve enumerated gate numbers; never expand a printed range. */
export default function VenueGateLabel({ label }: { label: string }) {
  const match = label.match(/^(?:GATE\s*|ゲート\s*)?(\d+(?:\s*[・･,/]\s*\d+)+)(?:\s*(G|ゲート))?$/i);
  if (!match) return <>{label}</>;
  const numbers = match[1].split(/\s*[・･,/]\s*/);
  return <span className={styles.group}><span className={styles.numbers}>{numbers.map((number,index)=><span key={`${number}-${index}`}>{number}</span>)}</span><span className={styles.unit}>{match[2] ?? "G"}</span></span>;
}
