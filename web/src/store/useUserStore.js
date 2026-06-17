import { create } from 'zustand'

export const useUserStore = create((set, get) => ({

  currentUser: null,

  generatedCode: null,

  registrationCheck: async (newUser) => {

    // 1. Проверка на пустые поля (на всякий случай)
    if (!newUser.email || !newUser.password || !newUser.name || !newUser.surName) {
      return { success: false, error: "empty_fields" }
    }

    // 2. Проверка формата Email (Регулярное выражение)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newUser.email)) {
      return { success: false, error: "invalid_email" }
    }

    // 3. Отправляем в сеть ТОЛЬКО email для проверки дубликата и генерации кода
    try {
      const response = await fetch("http://localhost:8000/auth/registration-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUser.email }) // Передаем только почту!
      });

      if (response.ok) {
        // Если бэкенд одобрил почту и выслал код:
        // Переводим форму в режим ввода кода, записывая в generatedCode значение true
        set({ generatedCode: true }) 
        return { success: true }
      } else {
        // Если бэкенд вернул ошибку 400 с деталью "user_exists"
        const errorData = await response.json()
        return { success: false, error: errorData.detail }
      }
    } catch (e) {
      // Если бэкенд недоступен
      return { success: false, error: "server_error" }
    }
  },

  confirmRegistration: async (newUser, inputCode) => {
    try {
      const response = await fetch("http://localhost:8000/auth/register-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUser.name,
          surname: newUser.surName, // Переводим в синтаксис бэкенда
          email: newUser.email,
          password: newUser.password,
          user_code: inputCode      // Передаем введенный код для проверки на сервере
        })
      })

      if (response.ok) {
        // Если бэкенд успешно записал пользователя в базу данных:
        set({ 
          generatedCode: null, // Сбрасываем режим ввода кода
          currentUser: {
            name: newUser.name,
            surname: newUser.surName,
            email: newUser.email,
            status: "operator" // Новый пользователь всегда оператор
          }
        })
        return { success: true }
      } else {
        // Если бэкенд вернул ошибку (например, код неверный)
        const errorData = await response.json()
        return { success: false, error: errorData.detail  }
      }
    } catch (e) {
      return { success: false, error: "server_error" }
    }
  },

  login: async (email, password) => {
    if (!email || !password) {
      return { success: false, error: "empty_fields" }
    }
    try {
      const response = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        const data = await response.json()
        // Записываем полученного от бэкенда пользователя в currentUser
        set({ currentUser: data.user })
        return { success: true }
      } else {
        const errorData = await response.json()
        // Возвращает точную ошибку бэкенда: "no_user" или "wrong_password"
        return { success: false, error: errorData.detail }
      }
    } catch (e) {
      return { success: false, error: "server_error" }
    }
  },

  resetPassword: async (email) => {
    if (!email) {
      return { success: false, error: "empty_fields" }
    }
    try {
      const response = await fetch("http://localhost:8000/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }) // Отправляем только почту пользователя
      })

      if (response.ok) {
        // Если бэкенд нашел пользователя, сгенерировал пароль и успешно отправил письмо
        return { success: true }
      } else {
        // Если бэкенд вернул ошибку (например, пользователя с такой почтой нет в БД)
        const errorData = await response.json()
        return { success: false, error: errorData.detail }
      }
    } catch (e) {
      // Если упал сервер или пропала сеть
      return { success: false, error: "server_error" }
    }
  },

  confirmResetPassword: async (email, inputCode) => {
    try {
      const response = await fetch("http://localhost:8000/auth/reset-password-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_code: inputCode }) // Шлем почту и введенный код
      })

      if (response.ok) {
        return { success: true }
      } else {
        const errorData = await response.json()
        // Вернет "invalid_code" или "code_expired"
        return { success: false, error: errorData.detail }
      }
    } catch (e) {
      return { success: false, error: "server_error" }
    }
  }
}))