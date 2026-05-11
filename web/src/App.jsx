import { Routes, Route, useLocation } from "react-router"
import { useUserStore } from "@/store/useUserStore"
import Home from "./pages/Home"
import Analytics from "./pages/Analytics"
import Documents from "./pages/Documents"
import Landing from "./pages/Landing"
import Header from "./components/Header"
import './App.css'

export default function App() {

  const location = useLocation(); // Получаем текущий путь

  const { currentUser } = useUserStore()

  // 1. Если пользователь не вошел — показываем лендинг
  if (!currentUser) {
    return (
      <Routes>
        <Route path="*" element={<Landing />} />
      </Routes>
    )
  }

  // 2. Если вошел — показываем основное приложение
  return (
    <>
      <Header />
      <main className="main">
        {/* Home всегда в DOM, поэтому видео-поток не прерывается. */}
        <div style={{ display: location.pathname === '/' ? 'block' : 'none' }}>
          <Home />
        </div>
        <Routes>
          <Route path="/" element={null} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/documents" element={<Documents />} />
        </Routes>
      </main>
    </>
  )
}