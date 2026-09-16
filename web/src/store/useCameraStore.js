import { create } from 'zustand'

export const useCameraStore = create((set, get) => ({
  // Список камер
  cameras: [],
  
  activeCamera: [],

  // Добавляет ip в массив activeCamera при повторном нажатии удаляет камеру
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
  },

  // 1. СТАРТ КАЛИБРОВКИ
  startCalibration: async (cameraIp, calibrationSpeed) => {
    try {
      const response = await fetch(`http://localhost:8000/api/calibration/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: cameraIp, calibration_speed: parseInt(calibrationSpeed, 10) }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || data.success === false) {
        return data.message || `Не удалось запустить калибровку`
      }
       
      return null

    } catch (err) { return 'Ошибка сети: сервер недоступен' }
  },

  // 2. СТОП КАЛИБРОВКИ
  stopCalibration: async (cameraIp) => {
    try {
      const response = await fetch(`http://localhost:8000/api/calibration/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: cameraIp }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || data.success === false) {
        return data.message || `Не удалось остановить калибровку`
      }

      return null

    } catch (err) { return 'Ошибка сети: сервер недоступен' }
  },

  // 3. ОТПРАВКА ID АВТО
  sendCarId: async (cameraIp, carId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/calibration/car-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: cameraIp, car_id: parseInt (carId, 10) }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || data.success === false) {
        // Если бэк вернул ошибку выполнения функции _build_y_pixel_map
        return data.message || `Данные по ID ${carId} не найдены или точек слишком мало!`
      }

      return null

    } catch (err) { return 'Ошибка сети: сервер недоступен' }
  },

  // 4. СОХРАНЕНИЕ МАКСИМАЛЬНОЙ СКОРОСТИ
  saveMaxSpeed: async (cameraIp, maxSpeed) => {
    try {
      const response = await fetch(`http://localhost:8000/api/calibration/max-speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: cameraIp, max_speed: parseInt(maxSpeed, 10) }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || data.success === false) {
        return data.message || `Не удалось сохранить скорость`
      }

      set((state) => ({
      cameras: state.cameras.map((camera) => 
        // Находим нужную камеру по IP и дописываем ей поле max_speed
        camera.ip === cameraIp 
          ? { ...camera, max_speed: parseInt(maxSpeed, 10) } 
          : camera
        )
      }))

      return null

    } catch (err) { return 'Ошибка сети: сервер недоступен' }
  }
}))