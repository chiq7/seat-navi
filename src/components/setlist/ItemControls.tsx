type Props = {
  index: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
};

export function ItemControls({ index, total, onUp, onDown, onRemove }: Props) {
  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={onUp}
        disabled={index === 0}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors disabled:opacity-20 active:bg-gray-100"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={index === total - 1}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors disabled:opacity-20 active:bg-gray-100"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-300 transition-colors active:bg-red-50 active:text-red-400"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
