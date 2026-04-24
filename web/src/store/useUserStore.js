import { create } from 'zustand'

export const useUserStore = create((set, get) => ({
  listUsers: [{email: "aleksandrpisarev555@gmail.com", password: "123", name: "Александр", surName: "Писарев", status: "admin"}],

  currentUser: null,

  generatedCode: null,

  registrationCheck: (newUser) => {
    const allUsers = get().listUsers

    // 1. Проверка на пустые поля (на всякий случай)
    if (!newUser.email || !newUser.password || !newUser.name) {
      return { success: false, error: "empty_fields" }
    }

    // 2. Проверка формата Email (Регулярное выражение)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newUser.email)) {
      return { success: false, error: "invalid_email" }
    }

    // 3. Проверка на дубликат
    const exists = allUsers.find(u => u.email === newUser.email)
    if (exists) {
      return { success: false, error: "user_exists" }
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString()
    set({ generatedCode: code })
    return { success: true, code: code }
  },

   confirmRegistration: (newUser, inputCode) => {
      const { generatedCode } = get()
      const { password: _, ...userWithoutPassword } = newUser
      if (inputCode === generatedCode) {
        set((state) => ({
          listUsers: [...state.listUsers, { ...newUser, status: "operator" }],
          generatedCode: null,
          currentUser: { ...userWithoutPassword, status: "operator" }
        }))
        return { success: true }
      }
      return { success: false }
    },

  login: (email, password) => {
    const allUsers = get().listUsers
    
    // 1. Сначала ищем, есть ли вообще пользователь с такой почтой
    const thisUser = allUsers.find(u => u.email === email)

    if (!thisUser) {
      return { success: false, error: "no_user" } // Пользователь не найден
    }

    // 2. Если почта есть, проверяем пароль
    if (thisUser.password !== password) {
      return { success: false, error: "wrong_password" } // Пароль неверный
    }

    // 3. Если всё совпало — логиним
    const { password: _, ...userWithoutPassword } = thisUser
    set({ currentUser: userWithoutPassword })
    return { success: true }
  },

  getPasswordByEmail: (email) => {
    const allUsers = get().listUsers
    const thisUser = allUsers.find(u => u.email === email)
    return thisUser ? thisUser.password : null
  }
}))