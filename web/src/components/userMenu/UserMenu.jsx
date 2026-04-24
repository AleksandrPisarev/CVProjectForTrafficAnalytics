import { useState } from "react"
import { useUserStore } from "@/store/useUserStore"
import LoginForm from "./LoginForm"
import RegisterForm from "./RegisterForm"
import UserDashboard from "./UserDashboard"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"

export default function UserMenu() {
  const { currentUser } = useUserStore()
  const [mode, setMode] = useState()

  return (
    <TooltipProvider>
      <DropdownMenu modal={false}>
        <Tooltip delayDuration={300} disableHoverableContent>
            <TooltipTrigger asChild onFocus={(e) => e.preventDefault()}>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        /* Сбрасываем фокус сразу после клика, чтобы следующий клик был как первый */
                        onMouseUp={(e) => e.currentTarget.blur()}
                        onClick={() => !currentUser ? setMode("login") : null}
                        className="
                            relative flex items-center justify-center 
                            w-14 h-14 rounded-full border-none p-0
                            bg-white hover:bg-white 
                            text-black hover:text-black 
                            
                            /* Обычное состояние (выпуклая) */
                            transition-all duration-150
                            shadow-[5px_5px_15px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(0,0,0,0.05),inset_2px_2px_5px_rgba(255,255,255,1)]
                            
                            /* Состояние нажатия (вдавленная) */
                            /* Используем !important через [!] чтобы эффект срабатывал ВСЕГДА */
                            active:scale-95
                            active:!shadow-[inset_5px_5px_10px_rgba(0,0,0,0.2),inset_-2px_-2px_5px_rgba(255,255,255,0.7)]
                            
                            cursor-pointer
                            outline-none focus:ring-0 focus:outline-none">
                        <span className={`
                                          font-black uppercase text-center leading-none transition-all duration-300
                                          ${currentUser
                                            ? "text-xl tracking-tighter"   // Крупные буквы для инициалов
                                            : "text-[10px] tracking-widest" // Маленький шрифт для слова "Войти"
                                          }
                                        `}>
                            {currentUser ? (currentUser.name[0] + currentUser.surName[0]).toUpperCase() : "Войти"}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
            </TooltipTrigger>
    
            <TooltipContent 
                side="bottom" 
                sideOffset={15} 
                className="bg-slate-800 border-white/10 text-white"
            >
                <p>Меню пользователя</p>
            </TooltipContent>
        </Tooltip>

        <DropdownMenuContent className="w-80 p-4 bg-[#0f172a] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          {currentUser ? (
             <UserDashboard setMode={setMode} />
          ) : mode === "login" ? (
             <LoginForm setMode={setMode} /> 
          ) : mode === "register" ? (
             <RegisterForm setMode={setMode} />
          ) : null }
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}