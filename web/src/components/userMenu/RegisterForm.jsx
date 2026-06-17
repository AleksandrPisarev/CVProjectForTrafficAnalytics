import React, { useState } from "react"
import { useUserStore } from "@/store/useUserStore"

export default function RegisterForm({ setMode }) {
  const { registrationCheck, confirmRegistration, generatedCode } = useUserStore()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false) // Стейт для заморозки кнопки отправки

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError("")

    const formData = new FormData(e.currentTarget)
    const newUser = Object.fromEntries(formData)

    if (generatedCode) {
        setLoading(true)
        const inputCode = formData.get("userCode")
        const result = await confirmRegistration(newUser, inputCode)
        setLoading(false)

        if (!result.success) {
           switch (result.error) {
                case "invalid_code": 
                    setError("Неверный код подтверждения. Проверьте цифры из письма"); break
                case "server_error": 
                    setError("Ошибка на сервере при записи. Повторите попытку позже"); break
                default: 
                    setError("Не удалось завершить регистрацию")
           }
        } 
    }
    else {
        setLoading(true) // Замораживаем кнопку, пока бэкенд проверяет и шлет письмо
        const result = await registrationCheck(newUser)
        setLoading(false) // Размораживаем кнопку после ответа

        if (!result.success) {
           switch (result.error) {
                case "user_exists": setError("Пользователь с такой почтой уже зарегистрирован"); break
                case "invalid_email": setError("Введите корректный адрес почты"); break
                case "empty_fields": setError("Заполните все поля"); break
                case "email_send_failed": setError("Не удалось отправить код на почту. Проверьте адрес или повторите позже"); break
                default: setError("Ошибка на сервере, повторите попытку позже")
            }
        } 
    }
  }

  return (
    <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-4">
            {/* Имя */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-cyan-200 uppercase font-black ml-1 tracking-widest">
                    Введите Имя
                </label>
                <input 
                    name="name" 
                    required 
                    readOnly={generatedCode || loading} // Блокируем, если код выслан или идет загрузка
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all font-medium read-only:opacity-40 disabled:cursor-not-allowed" 
                />
            </div>
            {/* Фамилия */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-cyan-200 uppercase font-black ml-1 tracking-widest">
                    Введите Фамилию
                </label>
                <input 
                    name="surName" 
                    required 
                    readOnly={generatedCode || loading}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all font-medium read-only:opacity-40 disabled:cursor-not-allowed" 
                />
            </div>
            {/* Email */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-cyan-200 uppercase font-black ml-1 tracking-widest">
                    Введите Email
                </label>
                <input 
                    name="email" 
                    type="email" 
                    required 
                    readOnly={generatedCode || loading}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all font-medium read-only:opacity-40 disabled:cursor-not-allowed" 
                    placeholder="mail@example.com"
                />
            </div>
            {/* Пароль */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-cyan-200 uppercase font-black ml-1 tracking-widest">
                    Введите Пароль (должен содержать не менее 3-х символов)
                </label>
                <input 
                    name="password" 
                    type="password" 
                    required 
                    readOnly={generatedCode || loading}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all font-medium read-only:opacity-40 disabled:cursor-not-allowed
                              [&::-ms-reveal]:invert [&::-ms-reveal]:hue-rotate-180
                              [&::-webkit-password-toggle]:invert [&::-webkit-password-toggle]:hue-rotate-180" 
                    placeholder="••••••••"
                />
            </div>
        </div>

        {/* Ошибка */}
        {error && <p className="text-[10px] text-red-400 font-bold uppercase text-center">{error}</p>}
        
        {/* Блок плавно появляется снизу основных полей */}
        {generatedCode && (
            <div className="mt-2 flex flex-col gap-2 border-t border-cyan-800 pt-4 transition-all">
                <p className="text-[10px] text-cyan-400 text-center uppercase tracking-wider">
                    На указанный Вами почтовый адрес отправлен код. Введите его ниже:</p>
                <input  name="userCode"
                        required
                        type="text"          
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength="4"        
                        placeholder="0000"
                        disabled={loading} // Блокируем ввод, если идет финальная отправка в базу
                        className="bg-transparent border border-cyan-400 text-center text-white text-xl py-1.5 outline-none rounded-lg focus:border-cyan-300 disabled:opacity-50"
                />
            </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-3 mt-2">
            <button type="submit" 
                    disabled={loading} // Кнопка гаснет во время сетевых запросов
                    className="flex-1 py-3 rounded-xl cursor-pointer transition-all
                               bg-white/5 border border-white/10 
                               text-cyan-400 font-black text-[10px] uppercase tracking-widest
                               hover:bg-white/10 hover:border-cyan-500/50
                               disabled:opacity-40 disabled:cursor-not-allowed">
                {loading ? "Проверка..." : (generatedCode ? "Подтвердить" : "Регистрация")}
            </button>
            <button type="button" 
                    onClick={() => generatedCode ? useUserStore.setState({ generatedCode: null }) : setMode("login")} 
                    className="flex-1 py-3 rounded-xl cursor-pointer transition-all
                               bg-white/5 border border-white/10 
                               text-cyan-400 font-black text-[10px] uppercase tracking-widest
                               hover:bg-white/10 hover:border-cyan-500/50">
                Назад
            </button>
        </div>
    </form>
  )
}