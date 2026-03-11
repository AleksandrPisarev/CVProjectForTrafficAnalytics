import { useState, useEffect } from 'react'
import { Car, Gauge, Cpu, Activity } from "lucide-react"
import MetricCard from "../components/MetricCard"

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const handleError = () => {
    setIsLoaded(false)
    // Пробуем переподключиться через 3 секунды
    setTimeout(() => { setRetryCount(prev => prev + 1); }, 3000)
  }

  // 1. Создаем состояние для данных из бэкенда
  const [metrics, setMetrics] = useState({
    fps: 0
  })
  // 2. Запускаем "слушателя" при загрузке страницы
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/stats')
        if (response.ok) {
          const data = await response.json()
          setMetrics(data) // Обновляем состояние данными из FastAPI
        }
      } catch (error) {
        console.error("Ошибка при получении статистики:", error)
      }
    }
    // Опрашиваем бэкенд каждую секунду (1000 мс)
    const interval = setInterval(fetchStats, 1000);

    // Очищаем таймер, если пользователь ушел со страницы
    return () => clearInterval(interval)
  }, [])

  // Данные, которые в будущем придут из FastAPI
  const statsData = [
    { title: "Текущий FPS", value: metrics.fps.toFixed(1), unit: "кадр/с", icon: Activity },
    { title: "Обнаружено объектов", value: "1,284", icon: Car },
    { title: "Скорость потока", value: "64", unit: "км/ч", icon: Gauge },
    { title: "Нагрузка на GPU", value: "42", unit: "%", icon: Cpu },
  ]

  // Общие стили для всех углов видоискателя
  const cornerBase = "absolute w-5 h-5 border-sky-500/40 z-10";

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-70px)] !p-6 lg:!p-10 !gap-5 box-border overflow-y-auto lg:overflow-hidden scrollbar-hide">
      
      {/* ЛЕВАЯ ЧАСТЬ: Видео (Растягивается) */}
      <section className="flex-none lg:flex-1 flex justify-center items-start min-w-0 min-h-0">
        <div className="relative w-full max-w-[1200px] aspect-video bg-black/60 rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          
          {/* ВЕРХНЯЯ ИНФО-ПАНЕЛЬ */}
          <div className="absolute top-0 left-0 w-full !p-4 flex justify-between items-center z-20 font-mono text-[10px] text-sky-400/80 tracking-widest bg-gradient-to-b from-black/80 to-transparent">
            {/* Индикатор связи */}
            <div className="flex items-center !gap-3">
              <div className={`w-1.5 h-1.5 rounded-full ${isLoaded ? 'bg-sky-400 animate-pulse shadow-[0_0_8px_#38bdf8]' : 'bg-red-500'}`} />
              <span className={isLoaded ? 'text-sky-400/80' : 'text-red-500/80'}>
                {isLoaded ? 'ACTIVE_LINK' : 'CONNECTION_LOST'}
              </span>
            </div>
            <div className="flex gap-4 opacity-60">
              <span>30.4 FPS</span>
              <span>1080P</span>
            </div>
          </div>

          {/* ДЕКОРАТИВНЫЕ УГЛЫ */}
          <div className={`${cornerBase} top-4 left-4 border-t-2 border-l-2`} />
          <div className={`${cornerBase} top-4 right-4 border-t-2 border-r-2`} />
          <div className={`${cornerBase} bottom-4 left-4 border-b-2 border-l-2`} />
          <div className={`${cornerBase} bottom-4 right-4 border-b-2 border-r-2`} />

          {/* ЦЕНТР: Зона ожидания потока */}
          <div className="w-full h-full flex flex-col items-center justify-center relative">
              {!isLoaded && (
                <>
                  <div className="w-12 h-12 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin !mb-8" />
                  <p className="font-mono text-sm font-black tracking-[0.8em] text-sky-500/60 uppercase">INITIALIZING_SIGNAL...</p>
                </>
              )}
              <img src={`http://localhost:8000/video_feed?t=${retryCount}`} alt="stream" onLoad={() => setIsLoaded(true)} onError={handleError}
                className={`w-full h-full object-cover transition-opacity duration-500 ${ isLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}/>
          </div>

          {/* НИЖНИЙ ТЕХ-ТЕКСТ */}
          <div className="absolute bottom-4 left-6 z-20 font-mono text-[9px] text-white/20 uppercase tracking-tight">
            Engine: YOLOv8_TensorRT // Buffer_Status: Optimal
          </div>
        </div>
      </section>

      {/* ПРАВАЯ ЧАСТЬ: Боковая панель (Фиксированная) */}
      <aside className="w-full lg:w-[500px] flex-shrink-0 flex flex-col !gap-5 h-full overflow-y-auto scrollbar-hide">
        {statsData.map((item, index) => (
          <MetricCard key={index} {...item} />
        ))}
      </aside>
    </div>
  );
};