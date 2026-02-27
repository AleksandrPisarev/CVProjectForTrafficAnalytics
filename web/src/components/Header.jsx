import { Link, useLocation } from "react-router"
import { useState, useEffect  } from "react"
import { Button } from "@/components/ui/button"

const NavItem = ({ to, children }) => {
  const location = useLocation();
  
  // В v7 лучше проверять строгое соответствие пути
  const isActive = location.pathname === to;

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
  );
};

export default function Header() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
  // Запускаем интервал один раз при загрузке компонента
  const interval = setInterval(() => {setNow(new Date())}, 1000);
  // Очищаем интервал, если компонент удалится (чтобы не было утечек памяти)
  return () => clearInterval(interval)}, []); // Пустые скобки [] значат "запустить только при старте"
  return(
    <header className="fixed top-0 left-0 right-0 z-50 h-[70px] w-full flex items-center justify-center 
                      bg-[#0f172a]/60 backdrop-blur-xl border-b border-white/20 shadow-2xl overflow-hidden !px-6">
      <div className="w-full max-w-[1440px] flex items-center justify-between !gap-4 md:!gap-10">
        <nav className="flex items-center !gap-2 md:!gap-4 shrink-0 flex-nowrap">
          <NavItem to="/" end>Главная</NavItem>
          <NavItem to="/analytics">Аналитика</NavItem>
          <NavItem to="/documents">Документы</NavItem>
          <NavItem to="/settings">Настройки</NavItem>
        </nav>

        <h1 className="hidden min-[1380px]:block shrink-0 text-[0.85rem] font-medium text-white uppercase tracking-[0.25em] text-center whitespace-nowrap !px-4">
          Проект компьютерного зрения по аналитике трафика
        </h1>

        <div className="shrink-0 font-mono text-lg md:text-xl text-cyan-50/90 tabular-nums whitespace-nowrap min-w-fit text-right"> 
          Время: {now.toLocaleTimeString()}
        </div>
      </div>
    </header>
    )
}