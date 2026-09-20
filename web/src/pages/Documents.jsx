import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCameraStore } from "@/store/useCameraStore"

export default function Documents() {
  // Локальный стейт нарушителей (будет жить вечно, пока открыто приложение)
  const [violators, setViolators] = useState([])
  // Стейт для открытого модального окна оператора
  const [selectedViolator, setSelectedViolator] = useState(null)

  const { cameras } = useCameraStore()

  // Вспомогательная функция поиска имени камеры по IP
  const getCameraName = (ip) => {
    if (!cameras) return ip
    const camera = cameras.find((c) => c.ip === String(ip))
    return camera ? camera.name : ip
  }

  useEffect(() => {
    // 1. ОДИН РАЗ ПРИ СТАРТЕ: Подтягиваем архив из PostgreSQL
    const fetchArchive = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/violators", { method: "GET" })
        if (response.ok) {
          const data = await response.json()
          setViolators(data)
        }
      } catch {}
    }
    fetchArchive()

    // 2. ОДИН РАЗ ПРИ СТАРТЕ: Открываем вечный сокет
    const socket = new WebSocket("ws://127.0.0.1:8000/api/violators/ws")

    // ПЕРЕХВАТ ДАННЫХ ИЗ FASTAPI (await manager.broadcast)
    socket.onmessage = (event) => {
      const newViolator = JSON.parse(event.data)
      // Добавляем новое нарушение в самый верх нашей таблицы на лету
      setViolators((prev) => [newViolator, ...prev])
    }

    return () => socket.close() // Закроется только если закрыть вкладку браузера целиком
  }, [])

  // Функция для кнопки «Удалить»
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/violators/${id}`, { method: "DELETE" })
      if (response.status === 204) {
        // Удаляем из таблицы на экране
        setViolators((prev) => prev.filter((v) => v.id !== id))
        // Если это окно было открыто, закрываем его
        if (selectedViolator?.id === id) setSelectedViolator(null)
      }
    } catch {}
  }

  return (
    <div className="p-10 flex flex-col items-center min-h-screen bg-transparent">
      <h1 className="text-3xl font-bold text-white mb-8">Журнал Фиксации Нарушений</h1>

      {/* Стеклянный контейнер таблицы shadcn */}
      <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-cyan-400 font-bold w-16 text-center">№</TableHead>
              <TableHead className="text-cyan-400 font-bold">Имя камеры</TableHead>
              <TableHead className="text-cyan-400 font-bold">Скорость авто</TableHead>
              <TableHead className="text-cyan-400 font-bold text-center">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {violators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-white/40">
                  Нарушений не зафиксировано. Ожидание данных с камер...
                </TableCell>
              </TableRow>
            ) : (
              // Добавляем index в параметры map для автонумерации
              violators.map((item, index) => (
                <TableRow key={item.id} className="border-white/5 hover:bg-white/10 transition-all duration-300">
                  
                  {/* ВЫВОД НОМЕРА СТРОКИ (Всегда пересчитывается сам!) */}
                  <TableCell className="text-white/40 font-mono text-center">{index + 1}</TableCell>
                  
                  {/* ОТОБРАЖАЕМ ИМЯ КАМЕРЫ ИЗ ZUSTAND */}
                  <TableCell className="text-white font-medium">{getCameraName(item.camera_id)}</TableCell>
                  
                  <TableCell className="text-white font-bold">{Math.floor(Number(item.max_speed) || 0)} км/ч</TableCell>
                  
                  <TableCell className="text-center space-x-3">
                    <button 
                      onClick={() => setSelectedViolator(item)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/40 transition"
                    >
                      Открыть
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold hover:bg-red-500/40 transition"
                    >
                      Удалить
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Стеклянное модальное окно (всплывает по клику) */}
      {selectedViolator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900/90 backdrop-blur-2xl p-6 text-white shadow-2xl flex flex-col items-center">
            
            <div className="w-full flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-cyan-400">Карточка доказательств нарушения</h2>
              <button 
                onClick={() => setSelectedViolator(null)}
                className="text-white/60 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* 1. Главный полный кадр с OpenCV рамкой */}
            <div className="w-full mb-6 text-center">
              <p className="text-sm text-white/40 mb-2 text-left">Полный кадр фиксации (Доказательство):</p>
              <img 
                src={selectedViolator.proof_image} 
                alt="Полный кадр нарушителя" 
                className="w-full rounded-2xl border border-white/10 object-cover shadow-lg"
              />
            </div>

            {/* 2. Кроп автомобиля нарушителя */}
            <div className="w-full mb-6 flex flex-col items-start">
              <p className="text-sm text-white/40 mb-2">Кроп автомобиля:</p>
              <img 
                src={selectedViolator.car_image} 
                alt="Кроп машины" 
                className="max-w-[300px] rounded-xl border border-white/10 shadow-md"
              />
            </div>

            {/* 3. Галерея вариантов кадров номеров */}
            <div className="w-full mb-6">
              <p className="text-sm text-white/40 mb-3">Варианты распознавания текстовой нейросетью:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {Object.entries(selectedViolator.plate_variants).map(([text, imgBase64]) => (
                  <div key={text} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5">
                    <span className="font-bold text-lg text-cyan-400 font-mono tracking-wider">{text}</span>
                    {imgBase64 ? (
                      <img src={imgBase64} alt="Кроп номера" className="h-10 rounded-md border border-white/10 object-contain" />
                    ) : (
                      <span className="text-xs text-white/30">нет кадра</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Текстовая плашка скорости */}
            <div className="w-full mt-2 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-center">
              <span className="text-xl font-bold text-red-400">
                Скорость: {int(selectedViolator.max_speed)} км/ч.
                Разрешенная скорость: {selectedViolator.speed_limit} км/ч.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Вспомогательная быстрая функция округления для JavaScript, чтобы не писать Math.floor
function int(value) {
  return Math.floor(Number(value) || 0)
}