import { useState } from "react"
import detection from "@/assets/detection.jpg"
import classification from "@/assets/classification.jpg"
import tracking from "@/assets/tracking.jpg"
import speed_detector from "@/assets/speed detector.jpg"
import car_numbers from "@/assets/car numbers.jpg"
import search_by_number from "@/assets/search by number.jpg"
import UserMenu from "@/components/userMenu/UserMenu"
import demo from "@/assets/demo.gif"

export default function Landing() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
     <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      
       {/* --- НАВИГАЦИЯ --- */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-20 items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl items-baseline pt-1.5">
              <span>TA<span className="font-serif align-baseline">I</span></span>
            </div>
            <span className="text-xl md:text-2xl font-bold tracking-tight text-slate-800">
              Traffic<span className="text-blue-600">A<span className="font-serif">I</span></span>
            </span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Возможности</a>
            <UserMenu />
          </div>

          {/* Mobile Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="md:hidden p-2 text-slate-600 z-50 relative"
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className={`w-full h-0.5 bg-current transform transition duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`w-full h-0.5 bg-current transition duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`w-full h-0.5 bg-current transform transition duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></span>
            </div>
          </button>
        </div>

        {/* МОБИЛЬНОЕ МЕНЮ */}
        <div className={`md:hidden absolute w-full bg-white border-b border-gray-100 transition-all duration-300 ease-in-out shadow-xl ${isMenuOpen ? 'top-20 opacity-100' : 'top-[-300px] opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col p-6 space-y-4">
            <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold border-b pb-2 text-slate-700">Возможности</a>
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION С БЛОКОМ ДЛЯ GIF --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="mb-8 tracking-tight break-words">
              <span 
                style={{ fontSize: '4vw' }} 
                className="block font-semibold text-slate-900 md:text-6xl"
              >
                Traffic
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                  A<span className="font-serif align-baseline">I</span>
                </span>
              </span>
              <span 
                style={{ fontSize: '2vw' }} 
                className="block md:text-2xl font-normal text-slate-800 mt-4 leading-snug"
              >
                Видеонаблюдение с аналитикой и искусственным интеллектом
              </span>
            </h1>

            {/* ВОТ ЭТОТ БЛОК ДЛЯ GIF */}
            <div className="relative max-w-5xl mx-auto bg-slate-900 rounded-[2.5rem] p-2 md:p-3 shadow-2xl border border-slate-800">
              <div className="bg-slate-800 rounded-[2rem] overflow-hidden aspect-video flex items-center justify-center">
                <img 
                  src={demo} 
                  alt="Демонстрация мониторинга TrafficAI" 
                  className="w-full h-full object-cover opacity-90" 
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- ТЕКСТОВОЕ ОПИСАНИЕ --- */}
      <section className="py-16 bg-white border-t border-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="space-y-8 text-slate-800">
            <p className="text-lg md:text-xl font-light leading-relaxed">
              <span className="text-2xl font-medium text-slate-900">
                Traffic
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 font-bold">
                  A<span className="font-serif align-baseline">I</span>
                </span>
              </span> — программа для видеонаблюдения и любых проектов с камерами. Устанавливается на компьютер, использует камеры в вашей сети и решает задачи, важные именно для вас.
            </p>
            <div className="pt-6 border-l-2 border-blue-100 pl-6">
              <h3 className="text-2xl font-light mb-4 text-slate-900 text-left">
                Мощная аналитика и уникальные функции
              </h3>
              <p className="text-lg font-light leading-relaxed text-slate-600 text-left">
                Использует модули искусственного интеллекта для распознавания объектов, автомобильных номеров, детекции и трекинга событий, анализа потока.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- ЦЕНТРИРОВАННЫЕ ПЛИТКИ ВОЗМОЖНОСТЕЙ --- */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-slate-900 mb-2 tracking-wide">
              ВОЗМОЖНОСТИ <span className="text-4xl font-semibold text-slate-900 whitespace-nowrap">
                            Traffic
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 font-bold">
                              A<span className="font-serif align-baseline">I</span>
                            </span>
                          </span>
            </h2>
            <span 
                style={{ fontSize: '2vw' }} 
                className="block md:text-2xl font-normal text-slate-800 mt-4 leading-snug"
              >
                Искусственный интеллект и даже больше
              </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { title: "Детекция объектов", desc: "Автоматическая фиксация всех видов авто", img: detection },
              { title: "Классификация авто", desc: "Определение типов транспорта: легковые, грузовые, автобусы", img: classification },
              { title: "Трекинг авто", desc: "Сопровождение объектов по закрепленным id", img: tracking },
              { title: "Детектор скорости", desc: "Определение скорости автомобиля в режиме реального времени", img: speed_detector },
              { title: "Распознавание номеров", desc: "Распознавание на скорости и при любой погоде", img: car_numbers },
              { title: "Поиск по номеру", desc: "Неограниченное количество машин", img: search_by_number }
            ].map((card, idx) => (
              <div key={idx} className="relative h-[350px] rounded-[2rem] overflow-hidden group cursor-pointer">
                <img src={card.img} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={card.title}/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{card.title}</h3>
                  <p className="text-white/80 text-sm font-normal mt-2 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-gray-100 text-center">
        <p className="text-slate-400 text-sm">
          © 2026 
          <span className="font-semibold text-slate-800 ml-1">
            Traffic<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 font-bold">A<span className="font-serif align-baseline">I</span></span>
          </span>
          . Все права защищены.
        </p>
      </footer>
    </div>
  )
}