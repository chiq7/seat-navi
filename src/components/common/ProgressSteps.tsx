type ProgressStepsProps = {
  steps: readonly string[];
  currentStep: number;
  className?: string;
};

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <ol
      className={`flex items-start px-1 py-3 ${className ?? ""}`}
      aria-label={`入力ステップ ${currentStep + 1}/${steps.length}`}
    >
      {steps.map((label, index) => {
        const isDone = index < currentStep;
        const isCurrent = index === currentStep;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-start last:flex-none">
            <div className="flex min-w-[34px] flex-col items-center gap-1.5">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`grid size-7 place-items-center rounded-full border text-[10px] font-black ${
                  isDone || isCurrent
                    ? "border-[#ef4f87] bg-[#ef4f87] text-white"
                    : "border-[#e5d8df] bg-white text-[#a2939b]"
                }`}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <span className={`whitespace-nowrap text-[9px] font-bold ${isCurrent ? "text-[#d64175]" : "text-[#8d7f87]"}`}>
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <span className={`mt-3.5 h-px flex-1 ${index < currentStep ? "bg-[#ef4f87]" : "bg-[#e5d8df]"}`} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
