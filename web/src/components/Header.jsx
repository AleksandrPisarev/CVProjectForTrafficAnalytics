import { Link, useLocation } from "react-router"
import { useState, useEffect  } from "react"
import { Menu, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import UserMenu from "./userMenu/UserMenu"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"

const NavItem = ({ to, children }) => {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <Button asChild variant="nav" className="!p-0 h-9 shrink-0">
      <Link to={to} className={`relative flex items-center justify-center !px-5 h-full rounded-md transition-all duration-300 font-medium tracking-wide ${
          isActive 
          ? "text-cyan-300 bg-cyan-500/20 " +
            "shadow-[0_0_15px_rgba(34,211,238,0.4),inset_0_0_10px_rgba(34,211,238,0.2)] " +
            " brightness-125" 
          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
        }`}>
        {children}
      </Link>
    </Button>
  )
}

export default function Header() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
  // Запускаем интервал один раз при загрузке компонента
  const interval = setInterval(() => {setNow(new Date())}, 1000)
  // Очищаем интервал, если компонент удалится (чтобы не было утечек памяти)
  return () => clearInterval(interval)}, []) // Пустые скобки [] значат "запустить только при старте"
  return(
    <header className="fixed top-0 left-0 right-0 z-50 h-[70px] w-full flex items-center justify-center 
                      bg-[#0f172a]/60 backdrop-blur-xl border-b border-white/20 shadow-2xl !px-4 md:!px-6">
      <div className="w-full max-w-[1440px] flex items-center justify-between gap-2">
        
        {/* МОБИЛЬНОЕ МЕНЮ (Бургер) - видно только на маленьких экранах */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-2 text-cyan-400 hover:bg-white/10">
                <Menu size={24} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-[#0f172a] border-white/20 text-white">
              <DropdownMenuItem asChild><Link to="/">Главная</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/analytics">Аналитика</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/documents">Документы</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ДЕСКТОП НАВИГАЦИЯ - скрыта на мобилках */}
        <nav className="hidden md:flex items-center gap-2 md:gap-4 shrink-0">
          <NavItem to="/">Главная</NavItem>
          <NavItem to="/analytics">Аналитика</NavItem>
          <NavItem to="/documents">Документы</NavItem>
        </nav>

        {/* ЦЕНТРАЛЬНЫЙ ТЕКСТ - скрыт почти всегда, кроме огромных экранов */}
        <h1 className="hidden min-[1380px]:block shrink-0 text-[0.85rem] font-medium text-white uppercase tracking-[0.25em] text-center whitespace-nowrap px-4">
          Проект компьютерного зрения по аналитике трафика
        </h1>

        {/* ПРАВАЯ ЧАСТЬ: Меню пользователя и Время */}
        <div className="flex items-center gap-3 md:gap-6 ml-auto md:ml-0">
          <UserMenu />
          
          <div className="shrink-0 font-mono text-sm md:text-xl text-cyan-50/90 tabular-nums whitespace-nowrap text-right"> 
            <span className="hidden sm:inline text-slate-500 mr-2">ВРЕМЯ:</span>
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>
    </header>
  )
}