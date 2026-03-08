import { Card } from "@/components/ui/card"

// Принимаем пропсы: заголовок, значение, единицу измерения и иконку (опционально)
export default function MetricCard ({ title, value, unit, icon: Icon }) {
  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/10 overflow-hidden shadow-2xl">
      <div className="!p-5 flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold leading-none">{title}</label>
          {Icon && (<Icon className="w-5 h-5 text-sky-400 opacity-80 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]" />)}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-white drop-shadow-[0_0_12px_rgba(56,189,248,0.7)] tracking-tighter">{value}</span>
          {unit && (<span className="text-xs font-black text-sky-500 uppercase opacity-90 mb-1">{unit}</span>)}
        </div>
      </div>
    </Card>
  );
};
