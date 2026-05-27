import React from 'react'
import { Card } from "@/components/ui/card"
import { useCameraStore } from "@/store/useCameraStore"

export default function MetricCard({ title, type, unit, icon: Icon, metrics }) {
  const { cameras, activeCamera } = useCameraStore()

  // Твоя функция подбора классов сетки
  const getColumnsClass = () => {
    const count = activeCamera.length
    if (count === 1) return "grid-cols-1"
    if (count === 2 || count === 3 || count === 4) return "grid-cols-1 sm:grid-cols-2"
    return "grid-cols-1"
  }

  // Заглушка, если бэкенд еще не передал данные
  if (!metrics || Object.keys(metrics).length === 0) {
    return (
      <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-2xl p-5 flex flex-col gap-4">
      
        {/* Шапка карточки */}
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold leading-none">{title}</label>
          {Icon && <Icon className="w-5 h-5 text-sky-400 opacity-80" />}
        </div>
        
        <div className="text-center font-mono text-xs text-white/80 font-bold uppercase tracking-wider pt-1">
          Нет данных
        </div>

      </Card>
    )
  }

  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-2xl p-5 flex flex-col gap-4">
      
      {/* Шапка карточки */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">{title}</label>
        {Icon && <Icon className="w-5 h-5 text-sky-400 opacity-80" />}
      </div>

      {/* Сетка строк в круглых скобках без явных return */}
      <div className={`grid gap-2 ${getColumnsClass()}`}>
        {activeCamera.map((ip) => (
          <div key={ip} className="flex justify-between items-center bg-white/[0.02] p-2 rounded-lg border border-white/5 gap-3 font-mono text-xs text-slate-300">
            
            {/* Имя камеры из Zustand */}
            <span className="truncate max-w-[120px]">
              {cameras.find(cam => cam.ip === ip)?.name || ip}
            </span>
            
            {/* Значение метрики с округлением только для FPS */}
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">
                {type === 'fps' 
                  ? (metrics[ip]?.[type] || 0).toFixed(1) 
                  : (metrics[ip]?.[type] || 0)
                }
              </span>
              {unit && <span className="text-[9px] font-black text-sky-500 uppercase opacity-90">{unit}</span>}
            </div>

          </div>
        ))}
      </div>
    </Card>
  )
}