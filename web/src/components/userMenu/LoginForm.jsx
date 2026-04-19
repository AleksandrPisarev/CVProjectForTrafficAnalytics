import React, { useState } from "react"
import { useUserStore } from "./store/useUserStore"

export default function LoginForm({ setMode }) {
    const { login, getPasswordByEmail } = useUserStore()
    const [loginError, setLoginError] = useState("")

    const handleLoginSubmit = (e) => {
        e.preventDefault();
        setLoginError(""); 
        const formData = new FormData(e.currentTarget);
        
        // Получаем "посылку" из Zustand
        const result = login(formData.get("email"), formData.get("password"))

        if (!result.success) {
            if (result.error === "no_user") {
                setLoginError("Данный пользователь не зарегистрирован")
            } 
            else if (result.error === "wrong_password") {
                setLoginError("Неверный пароль. Восстановить?")
            }
        }
    }

    const handleResetPassword = () => {
        const emailInput = document.getElementById("login-email")
        const email = emailInput?.value;

        if (!email) {
            setLoginError("Введите Email для восстановления")
            return;
        }

        const password = getPasswordByEmail(email);

        if (password) {
            // Имитация отправки письма
            alert(`
            📧 ПИСЬМО ОТПРАВЛЕНО!
            ---------------------------
            Кому: ${email}
            Тема: Восстановление пароля
            
            Ваш текущий пароль: ${password}
            ---------------------------
            (В реальности это письмо пришло бы на почту)
            `);
            setLoginError(""); 
        } 
        else {
            setLoginError("Пользователь с такой почтой не найден");
        }
    }

    return(
        <form  onSubmit= {handleLoginSubmit} className="flex flex-col gap-5">
            <div className="space-y-4">
              {/* Поле Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-cyan-200 uppercase font-black ml-1 tracking-widest">
                  Введите Email
                </label>
                <input 
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-all"
                  placeholder="mail@example.com"
                />
              </div>

              {/* Поле Пароль */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-cyan-200 uppercase font-black ml-1 tracking-widest">
                  Введите Пароль
                </label>
                <input 
                  name="password"
                  type="password"
                  required
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            {/* ВСТАВЛЯЕМ ОШИБКУ */}
            {loginError && (
              <p className="text-[10px] text-red-400 font-bold uppercase text-center animate-pulse">
                {loginError}
                {loginError.includes("Восстановить") && (
                  <span onClick={handleResetPassword} className="block text-cyan-400 underline cursor-pointer mt-1 lowercase">
                    выслать на почту
                  </span>
                )}
              </p>
            )}

            {/* Блок с кнопками */}
            <div className="flex gap-3 mt-2">
              <button 
                type="submit"
                className=" flex-1 py-3 rounded-xl cursor-pointer transition-all
                            bg-white/5 border border-white/10 
                            text-cyan-400 font-black text-[10px] uppercase tracking-widest
                            hover:bg-white/10 hover:border-cyan-500/50"
              >
                Авторизоваться
              </button>
              
              <button 
                type="button"
                onClick={() => setMode("register")} // Переключение режима
                className=" flex-1 py-3 rounded-xl cursor-pointer transition-all
                            bg-white/5 border border-white/10 
                            text-cyan-400 font-black text-[10px] uppercase tracking-widest
                            hover:bg-white/10 hover:border-cyan-500/50"
              >
                Регистрация
              </button>
            </div>
        </form>
    )
}