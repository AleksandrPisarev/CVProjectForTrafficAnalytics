import React from "react"
import { Camera } from "lucide-react"
import { useCameraStore } from "@/store/useCameraStore"
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

export default function CameraSelector() {
    const { cameras, activeCamera, setActiveCamera } = useCameraStore()

  return (
    <div className="w-full px-2 lg:px-4 pt-0 pb-1 transition-all duration-500">
      <Carousel opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="-ml-2">
          {cameras.map((item) => (
            <CarouselItem key={item.id} className="pl-2 basis-1/2 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
              <Card onClick={() => setActiveCamera(item.id)}
                    className={`border-white/10 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all cursor-pointer group
                                ${activeCamera.includes(item.id) ? 'border-sky-500 bg-sky-500/10' : ''}`}>
                <CardContent className="p-2 flex items-center gap-3">
                  {/* Мини-иконка */}
                  <div className="w-8 h-8 rounded bg-sky-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-500/20">
                    <Camera className="w-4 h-4 text-sky-500" />
                  </div>
                  
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-white/90 truncate uppercase tracking-tight">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <div className={`w-1 h-1 rounded-full ${item.status === 'online' ? 'bg-sky-400 shadow-[0_0_4px_#38bdf8]' : 'bg-red-500'}`} />
                      <span className="text-[8px] font-mono text-white/30 uppercase">
                        {item.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex left-2 lg:left-4 scale-75 opacity-30 hover:opacity-100 bg-transparent border-white/10" />
        <CarouselNext className="hidden md:flex right-2 lg:right-4 scale-75 opacity-30 hover:opacity-100 bg-transparent border-white/10" />
      </Carousel>
    </div>
  )
}