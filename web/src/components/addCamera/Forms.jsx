import { useState } from "react"
import RtspForm from './RtspForm'
import DemoForm from './DemoForm'

export default function Forms({ netData, onSuccess }) {
  const [isDemo, setIsDemo] = useState(false)

  return (
    <div className="w-full flex flex-col gap-4">
      
      {/* ЧЕКБОКС-ТУМБЛЕР (Всегда вверху, переключает состояние) */}
      <div className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5 font-mono text-[10px]">
        <span className="font-bold uppercase tracking-wider text-slate-400">
          Демонстрационный режим
        </span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={isDemo} 
            onChange={(e) => setIsDemo(e.target.checked)} 
            className="sr-only peer"
          />
          {/* Стилизованный тумблер */}
          <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
        </label>
      </div>

      {/* УСЛОВНЫЙ РЕНДЕРИНГ: Показываем нужный компонент в зависимости от чекбокса */}
      {isDemo ? (
        <DemoForm
            onSuccess={onSuccess}
        />
      ) : (
        <RtspForm 
            netData={netData} 
            onSuccess={onSuccess}
        />
      )}
    </div>
  )
}