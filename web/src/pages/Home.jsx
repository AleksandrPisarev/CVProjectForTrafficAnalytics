import { useState, useEffect } from 'react'
import { Car, Activity } from "lucide-react"
import MetricCard from "../components/MetricCard"
import { useCameraStore } from "@/store/useCameraStore"
import CameraSelector from '@/components/CameraSelector'
import AddCamera from '@/components/addCamera/AddCamera'
import CameraStream from '@/components/CameraStream'

export default function Home() {
  const { activeCamera } = useCameraStore()
  const [metrics, setMetrics] = useState({})

  const hasCamera = activeCamera.length > 0

  // Эффект опроса статистики (оставляем пока как есть для совместимости)
  useEffect(() => {
    if (!hasCamera) {
      setMetrics({})
      return 
    }
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/stats')
        if (response.ok) {
          const data = await response.json()
          setMetrics(data) 
        }
      } catch (error) {
        console.error("Ошибка при получении статистики:", error)
      }
    }
    const interval = setInterval(fetchStats, 1000)
    return () => clearInterval(interval)
  }, [hasCamera])

  const statsTemplate = [
    { title: "Текущий FPS", type: "fps", unit: "кадр/с", icon: Activity, metrics },
    { title: "Обнаружено объектов", type: "auto", unit: "единиц", icon: Car, metrics }
  ]

  // Функция, которая подбирает правильные CSS-классы сетки в зависимости от числа камер
  const getGridLayoutClass = () => {
    const count = activeCamera.length
    if (count === 1) return "grid-cols-1 max-w-[1200px]"
    if (count === 2) return "grid-cols-1 lg:grid-cols-2 max-w-[1400px]"
    // Для 3 и 4 камер делаем сетку 2х2 на ПК
    return "grid-cols-1 lg:grid-cols-2 max-w-[1400px]" 
  }

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-70px)] lg:h-[calc(100vh-70px)] bg-transparent overflow-y-auto lg:overflow-hidden scrollbar-hide opacity-100">

      <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center w-full px-2 lg:px-4 gap-4 md:gap-2">
        <div className="w-full md:w-auto flex-shrink-0">
          <AddCamera />
        </div>
        <div className="w-full md:w-auto md:max-w-[680px] flex-1 min-w-0">
          <CameraSelector />
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row w-full flex-1 !px-2 lg:!px-4 !pb-6 lg:!pb-10 !pt-2 !gap-3 min-h-0 overflow-hidden">
        
        {/* ЛЕВАЯ ЧАСТЬ: Сетка Видеоплееров */}
        <section className="flex-none lg:flex-1 flex justify-center items-start min-w-0 min-h-0 w-full overflow-y-auto lg:overflow-visible pr-0 lg:pr-1">
          
          {!hasCamera ? (
            /* ЗАГЛУШКА: Если ни одна камера не выбрана */
            <div className="w-full max-w-[1200px] aspect-video bg-black/60 rounded-xl border border-white/10 shadow-2xl flex flex-col items-center justify-center p-4">
              <div className="w-12 h-12 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin !mb-8" />
              <p className="font-mono text-[11px] font-black tracking-[0.3em] text-sky-500/60 uppercase text-center leading-loose max-w-sm">
                Выберите камеру из списка если камер нет используйте кнопку добавить камеру
              </p>
            </div>
          ) : (
            /* СЕТКА С КАМЕРАМИ */
            <div className={`grid gap-4 w-full h-fit ${getGridLayoutClass()}`}>
              {activeCamera.map((cameraIp) => (
                <CameraStream key={cameraIp} ip={cameraIp} />
              ))}
            </div>
          )}

        </section>

        {/* ПРАВАЯ ЧАСТЬ: Боковая панель */}
        <aside className="w-full lg:w-[450px] flex-shrink-0 flex flex-col !gap-3 h-fit lg:h-full overflow-y-auto scrollbar-hide transition-all duration-500">
          {statsTemplate.map((item, index) => (
            <MetricCard key={index} {...item} />
          ))}
        </aside>
      </div>
    </div>
  )
}