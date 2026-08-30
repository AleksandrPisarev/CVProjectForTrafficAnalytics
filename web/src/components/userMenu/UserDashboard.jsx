import React, { useState } from 'react'
import { Search, Settings, Users, LogOut, UserPen } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useCameraStore } from '@/store/useCameraStore'
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import UserProfileModal from './UserProfileModal'

export default function UserDashboard({ setMode }) {
  const { currentUser, checkSessionStatus } = useUserStore()

   // Состояние для открытия/закрытия модального окна профиля
  const [isProfileOpen, setIsProfileOpen] = useState(false)
   // Состояния для лоадера и текста ошибки ограничений
  const [isChecking, setIsChecking] = useState(false)
  const [statusError, setStatusError] = useState("")

  const isAdmin = currentUser?.status === 'admin'

  // Функция проверки статуса сессии при клике на редактировать профиль
  const handleEditProfileClick = async () => {
    setIsChecking(true)
    setStatusError("") // Сбрасываем старый текст

    // Делаем запрос к БД через Zustand
    const result = await checkSessionStatus()
    
    setIsChecking(false)

    if (result.success) {
      if (result.auth_type === 'by_password') {
        // Если вошел по паролю — открываем модалку профиля
        setIsProfileOpen(true)
      } else {
        // Если автоматически по сессии — выводим текст предупреждения
        setStatusError("Действие разрешено только при входе по паролю")
      }
    } else {
      setStatusError("Сессия недействительна. Перезайдите в аккаунт.")
    }
  }

  const handleLogout = async () => {
    try {
      // Отправляем POST запрос-команду на бэкенд без тела (body), 
      // чтобы сервер затушил все 12 потоков детекции
      await fetch('http://localhost:8000/api/v1/cameras/stop-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error("Не удалось остановить камеры на сервере:", error)
    } finally {
      // Блок finally выполнится ВСЕГДА (даже если сервер выключен или сеть упала).
      // Это гарантирует, что пользователь в любом случае выйдет из системы интерфейса.
      
      // Сбрасываем пользователя
      useUserStore.setState({ currentUser: null })
      
      // Очищаем хранилище камер через setState 
      useCameraStore.setState({ activeCamera: [] })
      
      // Закрываем режим дашборда
      setMode(null)
    }
  }

  return (
    <div className="flex flex-col text-slate-300">
      {/* Шапка меню */}
      <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10">
        <p className="text-sm font-bold text-white truncate">
          {currentUser?.name} {currentUser?.surname}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-cyan-400 mt-0.5">
          {currentUser?.status}
        </p>
      </div>

      <div className="py-1">
        <div 
          onClick={isChecking ? null : handleEditProfileClick}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors group"
        >
          <UserPen size={16} className="text-slate-500 group-hover:text-cyan-400" />
          <span className="text-sm">
            {isChecking ? "Проверка доступа" : "Редактировать профиль"}
          </span>
        </div>

        {/* Текст предупреждения, если у пользователя нет прав */}
        {statusError && (
          <p className="px-4 py-1.5 text-[8.5px] text-red-400 font-bold uppercase tracking-wide leading-relaxed bg-red-500/5 border-y border-red-500/10 animate-pulse">
            {statusError}
          </p>
        )}

        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors group">
          <Search size={16} className="text-slate-500 group-hover:text-cyan-400" />
          <span className="text-sm">Поиск</span>
        </div>

        <div className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
          isAdmin ? "hover:bg-white/5 cursor-pointer group" : "opacity-20"}`}>
          <Settings size={16} className={isAdmin ? "text-slate-500 group-hover:text-cyan-400" : "text-slate-500"} />
          <span>Настройки</span>
        </div>

        <div className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
          isAdmin ? "hover:bg-white/5 cursor-pointer group" : "opacity-20"}`}>
          <Users size={16} className={isAdmin ? "text-slate-500 group-hover:text-cyan-400" : "text-slate-500"} />
          <span>Пользователи</span>
        </div>

        {/* Обертка DropdownMenuItem нужна чтобы закрывалось меню при нажатии на кнопку выход */}
        <DropdownMenuItem 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 cursor-pointer transition-colors group">
          <LogOut size={16} className="text-slate-500 group-hover:text-red-500" />
          <span className="text-sm group-hover:text-red-500 font-medium">Выход</span>
        </DropdownMenuItem>
      </div>
      {/* Модальное окно профиля */}
      {isProfileOpen && (
        <UserProfileModal onClose={() => setIsProfileOpen(false)} />
      )}
    </div>
  )
}