import { useState } from "react"
import { Link2, ArrowLeft, AlertCircle } from "lucide-react"
import { useCameraStore } from "@/store/useCameraStore"

export default function ManualForm({ cameraData, onBack, onSuccess }) {
  // Достаем функции из Zustand
  const { addCamera, setActiveCamera } = useCameraStore()

  const [name, setName] = useState("") 
  const [rtspUrl, setRtspUrl] = useState("")
  const [error, setError] = useState(false)

  const handleConnect = () => {
    // Валидация: если ссылки нет, показываем ошибку
    if (!rtspUrl.trim()) {
      setError(true)
      return
    }

    // В ручном режиме MAC может быть неизвестен, если зашли не через список.
    // Если cameraData есть — берем реальный MAC, если нет — генерим временный.
    const finalMac = cameraData?.mac || `manual-${Date.now()}`

    const newCamera = {
      mac: finalMac,
      name: name.trim() || "Ручной поток",
      ip: cameraData?.ip || "Remote URL", // Если IP не из сканера, ставим метку
      port: 554,                    // Стандарт для RTSP
      login: "",                    // В ручном вводе данные обычно в ссылке
      password: "",
      isStatic: false,              // В ручном режиме статика не поддерживается
      streamUrl: rtspUrl.trim()     // Сама ссылка, которую ввел юзер
    }

    // 1. Сохраняем в список
    addCamera(newCamera)
    
    // 2. Сразу делаем активной
    setActiveCamera(finalMac)
    
    // 3. Закрываем меню
    onSuccess()
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Навигация */}
      <div className="flex items-center gap-2 mb-1">
         <button 
           onClick={onBack} 
           className="p-1 hover:bg-white/5 rounded text-white/20 hover:text-sky-500 transition-colors"
         >
            <ArrowLeft className="w-3.5 h-3.5" />
         </button>
         <span className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">
            Ручной ввод потока
         </span>
      </div>

      <div className="space-y-4">
        {/* Поле: Название */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest ml-1">Метка камеры</label>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Напр: УЛИЦА-01"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-sky-500/50 transition-all" 
          />
        </div>

        {/* Поле: RTSP Ссылка */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <label className={`text-[9px] font-mono uppercase tracking-widest ${error ? 'text-red-500' : 'text-white/40'}`}>
              RTSP URL
            </label>
            {error && (
              <span className="text-[8px] font-mono text-red-500 uppercase">Обязательное поле</span>
            )}
          </div>
          <textarea 
            value={rtspUrl} 
            onChange={(e) => {
              setRtspUrl(e.target.value)
              if (error) setError(false)
            }}
            placeholder="rtsp://user:pass@ip:port/stream"
            className={`w-full h-24 bg-white/5 border rounded-lg px-3 py-2 text-[10px] font-mono text-white outline-none resize-none transition-all ${
              error ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 focus:border-sky-500/50'
            }`} 
          />
          <p className="text-[7px] font-mono text-white/10 leading-tight px-1 italic uppercase">
            Убедитесь, что формат соответствует rtsp://адрес
          </p>
        </div>
      </div>

      {/* Кнопка действия */}
      <button 
        onClick={handleConnect}
        className="w-full bg-sky-600 hover:bg-sky-500 text-white py-3.5 rounded-xl text-[11px] font-mono font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-900/20"
      >
        <Link2 className="w-4 h-4" />
        Подключить
      </button>
    </div>
  )
}