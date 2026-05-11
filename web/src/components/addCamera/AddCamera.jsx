import { useState, useEffect } from "react"
import { Plus, Loader2, Camera, AlertCircle, ArrowLeft } from "lucide-react"
import { useCameraStore } from "@/store/useCameraStore"
import OnvifForm from "./OnvifForm"
import ManualForm from "./ManualForm"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function AddCamera() {
  const { cameras } = useCameraStore()
  
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState('scanning') // 'scanning', 'list', 'form', 'empty'
  const [isAutoMode, setIsAutoMode] = useState(true) // Переключатель Авто/Ручной внутри формы
  
  const [foundCameras, setFoundCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)

  // 1. Функция сканирования через FastAPI
  const startScan = async () => {
    setStep('scanning')
    try {
      const response = await fetch("http://localhost:8000/api/v1/cameras/scan")
      const allCameras = await response.json()

      // Фильтруем те, что уже есть в Zustand по MAC-адресу
      const newCameras = allCameras.filter(
        (found) => !cameras.some((existing) => existing.mac === found.mac)
      )

      if (newCameras.length > 0) {
        setFoundCameras(newCameras)
        setStep('list')
      } else {
        setStep('empty')
      }
    } catch (err) {
      setStep('empty')
    }
  }

  // 2. Эффект запуска поиска при открытии меню
  useEffect(() => {
    if (isOpen) startScan()
    else {
      setStep('scanning')
      setSelectedCamera(null)
      setIsAutoMode(true)
    }
  }, [isOpen])

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button className="flex-shrink-0 w-52 h-[52px] border border-sky-500/30 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-start px-4 gap-3 transition-all text-white outline-none cursor-pointer">
          <Plus className="w-4 h-4 text-sky-500" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Добавить камеру</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80 bg-slate-900/95 backdrop-blur-md border-white/10 p-5 shadow-2xl rounded-2xl">
        
        {/* ШАГ: СКАНЕР */}
        {step === 'scanning' && (
          <div className="py-10 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest text-center">Поиск новых камер...</p>
          </div>
        )}

        {/* ШАГ: ПУСТОЙ РЕЗУЛЬТАТ */}
        {step === 'empty' && (
          <div className="py-8 text-center space-y-4">
            <AlertCircle className="w-8 h-8 text-white/10 mx-auto" />
            <p className="text-[10px] font-mono text-white/60 uppercase">Камер не обнаружено</p>
            <button onClick={startScan} className="text-sky-500 text-[9px] uppercase border-b border-sky-500/30">Повторить поиск</button>
          </div>
        )}

        {/* ШАГ: СПИСОК НАЙДЕННЫХ */}
        {step === 'list' && (
          <div className="space-y-4">
            <h4 className="text-[10px] font-mono text-sky-500 uppercase tracking-widest border-b border-white/5 pb-2">Доступные устройства:</h4>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
              {foundCameras.map((cam) => (
                <button 
                  key={cam.mac}
                  onClick={() => {
                    setSelectedCamera(cam)
                    setStep('form')
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-sky-500 transition-all text-left group"
                >
                  <Camera className="w-4 h-4 text-sky-500" />
                  <div>
                    <p className="text-[11px] font-mono text-white leading-none mb-1">{cam.model || "ONVIF Camera"}</p>
                    <p className="text-[9px] font-mono text-white/30">{cam.ip}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'form' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
    
            {/* ТОТ САМЫЙ ПЕРЕКЛЮЧАТЕЛЬ С КРУЖОЧКОМ */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-3.5 h-3.5 text-sky-500" />
                    <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest transition-all">
                    {isAutoMode ? "Авто (ONVIF)" : "Вручную (RTSP)"}
                    </span>
                </div>
            
                {/* Основание переключателя */}
                <button 
                    onClick={() => setIsAutoMode(!isAutoMode)}
                    className={`w-9 h-5 rounded-full relative transition-all duration-300 shadow-inner ${
                    isAutoMode ? 'bg-sky-600/40' : 'bg-slate-700'
                    }`}
                >
                    {/* Тот самый перекатывающийся кружочек */}
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-md ${
                    isAutoMode ? 'left-5 bg-sky-400' : 'left-1 bg-white/40'
                    }`} />
                </button>
            </div>

            {/* КОНТЕНТ ФОРМЫ (зависит от положения кружочка) */}
            {isAutoMode ? (
            <OnvifForm 
                cameraData={selectedCamera} 
                onBack={() => setStep('list')} 
                onSuccess={() => setIsOpen(false)} 
            />
            ) : (
            <ManualForm 
                cameraData={selectedCamera} 
                onBack={() => setStep('list')} 
                onSuccess={() => setIsOpen(false)} 
            />
            )}
        </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}