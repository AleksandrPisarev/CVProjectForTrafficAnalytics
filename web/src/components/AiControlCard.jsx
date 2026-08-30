import React, { useState } from 'react'
import { Card } from "@/components/ui/card"
import { useCameraStore } from "@/store/useCameraStore"
import { Cpu, AlertTriangle } from "lucide-react"

export default function AiControlCard({ activeCamera, metrics }) {
  const { cameras, startCalibration, stopCalibration, sendCarId, saveMaxSpeed } = useCameraStore()

  // Изолированные состояния для инпутов (индекс по IP камеры)
  const [calibSpeeds, setCalibSpeeds] = useState({})
  const [carIds, setCarIds] = useState({})
  const [maxSpeeds, setMaxSpeeds] = useState({})
  const [errors, setErrors] = useState({})

  // Функция фильтрации ввода: разрешает только неотрицательные целые числа
  const handleNumberChange = (ip, value, setValuesSetter) => {
    // Регулярное выражение пропускает только цифры (запрещает минус, точки, буквы)
    if (/^\d*$/.test(value)) {
      setValuesSetter(prev => ({ ...prev, [ip]: value }))
    }
  }

  // Функция вызова калибровки с обработкой ошибок
  const handleStart = async (ip) => {
    // Очищаем прошлую ошибку для этой камеры перед новым запросом
    setErrors(prev => ({ ...prev, [ip]: null }))
    const speed = calibSpeeds[ip]?.trim()

    if (!speed) {
      setErrors(prev => ({ ...prev, [ip]: 'Введите скорость автомобиля' }))
      return
    }
    
    const errorResult = await startCalibration(ip, speed)
    
    if (errorResult) {
      // Если функция вернула строку с ошибкой, записываем её в стейт
      setErrors(prev => ({ ...prev, [ip]: errorResult }))
    }
  }

  // Функция остановки калибровки с обработкой ошибок
  const handleStop = async (ip) => {
    setErrors(prev => ({ ...prev, [ip]: null }))
    const errorResult = await stopCalibration(ip)
    if (errorResult) {
      setErrors(prev => ({ ...prev, [ip]: errorResult }))
    }
  }

  // Обработчик отправки ID на бэкенд
  const handleSendCarId = async (ip) => {
    const currentId = carIds[ip]?.trim()

    // Очищаем прошлую ошибку перед запросом
    setErrors(prev => ({ ...prev, [ip]: null }))
    
    // ПРОВЕРКА НА ПУСТОЕ ПОЛЕ
    if (!currentId) {
      setErrors(prev => ({ ...prev, [ip]: 'Введите ID автомобиля' }))
      return
    }
    
    // Отправляем на бэкенд
    const errorResult = await sendCarId(ip, currentId)
    
    if (errorResult) {
      // Сюда прилетит ошибка: "Данные по ID ... не найдены или точек слишком мало!"
      setErrors(prev => ({ ...prev, [ip]: errorResult }))
    }
  }

  // Обработчик нажатия на кнопку СОХР при задании максимальной скорости
  const handleSaveMaxSpeed = async (ip) => {
    // 1. Первым делом полностью стираем старую ошибку для этой камеры
    setErrors(prev => ({ ...prev, [ip]: null }))

    const currentSpeed = maxSpeeds[ip]?.trim()

    // 2. Проверяем на пустое поле
    if (!currentSpeed) {
      setErrors(prev => ({ ...prev, [ip]: 'Поле не может быть пустым' }))
      return
    }

    // 3. Отправляем строго по клику
    const errorResult = await saveMaxSpeed(ip, currentSpeed)
    if (errorResult) {
      // Если бэк вернул ошибку, пишем её на экран
      setErrors(prev => ({ ...prev, [ip]: errorResult }))
    }
  }

  // Проверяем, есть ли вообще хотя бы одна камера с включенным ИИ
  // Если у всех камер is_AI_active === false, то карточку целиком скрываем
  const hasActiveAi = activeCamera.some(ip => metrics?.[ip]?.is_AI_active === true)
  
  if (!hasActiveAi) {
    return null
  }

  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-2xl p-4 flex flex-col gap-3">
      
      {/* Шапка ОДНА на всю карточку — экономит кучу высоты экранного пространства */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <label className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold">
          калибовка камер
        </label>
        <Cpu className="w-5 h-5 text-sky-400 opacity-80" />
      </div>

      {/* Сетка строк камер (в 2 колонки, если камер много) */}
      <div className={`flex flex-col gap-2.5`}>
        {activeCamera.map((ip) => {
          const cameraMetrics = metrics?.[ip] || {}
          const is_AI_active = cameraMetrics.is_AI_active ?? false
          const is_calibrated = cameraMetrics.is_calibrated ?? false
          const On_Off_data_Cy = cameraMetrics.On_Off_data_Cy ?? false
          // Флаг от бэкенда, означающий что сбор точек окончен и сервер ждет ID автомобиля
          const waiting_for_id = cameraMetrics.waiting_for_id ?? false

          // Если для конкретной камеры ИИ выключен — её плашку внутри сетки не рисуем
          if (!is_AI_active) return null

          const cameraName = cameras.find(cam => cam.ip === ip)?.name || ip

          return (
            <div key={ip} className="flex flex-col gap-2 bg-white/[0.02] p-2.5 rounded-lg border border-white/5 font-mono text-xs text-slate-300">
              
              {/* Название камеры */}
              <div className="text-[11px] font-bold text-slate-400 truncate border-b border-white/[0.02] pb-1">
                {cameraName}
              </div>

              {/* Контент стейт-машины для этой камеры */}
              <div className="flex flex-col gap-1.5">
                
                {/* ИИ включен, но камера НЕ откалибрована */}
                {!is_calibrated && (
                  <>
                    {/* Ожидание запуска сбора данных */}
                    {!On_Off_data_Cy && !waiting_for_id && (
                      <div className="grid grid-cols-[1fr_2fr] gap-2 w-full">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="скорость км/ч"
                          value={calibSpeeds[ip] || ''}
                          onChange={(e) => handleNumberChange(ip, e.target.value, setCalibSpeeds)}
                          className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 font-bold focus:outline-none focus:border-sky-500 text-center transition"
                        />
                        <button 
                          className="w-full py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 text-sky-300 rounded font-bold uppercase text-[9px] tracking-wider transition truncate"
                          onClick={() => handleStart(ip)}
                        >
                          Запустить калибровку
                        </button>
                      </div>
                    )}

                    {/* Идет сбор данных */}
                    {On_Off_data_Cy && (
                      <button 
                        className="w-full py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 rounded font-bold uppercase text-[9px] tracking-wider transition"
                        onClick={() => handleStop(ip)}
                      >
                        Остановить калибровку
                      </button>
                    )}

                    {/* Сбор остановлен, вводим ID */}
                    {waiting_for_id && (
                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider block">
                          ⚠️ Точки собраны. Введите ID:
                        </span>
                        <div className="grid grid-cols-[1fr_2fr] gap-2 w-full">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="ID авто"
                            value={carIds[ip] || ''}
                            onChange={(e) => handleNumberChange(ip, e.target.value, setCarIds)}
                            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 font-bold focus:outline-none focus:border-sky-500 text-center transition"
                          />
                          <button 
                            className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white rounded border border-white/10 font-bold text-[9px] uppercase tracking-wider transition truncate"
                            onClick={() => handleSendCarId(ip)}
                          >
                            Отправить
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Камера успешно откалибрована */}
                {is_calibrated && (
                  <div className="flex flex-col gap-1.5 w-full">
                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">
                      ✓ Откалибрована
                    </span>
                    <div className="grid grid-cols-[1fr_2fr] gap-2 w-full">
                      <input
                        type="text" // Используем text вместо number, чтобы регулярка жестко блокировала ввод минуса и точек
                        inputMode="numeric"
                        placeholder="макс скорость"
                        value={maxSpeeds[ip] || ''}
                        onChange={(e) => handleNumberChange(ip, e.target.value, setMaxSpeeds)}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 font-bold focus:outline-none focus:border-emerald-500 text-center transition"
                      />
                      <button 
                        className="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded font-bold text-[9px] uppercase tracking-wider transition truncate"
                        onClick={() => handleSaveMaxSpeed(ip)}
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                )}

                {/* КРАСИВЫЙ ИНТЕРФЕЙС ОШИБКИ (выводится только если ошибка есть для этого IP) */}
                {errors[ip] && (
                  <div className="mt-1 flex items-start gap-1.5 p-1.5 rounded border border-rose-500/20 bg-rose-500/10 text-rose-400 text-[9px] leading-tight uppercase font-bold tracking-wide">
                    <AlertTriangle className="w-3 network-error-icon h-3 text-rose-400 flex-shrink-0 mt-0.5" />
                    <span>{errors[ip]}</span>
                  </div>
                )}

              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}