import React, { useState } from "react"
import { useUserStore } from "@/store/useUserStore"
import { useCameraStore } from "@/store/useCameraStore"

export default function LoginForm({ setMode }) {
    const { login, resetPassword, confirmResetPassword } = useUserStore()
    const [loginError, setLoginError] = useState("")
    const [successMessage, setSuccessMessage] = useState("")
    const [loading, setLoading] = useState(false)
    
    // Стейт этапа сброса пароля (0 - обычный вход, 1 - ввод кода сброса)
    const [resetStage, setResetStage] = useState(0)

    const handleLoginSubmit = async (e) => {
        e.preventDefault()
        setLoginError("")
        setSuccessMessage("")
        
        const formData = new FormData(e.currentTarget)
        const email = formData.get("email")
        const password = formData.get("password")

        // Если мы на этапе 1 (ввод кода подтверждения сброса)
        if (resetStage === 1) {
            const inputCode = formData.get("resetCode")
            setLoading(true)
            // Отправляем код и почту на бэкенд
            const result = await confirmResetPassword(email, inputCode)
            setLoading(false)

            if (result.success) {
                setSuccessMessage("Новый временный пароль успешно отправлен на Вашу почту!")
                setResetStage(0) // Сбрасываем этап обратно для ввода нового пароля
            } else {
                 switch (result.error) {
                    case "code_expired":
                        setLoginError("Время действия кода (5 минут) истекло. Запросите код заново.")
                        setResetStage(0) // Возвращаем форму в начало, чтобы пользователь мог нажать "выслать на почту"
                        break
                    case "invalid_code":
                        setLoginError("Неверный код! Ради безопасности он аннулирован. Запросите новый код.")
                        setResetStage(0) // Сбрасываем форму, так как старый код больше не действителен
                        break
                    default:
                        setLoginError("Не удалось проверить код. Повторите попытку позже.")
                  }
              }
            return
        }

        // Обычная авторизация (Stage 0)
        setLoading(true)
        const result = await login(email, password)
        setLoading(false)

        if (!result.success) {
            switch (result.error) {
                case "empty_fields": setLoginError("Заполните все поля формы"); break
                case "no_user": setLoginError("Данный пользователь не зарегистрирован"); break
                case "wrong_password": setLoginError("Неверный пароль. Восстановить?"); break
                default: setLoginError("Ошибка сервера. Попробуйте позже")
            }
        } else {
          useCameraStore.setState({ cameras: result.data })
        }
    }

    const handleResetPassword = async () => {
        const emailInput = document.getElementById("login-email")
        const email = emailInput?.value

        setLoginError("")
        setSuccessMessage("")

        setLoading(true)
        const result = await resetPassword(email)
        setLoading(false)

        if (result.success) {
            // Включаем этап 1. Инпут почты заморозится, появится инпут для кода
            setResetStage(1)
            setSuccessMessage(`Код подтверждения отправлен на почту ${email}`)
        } 
        else {
            // Если почты нет в базе, resetStage остается 0, поле почты доступно!
            setResetStage(0)
            switch (result.error) {
                case "empty_fields": setLoginError("Введите Email для восстановления"); break
                case "no_user": setLoginError("Пользователь с такой почтой не найден"); break
                default: setLoginError("Не удалось отправить письмо. Повторите позже")
            }
        }
    }

    return(
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
            <div className="space-y-4">
              {/* Поле Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-cyan-400 uppercase font-black ml-1 tracking-widest">
                  Введите Email
                </label>
                <input 
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  disabled={loading}
                  // Поле становится только для чтения, если код успешно улетел
                  readOnly={resetStage === 1}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-all disabled:opacity-50 read-only:opacity-50 read-only:cursor-not-allowed"
                  placeholder="mail@example.com"
                />
              </div>

              {/* Поле Пароль — скрываем его, если вводим код сброса */}
              {resetStage === 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-cyan-400 uppercase font-black ml-1 tracking-widest">
                    Введите Пароль
                      <span className="block text-[9px] text-cyan-600 normal-case font-normal mt-0.5 tracking-normal">
                        должен содержать не менее 3-х символов
                      </span>
                  </label>
                  <input 
                    name="password"
                    type="password"
                    required
                    disabled={loading}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all font-medium disabled:opacity-50
                              [&::-ms-reveal]:invert [&::-ms-reveal]:hue-rotate-180
                              [&::-webkit-password-toggle]:invert [&::-webkit-password-toggle]:hue-rotate-180" 
                    placeholder="••••••••"
                  />
                </div>
              )}
              
              {/* Инпут для 4-значного кода сброса */}
              {resetStage === 1 && (
                <div className="mt-2 flex flex-col gap-2 border-t border-cyan-800 pt-4 transition-all">
                    <p className="text-[10px] text-cyan-400 text-center uppercase tracking-wider">
                        Для получения пароля введите код, отправленный на указанный адрес:</p>
                    <input  name="resetCode"
                            required
                            type="text"          
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength="4"        
                            placeholder="0000"
                            disabled={loading}
                            className="bg-transparent border border-cyan-400 text-center text-white text-xl py-1.5 outline-none rounded-lg focus:border-cyan-300 disabled:opacity-50"
                    />
                </div>
              )}
            </div>
            
            {/* Блок ошибок и ссылка на сброс */}
            {loginError && (
              <p className="text-[10px] text-red-400 font-bold uppercase text-center animate-pulse">
                {loginError}
                {/* Ссылку показываем только на этапе 0, если пароль неверный */}
                {loginError.includes("Восстановить") && resetStage === 0 && (
                  <span onClick={handleResetPassword} className="block text-cyan-400 underline cursor-pointer mt-1 lowercase tracking-wider hover:text-cyan-300">
                    выслать на почту
                  </span>
                )}
              </p>
            )}

            {/* Блок для успешного текста */}
            {successMessage && (
              <p className="text-[10px] text-cyan-400 font-bold uppercase text-center tracking-wide leading-relaxed">
                {successMessage}
              </p>
            )}

            {/* Блок с кнопками */}
            <div className="flex gap-3 mt-2">
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl cursor-pointer transition-all
                            bg-white/5 border border-white/10 
                            text-cyan-400 font-black text-[10px] uppercase tracking-widest
                            hover:bg-white/10 hover:border-cyan-500/50 disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? "Загрузка..." : (resetStage === 1 ? "Подтвердить код" : "Авторизоваться")}
              </button>
              
              <button 
                type="button"
                disabled={loading}
                onClick={() => resetStage === 1 ? setResetStage(0) : setMode("register")}
                className="flex-1 py-3 rounded-xl cursor-pointer transition-all
                            bg-white/5 border border-white/10 
                            text-cyan-400 font-black text-[10px] uppercase tracking-widest
                            hover:bg-white/10 hover:border-cyan-500/50 disabled:opacity-40">
                {resetStage === 1 ? "Отмена" : "Регистрация"}
              </button>
            </div>
        </form>
    )
}