import { Link, useLocation } from "react-router"
import { useState, useEffect  } from "react"
import { Button } from "@/components/ui/button"
import styles from "./Header.module.css"

const NavItem = ({ to, children }) => {
  const location = useLocation();
  
  // В v7 лучше проверять строгое соответствие пути
  const isActive = location.pathname === to;

  return (
    <Button asChild variant="nav">
      <Link to={to} className={ isActive ? "text-cyan-400 bg-cyan-400/10 shadow-[0_0_25px_rgba(34,211,238,0.4)] !translate-y-0" : ""}>
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
        <header className={styles.header}>
            <nav className="flex gap-10">
                <NavItem to="/" end>Главная</NavItem>
                <NavItem to="/analytics">Аналитика</NavItem>
                <NavItem to="/documents">Документы</NavItem>
                <NavItem to="/settings">Настройки</NavItem>
            </nav>

            <h1 className={styles.project_name}>
              Проект компьютерного зрения по аналитике трафика
            </h1>

            <div className={styles.time}> 
                Время: {now.toLocaleTimeString()}
            </div>
        </header>
    )
}