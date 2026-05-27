import React, { useState, useEffect } from 'react'
import { useCameraStore } from "@/store/useCameraStore"

export default function CameraStream({ ip }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  // Достаем список всех камер пользователя из стора, чтобы найти имя
  const { cameras } = useCameraStore() 
  const cameraName = cameras.find(cam => cam.ip === ip)?.name || ip
  
  useEffect(() => {
    setIsLoaded(false)
  }, [ip])

  const handleError = () => {
    setIsLoaded(false)
    setTimeout(() => { setRetryCount(prev => prev + 1) }, 3000)
  }

  return (
    <div className="relative w-full aspect-video bg-black/60 rounded-xl border border-white/10 shadow-2xl overflow-hidden group">
      
      {/* Лоадер: пока первый кадр не загрузился, показываем его */}
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10">
          <div className="w-8 h-8 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-3" />
          <p className="font-mono text-[9px] tracking-wider text-sky-500/60 uppercase">
            Подключение к {cameraName}...
          </p>
        </div>
      )}

      <img 
        src={`http://localhost:8000/video_feed?id=${ip}&t=${retryCount}`} 
        alt={cameraName} 
        onLoad={() => setIsLoaded(true)} 
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Бейдж показывает имя камеры из настроек пользователя */}
      <div className="absolute top-2 left-2 bg-black/70 text-white/80 font-mono text-[10px] px-2 py-0.5 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {cameraName}
      </div>
    </div>
  )
}