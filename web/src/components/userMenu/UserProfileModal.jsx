import { createPortal } from 'react-dom'
import React, { useState } from 'react'
import { X, Trash2, Save } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { useCameraStore } from '@/store/useCameraStore'

export default function UserProfileModal({ onClose }) {
  const { currentUser } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' }) // Для вывода ошибок или успеха прямо в модалке
  const [isDeleteConfirm, setIsDeleteConfirm] = useState(false) // Для двухэтапного удаления

  const [isVerification, setIsVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')

  // Логика изменения
  const handleChangeAccount = async (e) => {
    e.preventDefault()
    setMessage({ text: '', type: '' })

    // 1. Извлекаем данные из всех заполненных инпутов формы
    const form = new FormData(e.target)
    const submittedData = Object.fromEntries(form.entries())

    // 2. Скрытым циклом отсекаем пустые и неизмененные поля
    const changedFields = Object.fromEntries(
      Object.entries(submittedData).filter(([key, value]) => {
        if (key === 'password') return value.trim() !== ''
        return value.trim() !== '' && value !== currentUser[key]
      })
    )

    // 3. Если после фильтрации объект пуст — выводим сообщение и прерываем
    if (Object.keys(changedFields).length === 0) {
      setMessage({ text: 'Вы не внесли никаких изменений.', type: 'error' })
      return 
    }

    setLoading(true)

    try {
      // Отправляем запрос, используя email текущего пользователя как уникальный ключ
      const response = await fetch(`http://localhost:8000/api/v1/users/${currentUser.email}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changedFields)
      })

      const data = await response.json()

      if (response.ok) {
        if (data.verification_required) {
          setIsVerification(true) // Поля станут readOnly, появится поле для кода
          setMessage({ text: 'Код подтверждения отправлен на новую почту!', type: 'success' })
        } else {
          useUserStore.setState({ currentUser: data.user })
          setMessage({ text: 'Данные успешно сохранены!', type: 'success' })
          setTimeout(() => onClose(), 1500)
        }
      } else {
        setMessage({ text: data.detail || 'Не удалось обновить данные.', type: 'error' })
      }

    } catch (error) {
      setMessage({ text: 'Ошибка соединения с сервером', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Функция отправки кода верификации (Шаг 2 - POST)
  const handleConfirmCode = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    // Вытаскиваем актуальный email из инпута формы на момент отправки кода
    const currentFormEmail = new FormData(e.target).get('email')

    try {
      const response = await fetch(`http://localhost:8000/api/v1/users/${currentUser.email}/confirm-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_email: currentFormEmail, // Обязательное поле для схемы Pydantic
          code: verificationCode       // 4-значный код из стейта
        })
      })
      const data = await response.json()

      if (response.ok) {
        useUserStore.setState({ currentUser: data.user })
        setMessage({ text: 'Профиль и почта успешно обновлены!', type: 'success' })
        setTimeout(() => onClose(), 1500)
      } else {
        setMessage({ text: data.detail || 'Неверный код подтверждения.', type: 'error' })
      }
    } catch (error) {
      setMessage({ text: 'Ошибка соединения с сервером', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Логика удаления
  const handleDeleteAccount = async () => {
    // Этап 1: Если пользователь нажал первый раз, просто просим подтверждения
    if (!isDeleteConfirm) {
      setIsDeleteConfirm(true)
      return
    }

    // Этап 2: Если нажал второй раз — удаляем
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/v1/users/${currentUser.email}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Сбрасываем все состояния. React сам перенаправит на рекламную страницу
        useCameraStore.setState({ activeCamera: [] })
        useUserStore.setState({ currentUser: null })
        onClose() // Закрываем модалку (на всякий случай)
      } else {
        const errorData = await response.json()
        setMessage({ text: errorData.detail || 'Не удалось удалить аккаунт', type: 'error' })
        setIsDeleteConfirm(false) // Сбрасываем кнопку удаления обратно
      }
    } catch (error) {
      setMessage({ text: 'Ошибка при удалении аккаунта', type: 'error' })
      setIsDeleteConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20 overflow-hidden pt-2 pr-8">
      <div className="w-full max-w-sm bg-slate-900 border border-white/10 h-auto self-start p-6 shadow-2xl relative text-slate-300 rounded-xl animate-in slide-in-from-right duration-200">
        
        {/* Крестик закрывает модалку через вызов onClose */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 hover:rotate-90"
          title="Закрыть" >
          <X size={18} />
        </button>

        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          Редактировать профиль
          <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-normal">
            {currentUser?.status}
          </span>
        </h2>

        {/* Вывод сообщений об успехе или ошибке */}
        {message.text && (
          <div className={`p-2.5 rounded text-xs font-medium mb-4 ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={isVerification ? handleConfirmCode : handleChangeAccount} className="space-y-4">
          {/* Инпут Имени */}
          <div>
            <label className="block text-[10px] text-cyan-400 uppercase font-black ml-1 tracking-widest mb-1">Имя</label>
            <input 
              type="text" 
              name="name" 
              defaultValue={currentUser?.name} 
              readOnly={isVerification} 
              className={`w-full border rounded px-3 py-2 text-sm text-white focus:outline-none transition-colors ${
                isVerification ? 'bg-white/[0.01] border-white/5 text-slate-500' : 'bg-white/[0.03] border border-white/10 focus:border-cyan-500'
              }`}
              required 
            />
          </div>

          {/* Инпут Фамилии */}
          <div>
            <label className="block text-[10px] text-cyan-400 uppercase font-black ml-1 tracking-widest mb-1">Фамилия</label>
            <input 
              type="text" 
              name="surname" 
              defaultValue={currentUser?.surname} 
              readOnly={isVerification}
              className={`w-full border rounded px-3 py-2 text-sm text-white focus:outline-none transition-colors ${
                isVerification ? 'bg-white/[0.01] border-white/5 text-slate-500' : 'bg-white/[0.03] border border-white/10 focus:border-cyan-500'
              }`}
              required 
            />
          </div>

          {/* Инпут Email */}
          <div>
            <label className="block text-[10px] text-cyan-400 uppercase font-black ml-1 tracking-widest mb-1">Email</label>
            <input 
              type="email" 
              name="email" 
              defaultValue={currentUser?.email} 
              readOnly={isVerification}
              className={`w-full border rounded px-3 py-2 text-sm text-white focus:outline-none transition-colors ${
                isVerification ? 'bg-white/[0.01] border-white/5 text-slate-500' : 'bg-white/[0.03] border border-white/10 focus:border-cyan-500'
              }`}
              required 
            />
          </div>

          {/* Инпут Пароля */}
          <div>
            <label className="block text-[10px] text-cyan-400 uppercase font-black ml-1 tracking-widest">
              Новый Пароль
              <span className="block text-[9px] text-cyan-200/60 normal-case font-normal mt-0.5 tracking-normal">
                (оставьте пустым, если не хотите менять)
              </span>
            </label>
            <input 
              type="password" 
              name="password" 
              placeholder="••••••••" 
              readOnly={isVerification}
              className={`w-full border rounded px-3 py-2 text-sm text-white focus:outline-none transition-colors mt-1
                          [&::-ms-reveal]:invert [&::-ms-reveal]:hue-rotate-180
                          [&::-webkit-password-toggle]:invert [&::-webkit-password-toggle]:hue-rotate-180 ${
                          isVerification ? 'bg-white/[0.01] border-white/5 text-slate-500' : 'bg-white/[0.03] border border-white/10 focus:border-cyan-500'
              }`}
            />
          </div>

          {/* ПОЛЕ КОДА: Появляется ниже остальных инпутов только когда включен флаг верификации */}
          {isVerification && (
            <div className="pt-2 border-t border-cyan-500/20 space-y-1 animate-fade-in">
              <label className="block text-[10px] text-emerald-400 uppercase font-black ml-1 tracking-widest">
                Код подтверждения
              </label>
              <input 
                type="text" 
                maxLength={4}
                placeholder="0000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))} 
                className="w-full bg-white/[0.03] border border-emerald-500/30 rounded px-3 py-2 text-center text-lg font-bold text-white tracking-widest focus:outline-none focus:border-emerald-500"
                required 
              />
            </div>
          )}

          {/* КНОПКА ОТПРАВКИ: Меняет текст и цвет в зависимости от функции */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading} 
              className={`w-full text-white font-medium text-sm py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                isVerification ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'
              }`}
            >
              {isVerification ? 'Подтвердить код' : 'Сохранить'}
            </button>
          </div>
        </form>

        <div className="border-t border-white/10 my-5" />

        {/* Безопасная зона удаления */}
        <div className={`flex items-center justify-between p-3 rounded transition-colors ${isDeleteConfirm ? 'bg-red-500/10 border border-red-500/40' : 'bg-red-500/5 border border-red-500/20'}`}>
          <div>
            <p className="text-xs font-bold text-red-400">Удаление аккаунта</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isDeleteConfirm ? 'Это действие необратимо!' : 'Все ваши данные будут стерты'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={loading}
            className={`px-3 py-1.5 rounded text-xs font-medium border transition-all flex items-center gap-1.5 ${
              isDeleteConfirm 
                ? 'bg-red-600 border-red-600 text-white hover:bg-red-500 animate-pulse' 
                : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
            }`}
          >
            <Trash2 size={14} />
            {isDeleteConfirm ? 'Вы уверены?' : 'Удалить'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}