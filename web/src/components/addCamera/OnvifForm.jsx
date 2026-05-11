import { useState } from "react"
import { ShieldCheck, ArrowLeft } from "lucide-react"
import { useCameraStore } from "@/store/useCameraStore"

export default function OnvifForm({ cameraData, onBack, onSuccess }) {
  // Достаем функции из Zustand стора
  const { addCamera, setActiveCamera } = useCameraStore()

  // Поля, которые заполняет пользователь
  const [name, setName] = useState("") 
  const [login, setLogin] = useState("admin")
  const [password, setPassword] = useState("")
  const [isStatic, setIsStatic] = useState(true)

  const handleConnect = () => {
    // Если пользователь не ввел имя, используем модель от бекенда или дефолт
    const finalName = name.trim() || cameraData?.model || "Новая камера"
    
    // Собираем объект по нашей утвержденной структуре
    const newCamera = {
      mac: cameraData.mac,      
      name: finalName,              
      ip: cameraData.ip,            // Из пропсов (от сканера)
      port: cameraData.port || 80,  // Из пропсов (от сканера)
      login: login,
      password: password,
      isStatic: isStatic,
      streamUrl: cameraData.streamUrl || "", // Получаем готовую ссылку от бекенда
    }

    // Сохраняем в список камер
    addCamera(newCamera)
    
    // Сразу делаем камеру активной (чтобы загорелся индикатор в карусели)
    setActiveCamera(newCamera.mac)
    
    // Закрываем выпадающее меню
    onSuccess()
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Шапка: Кнопка назад и тех-инфо */}
      <div className="flex items-center gap-2 mb-1">
         <button 
           onClick={onBack} 
           className="p-1 hover:bg-white/5 rounded text-white/20 hover:text-sky-500 transition-colors"
           title="Вернуться к списку"
         >
            <ArrowLeft className="w-3.5 h-3.5" />
         </button>
         <span className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">
            Связь: {cameraData?.ip} | {cameraData?.mac}
         </span>
      </div>

      <div className="space-y-4">
        {/* Поле: Метка (Название) */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest ml-1">Метка камеры</label>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder={cameraData?.model || "Напр: ПАРКОВКА"}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-sky-500/50 transition-all" 
          />
        </div>

        {/* Поля: Логин / Пароль */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest ml-1">Логин</label>
            <input 
              value={login} 
              onChange={(e) => setLogin(e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-sky-500/50 transition-all" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest ml-1">Пароль</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••" 
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white outline-none focus:border-sky-500/50 transition-all" 
            />
          </div>
        </div>

        {/* Чекбокс: Статический IP */}
        <div className="flex items-center gap-2 pt-1 px-1">
          <input 
            type="checkbox" 
            id="static-check" 
            checked={isStatic} 
            onChange={(e) => setIsStatic(e.target.checked)}
            className="w-3.5 h-3.5 accent-sky-500 cursor-pointer" 
          />
          <label htmlFor="static-check" className="text-[9px] font-mono text-white/60 uppercase cursor-pointer select-none">
            Назначить статический IP
          </label>
        </div>
      </div>

      {/* Кнопка действия */}
      <button 
        onClick={handleConnect}
        className="w-full bg-sky-600 hover:bg-sky-500 text-white py-3.5 rounded-xl text-[11px] font-mono font-bold uppercase tracking-[0.2em] transition-all shadow-lg shadow-sky-900/20 flex items-center justify-center gap-2"
      >
        <ShieldCheck className="w-4 h-4" />
        Подключить
      </button>
    </div>
  )
}