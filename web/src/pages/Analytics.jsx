import { useCameraStore } from "@/store/useCameraStore"

export default function Analytics() {
  // Достаем список камер из Zustand-хранилища
  const { cameras, activeCamera } = useCameraStore()

  const grafanaBase = "http://127.0.0.1:3000/d-solo/dfyr3vgq1jshsf/traffic-analytics?orgId=1&refresh=1s"

  return (
    <div className="p-1 flex flex-col items-center min-h-screen bg-transparent select-none w-full">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-wide drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">
        Аналитический Центр Контроля Скорости
      </h1>
      {/* Если ни одна камера не включена, выводим одну короткую аккуратную надпись по центру */}
      {(!activeCamera || activeCamera.length === 0) ? (
        <div className="text-white/40 text-sm mt-20 font-medium tracking-wider uppercase">
          Нет активных камер для отображения аналитики
        </div>
      ) : (
        /* Вертикальная структура: Перебираем ТОЛЬКО реально включенные камеры */
        <div className="flex flex-col gap-6 w-full">
          {activeCamera.map((activeCameraIp) => {
            // Ищем имя камеры в общем списке по её IP
            const currentCameraInfo = cameras ? cameras.find(c => String(c.ip) === String(activeCameraIp)) : null

            // Если по какой-то причине инфо о камере не нашли, пропускаем этот рендер
            if (!currentCameraInfo) return null

            return (
              <div 
                key={activeCameraIp} 
                className="flex flex-col rounded-lg border border-white/10 bg-zinc-950/40 backdrop-blur-xl shadow-2xl p-4 transition-all duration-300 hover:border-cyan-500/30 w-full"
              >
                {/* Шапка активной камеры */}
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                  <h2 className="text-lg font-bold text-cyan-400 tracking-wider uppercase">
                    📹 {currentCameraInfo.name || "Безымянная камера"}
                  </h2>
                </div>

                {/* Все графики выстроены в одну строчку */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[340px]">
                  
                  {/* График 1: Общий счетчик нарушений */}
                  <div className="rounded-xl border border-white/5 bg-black/20 overflow-hidden h-full">
                    <iframe
                      src={`${grafanaBase}&panelId=1&var-camera_id=${activeCameraIp}`}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                    ></iframe>
                  </div>

                  {/* График 2: Категории тяжести нарушений */}
                  <div className="rounded-xl border border-white/5 bg-black/20 overflow-hidden h-full">
                    <iframe
                      src={`${grafanaBase}&panelId=2&var-camera_id=${activeCameraIp}`}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                    ></iframe>
                  </div>

                  {/* График 3: Широкая таблица ТОП-5 с фото автомобилей (Занимает 2 колонки из 4) */}
                  <div className="lg:col-span-2 rounded-xl border border-white/5 bg-black/20 overflow-hidden h-full">
                    <iframe
                      src={`${grafanaBase}&panelId=3&var-camera_id=${activeCameraIp}`}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                    ></iframe>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}