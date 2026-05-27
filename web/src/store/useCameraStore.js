import { create } from 'zustand'

export const useCameraStore = create((set, get) => ({
  // Список камер
  cameras: [
        // name: formData.name.trim(),
        // brand: formData.brand,
        // ip: formData.ip.trim(),
        // username: formData.username.trim(),
        // password: formData.password,
        // port: 554,
        // rtsp_tail: selectedBrand.path
  ],
  
  // mac выбранной камеры 
  activeCamera: [],

  // Добавляет mac в массив activeCamera при повторном нажатии удаляет камеру
  setActiveCamera: (ip) => set((state) => {
    const isExist = state.activeCamera.includes(ip)
    if (isExist) {
      // Если камера уже выбрана — удаляем её без ограничений
      return { activeCamera: state.activeCamera.filter(camip => camip !== ip) }
    } else {
        // Если добавляем новую — проверяем, чтобы их было не больше 4
        if (state.activeCamera.length >= 4) {
          return {} // Игнорируем добавление, если предел достигнут
        }
        return { activeCamera: [...state.activeCamera, ip] }
      }
  }),

  addCamera: (newCam) => set((state) => ({
    cameras: [...state.cameras, newCam]
  })),

  // Возвращает массив объектов всех выбранных камер
  getActiveCamera: () => {
    const { cameras, activeCamera } = get()
    return cameras.filter(c => activeCamera.includes(c.ip))
  }
}))