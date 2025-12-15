import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Event, DEFAULT_CATEGORIES } from "@/lib/types";
import { useCategories } from "@/hooks/useCategories";
import { CalendarIcon, MapPinIcon, ClockIcon, LinkIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface EventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventModal({ event, isOpen, onClose }: EventModalProps) {
  const { categories } = useCategories();
  
  if (!event) return null;

  const category = categories[event.category] || DEFAULT_CATEGORIES.general;
  const categoryColor = category.color || 'bg-gray-200';
  
  const dateObj = new Date(`${event.date}T${event.time || '00:00'}`);
  
  const addToCalendar = () => {
    const startTime = dateObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endTime = new Date(dateObj.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.local || '')}&sf=true&output=xml`;
    
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* CORREÇÃO: [&>button]:hidden remove o X padrão duplicado */}
      <DialogContent className="max-w-md bg-white p-0 border border-gray-100 shadow-2xl rounded-2xl overflow-hidden font-sans outline-none [&>button]:hidden">
        
        {/* Header Colorido */}
        <div className={`relative h-24 ${categoryColor} flex items-end p-6`}>
           <button 
            onClick={onClose} 
            className="absolute top-4 right-4 bg-black/10 hover:bg-black/20 text-white rounded-full p-1 transition-colors backdrop-blur-sm"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>

          <div className="w-full">
            <span className="inline-block px-2 py-0.5 rounded-md bg-white/90 text-xs font-bold uppercase tracking-wider shadow-sm mb-2 text-gray-800">
              {category.label}
            </span>
          </div>
        </div>

        <div className="px-6 pt-2 pb-6">
          <DialogTitle className="font-display font-bold text-2xl text-gray-900 leading-tight mb-6">
            {event.title}
          </DialogTitle>

          <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                 <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Data</p>
                <p className="font-medium text-gray-900 text-sm capitalize">
                    {format(dateObj, "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                 <ClockIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Horário</p>
                <p className="font-medium text-gray-900 text-sm">
                    {event.allDay ? 'Dia Inteiro' : event.time}
                </p>
              </div>
            </div>

            {event.local && (
              <div className="flex items-start gap-3 col-span-2">
                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                    <MapPinIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Local</p>
                  <p className="font-medium text-gray-900 text-sm">{event.local}</p>
                </div>
              </div>
            )}
          </div>

          {event.description && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Descrição</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {event.link && (
              <a 
                href={event.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="neo-btn flex items-center justify-center gap-2 w-full text-center bg-gray-900 text-white hover:bg-black"
              >
                <LinkIcon className="w-4 h-4" />
                Acessar Link do Evento
              </a>
            )}
            
            <Button 
              onClick={addToCalendar}
              variant="outline" 
              className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-primary font-semibold rounded-lg h-10 transition-colors"
            >
              Adicionar ao Google Calendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}