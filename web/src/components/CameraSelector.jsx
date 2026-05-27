import React from "react"
import { Camera } from "lucide-react"
import { useCameraStore } from "@/store/useCameraStore"
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export default function CameraSelector() {
  const { cameras, activeCamera, setActiveCamera } = useCameraStore()
  const [error, setError] = useState(null) // Локальная ошибка чисто для карусели

  // Твоя функция управления процессами бэкенда при клике
  const handleCameraClick = async (item) => {
    setError(null) // Сбрасываем старую ошибку
    const isExist = activeCamera.includes(item.ip)

    if (isExist) {
      // 1. Если камера активна — шлем запрос на отключение сессии
      try {
        const response = await fetch('http://localhost:8000/api/v1/cameras/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: item.ip })
        })
        if (response.ok) {
          setActiveCamera(item.ip) // Убираем из активных только после успеха бэкенда
        } else {
          const errData = await response.json()
          setError(errData.detail || "Ошибка при остановке камеры")
        }
      } catch (err) {
        setError("Нет связи с сервером")
      }
    } else {
      // 2. Если камеру включают — сначала проверяем лимит на фронтенде
      if (activeCamera.length >= 4) {
        setError("Нельзя активировать более 4 камер одновременно")
        return
      }

      // 3. Отправляем запрос на запуск сессии на бэкенд
      try {
        const response = await fetch('http://localhost:8000/api/v1/cameras/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            brand: item.brand,
            ip: item.ip,
            username: item.username,
            password: item.password,
            rtsp_tail: item.rtsp_tail
          })
        })

        if (response.ok) {
          setActiveCamera(item.ip) // Добавляем в активные только после успешного старта на бэкенде
        } else {
          const errData = await response.json()
          setError(errData.detail || "Не удалось запустить трансляцию")
        }
      } catch (err) {
        setError("Нет связи с сервером")
      }
    }
  }

  return (
    <div className="w-full px-2 lg:px-4 pt-0 pb-1 transition-all duration-500 flex flex-col gap-2">
      
      {/* Аккуратный вывод ошибки над каруселью */}
      {error && (
        <div className="text-[10px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded max-w-fit uppercase tracking-wider">
          ⚠️ {error}
        </div>
      )}

      <Carousel opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="-ml-2">
          {cameras.map((item) => (
            <CarouselItem key={item.ip} className="pl-2 basis-1/2 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
              {/* По твоему плану: вызываем нашу функцию и передаем весь объект item */}
              <Card onClick={() => handleCameraClick(item)}
                    className={`border-white/10 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all cursor-pointer group
                                ${activeCamera.includes(item.ip) ? 'border-sky-500 bg-sky-500/10' : ''}`}>
                <CardContent className="p-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-sky-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-500/20">
                    <Camera className="w-4 h-4 text-sky-500" />
                  </div>
                  
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-white/90 truncate uppercase tracking-tight">
                      {item.name}
                    </p>
                    <p className="text-[8px] font-mono text-sky-500/50 truncate tracking-tighter mb-1">
                      IP: {item.ip}
                    </p>
                    <div className="flex items-center gap-1">
                      <div className={`w-1 h-1 rounded-full ${activeCamera.includes(item.ip) ? 'bg-sky-400 shadow-[0_0_4px_#38bdf8]' : 'bg-red-500'}`} />
                      <span className="text-[8px] font-mono text-white/30 uppercase">
                        {activeCamera.includes(item.ip) ? 'active' : 'idle'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex left-2 lg:left-4 scale-75 opacity-30 hover:opacity-100 bg-transparent border-white/10" />
        <CarouselNext className="hidden md:flex right-2 lg:right-4 scale-75 opacity-30 hover:opacity-100 bg-transparent border-white/10" />
      </Carousel>
    </div>
  )
}