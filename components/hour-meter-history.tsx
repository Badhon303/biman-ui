import { Clock3, History } from "lucide-react";
import type { HourMeterReading } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function getHourMeterHistory(
  history: HourMeterReading[] | undefined,
  currentValue?: number,
): HourMeterReading[] {
  if (history?.length) return history;
  return currentValue !== undefined
    ? [{ id: "current", value: currentValue, recordedAt: "Not dated", recordedBy: "Initial reading" }]
    : [];
}

export function HourMeterHistory({
  history,
  currentValue,
  onView,
}: Readonly<{
  history?: HourMeterReading[];
  currentValue?: number;
  onView?: () => void;
}>) {
  const readings = getHourMeterHistory(history, currentValue);
  const latest = readings[readings.length - 1];

  return (
    <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
            <Clock3 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Hour meter</div>
            <div className="mt-1 text-lg font-semibold">
              {latest ? `${latest.value} hours` : "Not recorded"}
            </div>
          </div>
        </div>
        {onView && (
          <Button type="button" variant="outline" className="px-2.5 py-1.5 text-xs" onClick={onView}>
            <History className="h-4 w-4" />
            View history
          </Button>
        )}
      </div>
      <div className="mt-3 text-xs text-slate-500">
        {readings.length ? `${readings.length} recorded reading${readings.length === 1 ? "" : "s"}` : "No readings recorded"}
      </div>
    </div>
  );
}

export function HourMeterHistoryModal({
  assetNo,
  history,
  currentValue,
  onClose,
}: Readonly<{
  assetNo: string;
  history?: HourMeterReading[];
  currentValue?: number;
  onClose: () => void;
}>) {
  const readings = [...getHourMeterHistory(history, currentValue)].reverse();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600">
              <History className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[.18em]">Hour meter history</span>
            </div>
            <h2 className="mt-2 text-xl font-semibold">{assetNo}</h2>
            <p className="mt-1 text-sm text-slate-500">All recorded hour meter readings, newest first.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-slate-400 hover:text-slate-700"
            aria-label="Close hour meter history"
          >
            ×
          </button>
        </div>
        {readings.length ? (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {readings.map((reading, index) => (
              <div key={reading.id} className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <div className="text-sm font-semibold">{reading.value} hours</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {reading.recordedAt} · {reading.recordedBy}
                  </div>
                </div>
                {index === 0 && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Current
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-32 place-items-center rounded-xl border border-dashed text-sm text-slate-400">
            No hour meter readings recorded
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
