import { useState } from "react"
import { IMaskInput } from "react-imask"
import { Loader2, HelpCircle, Eye, EyeOff } from "lucide-react"
import { useCameraStore } from "@/store/useCameraStore"

// Список 5 основных производителей и их типовых путей (хвостов) для RTSP
const CAMERA_BRANDS = [
  { name: "Hikvision", path: "/ISAPI/Streaming/Channels/101" },
  { name: "Dahua", path: "/cam/realmonitor?channel=1&subtype=0" },
  { name: "Xiongmai", path: "/user=admin&password=PASSWORD&channel=1&stream=0.sdp" },
  { name: "Uniview", path: "/unicast/c1/s1/live" }
]

export default function RtspForm({ netData, onSuccess }) {
  const { cameras, addCamera, setActiveCamera } = useCameraStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  // Инициализируем состояние формы
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    ip: "",
    username: "admin", // по умолчанию admin
    password: ""
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault() // предотвращаем перезагрузку страницы
    setError(null)

    // Дополнительная JS-валидация на случай обхода HTML5-проверки
    if (!formData.name.trim() || !formData.brand || !formData.ip.trim() || !formData.username.trim() || !formData.password.trim()) {
      setError("Пожалуйста, заполните все обязательные поля")
      return
    }
    // 2. ПРОВЕРКА НА ДУБЛИКАТ: ищем камеру с таким же IP сторе
    const isCameraExists = cameras.some(cam => cam.ip === formData.ip.trim())

    if (isCameraExists) {
      setError("Камера с таким IP-адресом уже добавлена в список")
      return // Останавливаем выполнение, запрос на бэкенд не пойдет
    }
    setIsLoading(true)
    try {
      // Ищем выбранный бренд, чтобы прикрепить RTSP-хвост
      const selectedBrand = CAMERA_BRANDS.find(b => b.name === formData.brand)
      
      // Отсылаем словарь на бэкенд
      const response = await fetch("http://localhost:8000/api/v1/cameras/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          brand: formData.brand,
          ip: formData.ip,
          username: formData.username,
          password: formData.password,
          rtsp_tail: selectedBrand.path
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail)
      }

      addCamera({
        name: formData.name.trim(),
        brand: formData.brand,
        ip: formData.ip.trim(),
        username: formData.username.trim(),
        password: formData.password,
        port: 554,
        rtsp_tail: selectedBrand.path
      })

      setActiveCamera(formData.ip.trim())
      onSuccess()

    } catch (err) {
      // Сюда попадет или ошибка из throw new Error, или если бэкенд вообще упал/выключен
      setError(err.message || "Ошибка при отправке данных на сервер")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 font-mono text-[10px] text-white/80 animate-in fade-in duration-300">
      
      {/* ИНСТРУКЦИЯ И ПОДСКАЗКА СЕТИ */}
      <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl space-y-2 text-white/60 leading-normal">
  
        {/* Чистая проверка: если строка не пустая (true), показываем сеть. Если пустая (false), показываем помощь */}
        {netData?.subnetRange ? (
          <>
            <div className="flex justify-between items-center text-white/40 border-b border-white/5 pb-1">
              <span>Подсеть вашего ПК:</span>
              <span className="text-sky-400 font-bold">{netData.subnetRange}</span>
            </div>
            
            {netData?.freeIps?.length > 0 && (
              <div className="text-[9px]">
                <span className="text-white/40 block mb-0.5">Свободные IP в сети:</span>
                <div className="text-emerald-400 font-bold flex flex-wrap gap-x-2">
                  {netData.freeIps.slice(0, 4).map(ip => <span key={ip}>● {ip}</span>)}
                </div>
              </div>
            )}

            <p className="text-[12px] pt-1 border-t border-white/5 text-amber-400/80">
              Установите статический IP камеры через утилиту производителя, чтобы он совпадал с подсетью вашего ПК и одним из свободных IP. Задайте пароль, переведите камеру в активное состояние и внесите данные ниже:
            </p>
          </>
        ) : (
          /* Сработает автоматически, если subnetRange равен "" (пустая строка) */
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold border-b border-white/5 pb-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Не удалось определить подсеть ПК</span>
            </div>
            <ol className="list-decimal list-inside text-[12px] text-white/40 space-y-0.5">
              <li>Откройте командную строку Windows (нажмите Win+R затем введите команду <span className="text-white/60 font-mono">cmd</span> и нажмите OK).</li>
              <li>В появившемся окне введите команду <span className="text-white/60 font-mono">ipconfig</span> и нажмите Enter.</li>
              <li>Найдите строку <span className="text-white/60">"IPv4-адрес"</span> цифры после ":" и есть подсеть вашего ПК (обычно это <span className="text-sky-400/80">192.168.1.X</span> или <span className="text-sky-400/80">192.168.0.X</span>).</li>
              <li>Затем откройте утилиту камеры и задайте такой же IP, изменив только цифры после последней точки (например, на <span className="text-emerald-400">.200</span>)эти цифры не должны повторятся с другими устройствами.</li>
            </ol>
          </div>
        )}
      </div>

      {/* ВЫВОД ОШИБКИ */}
      {error && (
        <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 font-bold text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ПОЛЕ: ПРОИЗВОДИТЕЛЬ */}
        <div className="space-y-1.5">
          <label className="text-white/40 uppercase tracking-wider block">Производитель камеры *</label>
          <select
            name="brand"
            required
            value={formData.brand}
            onChange={handleChange}
            disabled={isLoading}
            className={`w-full h-9 bg-slate-950/80 border border-white/10 rounded-xl px-3 outline-none focus:border-sky-500/50 transition-colors cursor-pointer appearance-none ${
              formData.brand ? "text-white text-base" : "text-white/30 text-sm"
            }`}
          >
            <option value="" disabled className="text-white/30">Выберите бренд</option>
            {CAMERA_BRANDS.map((brand) => (
              <option key={brand.name} value={brand.name} className="bg-slate-900 text-white">
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        {/* ПОЛЕ: IP АДРЕС */}
        <div className="space-y-1.5">
          <label className="text-white/40 uppercase tracking-wider block text-[10px]">IP-адрес *</label>
          
          <IMaskInput
             // Разрешаем вводить только цифры и точки
              mask={/^[0-9.]*$/} 
              name="ip"
              required
              value={formData.ip}
              disabled={isLoading}
              placeholder="192.168.68.170"
              
              onAccept={(value) => {
                // На бэкенд улетит чистая строка, которую ввели (например, "192.168.68.170")
                setFormData((prev) => ({ ...prev, ip: value }))
              }}
              
              validate={(value) => {
                // 1. Проверяем, чтобы точек было не больше 3
                const dotCount = (value.match(/\./g) || []).length;
                if (dotCount > 3) return false;

                // 2. Ваша надежная проверка, чтобы ни одно число не было больше 255
                const parts = value.split(".");
                return parts.every(part => part === "" || parseInt(part, 10) <= 255);
              }}
            
            className="w-full h-9 bg-slate-950/80 border border-white/10 rounded-xl px-3 text-white placeholder:text-white/20 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-all text-base font-mono"
          />
        </div>
      </div>

      {/* БЛОК: ЛОГИН / ПАРОЛЬ (В одну строку для экономии места) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-white/40 uppercase tracking-wider block">Логин *</label>
          <input
            type="text"
            name="username"
            required
            value={formData.username}
            onChange={handleChange}
            disabled={isLoading}
            placeholder="admin"
            className="w-full h-9 bg-slate-950/80 border border-white/10 rounded-xl px-3 text-white placeholder:text-white/20 outline-none focus:border-sky-500/50 transition-colors text-base"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-white/40 uppercase tracking-wider block">Пароль *</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              placeholder="из утилиты"
              className="w-full h-9 bg-slate-950/80 border border-white/10 rounded-xl pl-3 pr-10 text-white placeholder:text-white/20 outline-none focus:border-sky-500/50 transition-colors text-base placeholder:text-xs"
            />
            
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {showPassword ? (
                // Показываем обычный глаз, когда пароль открыт (тип text)
                <Eye size={16} />
              ) : (
                // Показываем перечеркнутый глаз, когда пароль скрыт точками (тип password)
                <EyeOff size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ПОЛЕ: ИМЯ КАМЕРЫ */}
      <div className="space-y-1.5">
        <label className="text-white/40 uppercase tracking-wider block">Название камеры в системе *</label>
        <input
          type="text"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Может быть любым (например: Двор)"
          className="w-full h-9 bg-slate-950/80 border border-white/10 rounded-xl px-3 text-white placeholder:text-white/20 outline-none focus:border-sky-500/50 transition-colors text-base placeholder:text-xs"
        />
      </div>

      {/* КНОПКА ОТПРАВКИ */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-9 mt-2 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-800 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Подключение...</span>
          </>
        ) : (
          <span>Подключить камеру</span>
        )}
      </button>
    </form>
  )
}