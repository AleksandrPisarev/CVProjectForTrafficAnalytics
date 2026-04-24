import React from 'react'
import { Search, Settings, Users, LogOut } from 'lucide-react'
import { useUserStore } from '@/store/useUserStore'
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export default function UserDashboard({ setMode }) {
  const { currentUser } = useUserStore()
  const isAdmin = currentUser?.status === 'admin'

  return (
    <div className="flex flex-col text-slate-300">
      {/* Шапка меню */}
      <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10">
        <p className="text-sm font-bold text-white truncate">
          {currentUser?.name} {currentUser?.surName}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-cyan-500/60 mt-0.5">
          {currentUser?.status}
        </p>
      </div>

      <div className="py-1">
        <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors group">
          <Search size={16} className="text-slate-500 group-hover:text-cyan-400" />
          <span className="text-sm">Поиск</span>
        </div>

        <div className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
          isAdmin ? "hover:bg-white/5 cursor-pointer group" : "opacity-20"
        }`}>
          <Settings size={16} className={isAdmin ? "text-slate-500 group-hover:text-cyan-400" : "text-slate-500"} />
          <span>Настройки</span>
        </div>

        <div className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
          isAdmin ? "hover:bg-white/5 cursor-pointer group" : "opacity-20"
        }`}>
          <Users size={16} className={isAdmin ? "text-slate-500 group-hover:text-cyan-400" : "text-slate-500"} />
          <span>Пользователи</span>
        </div>

        {/* Оберка DropdownMenuItem нужна чтобы закрывалось меню при нажатии на кнопку выход */}
        <DropdownMenuItem 
          onClick={() => { useUserStore.setState({ currentUser: null })
                           setMode(null)
                         }}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 cursor-pointer transition-colors group"
        >
          <LogOut size={16} className="text-slate-500 group-hover:text-red-500" />
          <span className="text-sm group-hover:text-red-500 font-medium">Выход</span>
        </DropdownMenuItem>
      </div>
    </div>
  )
}