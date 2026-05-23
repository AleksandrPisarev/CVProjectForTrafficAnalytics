import { useState, useEffect } from 'react'
import { Car, Gauge, Cpu, Activity } from "lucide-react"
import MetricCard from "../components/MetricCard"
import { useUserStore } from "@/store/useUserStore"
import { useCameraStore } from "@/store/useCameraStore"
import CameraSelector from '@/components/CameraSelector'
import AddCamera from '@/components/addCamera/AddCamera'

export default function Home() {
  const { currentUser } = useUserStore()
  const { activeCamera } = useCameraStore()
  const [isLoaded, setIsLoaded] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
   // 1. Создаем состояние для данных из бэкенда
  const [metrics, setMetrics] = useState({fps: 0})
   // Флаг: выбрана ли хотя бы одна камера
  const hasCamera = activeCamera.length > 0

  const handleError = () => {
    setIsLoaded(false)
    // Пробуем переподключиться через 3 секунды
    setTimeout(() => { setRetryCount(prev => prev + 1); }, 3000)
  }

  // 2. Запускаем "слушателя" при загрузке страницы
  useEffect(() => {
    if (!hasCamera) {
      setMetrics({ fps: 0 }) // Обнуляем метрики при выходе
      setIsLoaded(false)     // Сбрасываем статус загрузки видео
      return 
    }
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
  }, [hasCamera]) // Эффект перезапустится при входе/выходе

  // Данные, которые в будущем придут из FastAPI
  const statsData = [
    { title: "Текущий FPS", value: hasCamera ? metrics.fps.toFixed(1) : "0.0", unit: "кадр/с", icon: Activity },
    { title: "Обнаружено объектов", value: hasCamera ? "1,284" : "0", icon: Car },
    { title: "Скорость потока", value: hasCamera ? "64" : "0", unit: "км/ч", icon: Gauge },
    { title: "Нагрузка на GPU", value: hasCamera ? "42" : "0", unit: "%", icon: Cpu },
  ]

  return (
    <div className={`"flex flex-col w-full min-h-[calc(100vh-70px)] lg:h-[calc(100vh-70px)] bg-transparent overflow-y-auto lg:overflow-hidden scrollbar-hide" ${!currentUser ? "opacity-60 pointer-events-none grayscale-[50%]" : "opacity-100"}`}>

      <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center w-full px-2 lg:px-4 gap-4 md:gap-2">
  
        {/* Обертка кнопки "Добавить". На телефоне она займет всю ширину (w-full). */}
        {/* На ПК (md:) ширина станет автоматической под размер самой кнопки (md:w-auto). */}
        <div className="w-full md:w-auto flex-shrink-0">
          <AddCamera />
        </div>

        {/* Обертка для карусели камер. flex-1 заставит её занять всё оставшееся место на ПК. */}
        <div className="flex-1 min-w-0 w-full">
          <CameraSelector />
        </div>

      </div>
      
      <div className="flex flex-col lg:flex-row w-full flex-1 !px-2 lg:!px-4 !pb-6 lg:!pb-10 !pt-2 !gap-3 min-h-0 overflow-hidden">
        {/* ЛЕВАЯ ЧАСТЬ: Видео (Растягивается) */}
        <section className="flex-none lg:flex-1 flex justify-center items-start min-w-0 min-h-0">
          <div className="relative w-full max-w-[1200px] aspect-video bg-black/60 rounded-xl border border-white/10 shadow-2xl overflow-hidden">
            {/* ЦЕНТР: Зона ожидания потока */}
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              {!isLoaded && (
                <>
                  <div className="w-12 h-12 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin !mb-8" />
                  <p className="font-mono text-[11px] font-black tracking-[0.3em] text-sky-500/60 uppercase text-center leading-loose max-w-sm">
                    {currentUser 
                      ? "Выберите камеру или добавьте в меню пользователя" 
                      : "Для запуска приложения необходимо авторизоваться нажмите на кнопку войти"
                    }
                  </p>
                </>
              )}
              {hasCamera && (
                <img src={`http://localhost:8000/video_feed?t=${retryCount}`} alt="stream" onLoad={() => setIsLoaded(true)} onError={handleError}
                className={`w-full h-full object-cover transition-opacity duration-500 ${ isLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}/>
              )}
            </div>
          </div>
        </section>

        {/* ПРАВАЯ ЧАСТЬ: Боковая панель (Фиксированная) */}
        <aside className="w-full lg:w-[450px] flex-shrink-0 flex flex-col !gap-3 h-fit lg:h-full overflow-y-auto scrollbar-hide transition-all duration-500">
          {statsData.map((item, index) => (
            <MetricCard key={index} {...item} />
          ))}
        </aside>
      </div>
    </div>
  )
}