import { useState, useEffect } from "react"
import { Plus, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import RtspForm from '@/components/addCamera/RtspForm'

export default function AddCamera() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState('loading') // 'loading' или 'form'
  const [netData, setNetData] = useState({ subnetRange: '', freeIps: [] })

  // 1. Функция сканирования через FastAPI
  const fetchNetworkInfo = async () => {
    setStep('loading')
    try {
      const response = await fetch("http://localhost:8000/api/v1/cameras/subnet")
      const result = await response.json()

      // Записываем диапазон подсети и свободные IP
      setNetData({
        subnetRange: result.subnet_range || '',
        freeIps: result.free_ips || []
      })
      
      setStep('form') // Сразу переходим к показу формы
    } catch (err) {
      // На случай ошибки бэкенда — всё равно даем открыть форму, просто netData будет пустой
      setStep('form') 
    }
  }
  // 2. Эффект запуска поиска при открытии меню
  useEffect(() => {
    if (isOpen) {
      fetchNetworkInfo()
    } else {
      setStep('loading')
      setNetData({ subnetRange: '', freeIps: [] })
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

      <DropdownMenuContent 
        align="start" 
        className="w-[calc(100vw-32px)] md:w-[480px] bg-slate-900/95 backdrop-blur-md border-white/10 p-5 shadow-2xl rounded-2xl"
      >
        
        {/* 1. СОСТОЯНИЕ ЗАГРУЗКИ (Определение подсети ПК) */}
        {step === 'loading' && (
          <div className="py-10 flex flex-col items-center gap-4 animate-in fade-in duration-200">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest text-center">
              Анализ сети...
            </p>
          </div>
        )}

        {/* 2. СОСТОЯНИЕ ГОТОВОЙ ФОРМЫ */}
        {step === 'form' && (
          <div className="animate-in fade-in duration-300">
            <RtspForm 
              netData={netData} 
              onSuccess={() => setIsOpen(false)} 
            />
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}