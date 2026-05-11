import { create } from 'zustand'

export const useCameraStore = create((set, get) => ({
  // Список камер
  cameras: [{
  // name: "Въезд 1",         // Метка, которую ввел пользователь
  // ip: "192.168.1.64",      // Текущий адрес
  // port: 80,                // Добавляем порт управления (ONVIF)
  // mac: "00:1A:2B:3C:4D:5E",// Уникальный адрес железа (чтобы не было дублей)
  // login: "admin",          // Нужно для переподключения
  // password: "123",         // Нужно для переподключения
  // isStatic: true,          // Флаг: менять ли IP на статику
  // streamUrl: "",           // Ссылка RTSP (её нам вернет ONVIF на бекенде)
}],
  
  // ID выбранной камеры (по умолчанию первая)
  activeCamera: [],

  // Добавляет id в массив activeCamera при повторном нажатии удаляет камеру
   setActiveCamera: (id) => set((state) => {
    const isExist = state.activeCamera.includes(id);
    return {
      activeCamera: isExist 
        ? state.activeCamera.filter(camId => camId !== id) 
        : [...state.activeCamera, id]
    };
  }),

  addCamera: (newCam) => set((state) => ({
    cameras: [...state.cameras, { ...newCam, id: String(Date.now()), status: 'online' }]
  })),

  // Возвращает массив объектов всех выбранных камер
  getActiveCamera: () => {
    const { cameras, activeCamera } = get();
    return cameras.filter(c => activeCamera.includes(c.id));
  }
}))