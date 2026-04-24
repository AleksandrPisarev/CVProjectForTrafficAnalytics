import React, { useState } from "react"
import { useUserStore } from "@/store/useUserStore"

export default function RegisterForm({ setMode }) {
  const { registrationCheck, confirmRegistration, generatedCode } = useUserStore()
  const [error, setError] = useState("")

  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    setError("")

    const formData = new FormData(e.currentTarget)
    const newUser = Object.fromEntries(formData)

    if (generatedCode) {
        const inputCode = formData.get("userCode")
        const result = confirmRegistration(newUser, inputCode)

        if (!result.success) {
           setError("Неверный код подтверждения")
        } 
    }
    else {
         const result = registrationCheck(newUser)

        if (result.success) {
            alert(`[ИМИТАЦИЯ]: Код ${result.code} отправлен на ${newUser.email}`)
        } 
        else {
            switch (result.error) {
                case "user_exists": setError("Эта почта уже занята"); break
                case "invalid_email": setError("Введите корректный адрес почты"); break
                case "empty_fields": setError("Заполните все поля"); break
                default: setError("Ошибка регистрации")
            }
        }
    }
  }

  return (
    <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5">
        <div className={generatedCode ? "hidden" : "flex flex-col gap-4"}>
            {/* Имя */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-cyan-200 uppercase font-black ml-1 tracking-widest">
                    Введите Имя
                </label>
                <input 
                    name="name" 
                    required 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all font-medium" 
                />
            {/* Фамилия */}
            </div>
                <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-cyan-200 uppercase font-black ml-1 tracking-widest">
                    Введите Фамилию
                </label>
                <input 
                    name="surName" 
                    required 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all font-medium" 
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
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all font-medium" 
                    placeholder="mail@example.com"
                />
            </div>
            {/* Пароль */}
            <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-cyan-200 uppercase font-black ml-1 tracking-widest">
                    Введите Пароль
                </label>
                <input 
                    name="password" 
                    type="password" 
                    required 
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all font-medium" 
                    placeholder="••••••••"
                />
            </div>
        </div>

        {/* Ошибка */}
        {error && <p className="text-[10px] text-red-400 font-bold uppercase text-center">{error}</p>}
        
        {generatedCode && (
            <div className="mt-4 flex flex-col gap-2 border-t border-cyan-800 pt-4">
                <p className="text-[10px] text-cyan-400 text-center uppercase">
                    На указанную почту выслан пароль. Введите его ниже:</p>
                <input  name="userCode"
                        required
                        type="text"          
                        inputMode="numeric"    // На телефонах сразу откроется цифровая клавиатура
                        pattern="[0-9]*"       // Разрешаем только цифры
                        maxLength="4"        
                        placeholder="0000"
                        className="bg-transparent border border-cyan-400 text-center text-white text-xl"
                />
            </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-3 mt-2">
            <button type="submit" className="flex-1 py-3 rounded-xl cursor-pointer transition-all
                                            bg-white/5 border border-white/10 
                                            text-cyan-400 font-black text-[10px] uppercase tracking-widest
                                            hover:bg-white/10 hover:border-cyan-500/50">
                {generatedCode ? "Подтвердить" : "Регистрация"}
            </button>
            <button type="button" onClick={() => generatedCode ? useUserStore.setState({ generatedCode: null }) : setMode("login")} 
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