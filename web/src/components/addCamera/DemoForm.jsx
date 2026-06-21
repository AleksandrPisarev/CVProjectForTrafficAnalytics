import { useState } from "react"
import { useCameraStore } from "@/store/useCameraStore"
import { useUserStore } from "@/store/useUserStore"

export default function DemoForm({ onSuccess }) {
  const { addCamera, setActiveCamera, cameras } = useCameraStore()
  const { currentUser } = useUserStore()
  
  const [cameraName, setCameraName] = useState("")
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDemoSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!cameraName.trim()) {
      setError("Заполните имя камеры")
      return
    }

    setIsLoading(true)

    // Считаем демо-камеры в карусели и генерируем уникальный ID
    const demoCount = cameras.filter(cam => cam.ip.includes("demo")).length
    const generatedIp = `demo_${demoCount + 1}`

    try {
      // Отправляем запрос на новый изолированный эндпоинт демо-режима
      const response = await fetch("http://localhost:8000/api/v1/cameras/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cameraName.trim(),
          ip: generatedIp,
          email: currentUser.email
        })
      })

      if (response.ok) {
        // Бэкенд успешно создал демо-сессию, обновляем фронтенд:
        // 1. Добавляем в общий список карусели
        const data = await response.json()
        addCamera(data.camera)
        // 2. Сразу активируем её в сетке плееров
        setActiveCamera(generatedIp)
        
        // 3. Сворачиваем форму через переданный пропс
        onSuccess()
      } else {
        const errData = await response.json()
        setError(errData.detail || "Ошибка запуска демо-режима")
      }
    } catch (err) {
      setError("Нет связи с сервером демонстрации")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleDemoSubmit} className="w-full space-y-4 font-mono text-[10px] text-white/80 animate-in fade-in duration-300">
      
      {/* Вывод ошибки, если что-то пошло не так */}
      {error && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-bold text-center">
          {error}
        </div>
      )}

      {/* Поле ввода имени */}
      <div className="flex flex-col gap-1.5">
        <label className="text-white/40 uppercase tracking-wider text-[9px] font-bold">
          Название камеры в системе
        </label>
        <input 
          type="text"
          value={cameraName}
          onChange={(e) => setCameraName(e.target.value)}
          disabled={isLoading}
          placeholder="Например: Демо Поток Автострада"
          required
          className="w-full h-9 bg-slate-950/80 border border-white/10 rounded-xl px-3 text-white placeholder:text-white/20 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all text-sm font-mono"
        />
      </div>

      {/* Кнопка отправки */}
      <button 
        type="submit"
        disabled={isLoading}
        className="w-full h-9 rounded-xl font-bold uppercase tracking-widest text-center transition-all bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/40 text-white shadow-lg shadow-sky-500/10 text-[10px]"
      >
        {isLoading ? "Запуск процесса..." : "Запустить демонстрационный режим"}
      </button>
    </form>
  )
}