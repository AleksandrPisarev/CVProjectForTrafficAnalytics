import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, X, AlertCircle } from 'lucide-react'
import { useCameraStore } from "@/store/useCameraStore"

export default function CameraStream({ ip }) {
  const [isLoaded, setIsLoaded] = useState(false)
   const [error, setError] = useState(null)

   // Локальное реактивное состояние для переключения цвета одной конкретной кнопки
  const [isAiActive, setIsAiActive] = useState(false)
  
  // Каждое открытие компонента гарантированно получает СВЕЖИЙ уникальный таймстамп!
  const [streamUrl, setStreamUrl] = useState(`http://localhost:8000/video_feed?id=${ip}&t=${Date.now()}`)
  
  const { cameras, setActiveCamera } = useCameraStore() 
  const cameraName = cameras.find(cam => cam.ip === ip)?.name || ip
  
  // Если поменялся IP — просто сбрасываем флаг загрузки и обновляем ссылку
  useEffect(() => {
    setIsLoaded(false)
    setStreamUrl(`http://localhost:8000/video_feed?id=${ip}&t=${Date.now()}`)
  }, [ip])

   // Автоматический сброс ошибки через 3 секунды, чтобы она не висела вечно
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Если бэкенд моргнул и сокет закрылся — плавно обновляем ссылку через 3 секунды
  const handleError = () => {
    setIsLoaded(false)
    setTimeout(() => { 
      setStreamUrl(`http://localhost:8000/video_feed?id=${ip}&t=${Date.now()}`) 
    }, 3000)
  }

  // Фоновое переключение AI: отправляем быструю команду-уведомление на сервер
  const handleToggleAi = async () => {
    setError(null) // Сбрасываем старую ошибку перед новым действием
    try {
      const response = await fetch('http://localhost:8000/api/v1/cameras/toggle-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ip }) 
      })
      
      if (response.ok) {
        setIsAiActive(!isAiActive)
      } else {
        const errData = await response.json()
        setError(errData.detail || "Ошибка переключения нейросети")
      }
    } catch (err) {
      setError("Нет связи с сервером")
    }
  }

  const handleCloseCamera = async () => {
    setError(null)
    try {
      const response = await fetch('http://localhost:8000/api/v1/cameras/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ip })
      })
      
      if (response.ok) {
        setActiveCamera(ip) // Твой метод из Zustand уберет камеру с экрана
      } else {
        const errData = await response.json()
        setError(errData.detail || "Ошибка при остановке камеры")
      }
    } catch (err) {
      setError("Нет связи с сервером")
    }
  }

  return (
    <div className="relative w-full aspect-video bg-black/60 rounded-xl border border-white/10 shadow-2xl overflow-hidden group">
      
      {/* КРАСИВАЯ ПЛАШКА ВЫВОДА ОШИБОК ДЛЯ ПОЛЬЗОВАТЕЛЯ */}
      {error && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-red-500/90 backdrop-blur-md text-white text-xs font-mono py-1.5 px-3 rounded-lg shadow-xl z-30 flex items-center gap-2 border border-red-400/20 animate-in fade-in zoom-in-95 duration-200">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* ЛОАДЕР */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10 transition-opacity duration-500 pointer-events-none ${
        isLoaded ? 'opacity-0' : 'opacity-100'
      }`}>
        <div className="w-8 h-8 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-3" />
        <p className="font-mono text-[9px] tracking-wider text-sky-500/60 uppercase">
          Подключение к {cameraName}...
        </p>
      </div>

      <img 
        src={streamUrl} 
        alt={cameraName} 
        onLoad={() => {setIsLoaded(true)}} 
        onError={handleError}
        className="w-full h-full object-cover"
      />

      {/* Бейдж имени */}
      <div className="absolute top-2 left-2 bg-black/70 text-white/80 font-mono text-[10px] px-2 py-0.5 rounded border border-white/10 z-20">
        {ip?.includes("demo") && "Демонстрационный режим: "}{cameraName}
      </div>

      {/* ПОЛУПРОЗРАЧНАЯ ПОЛОСА УПРАВЛЕНИЯ ВНИЗУ */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between px-4 z-20 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
        
        <button
          onClick={handleToggleAi}
          title={isAiActive ? "Выключить нейросеть" : "Включить нейросеть"}
          className={`flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-mono transition-colors border ${
            isAiActive 
              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30" 
              : "bg-white/5 text-slate-300 hover:bg-white/10 border-white/5"
          }`}
        >
          {isAiActive ? <Eye size={13} /> : <EyeOff size={13} />}
          <span>{isAiActive ? "AI: АКТИВЕН" : "AI: ОТКЛЮЧЕН"}</span>
        </button>

        <button
          onClick={handleCloseCamera}
          title="Закрыть камеру"
          className="p-1.5 bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded border border-white/5 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}