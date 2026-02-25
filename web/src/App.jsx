import { BrowserRouter, Routes, Route } from "react-router"
import Home from "./pages/Home"
import Analytics from "./pages/Analytics"
import Documents from "./pages/Documents"
import Settings from "./pages/Settings"
import Header from "./components/Header"
import './App.css'

export default function App() {

  return (
    <BrowserRouter>
      <Header />
      <main className="main">
        {/* Контент страниц */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}