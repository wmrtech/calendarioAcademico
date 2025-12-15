import { Event } from "@/lib/types";
import { useCategories } from "@/hooks/useCategories";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPinIcon, ClockIcon } from "@heroicons/react/24/outline";

interface EventCardProps {
  event: Event;
  onClick: (event: Event) => void;
}

export default function EventCard({ event, onClick }: EventCardProps) {
  const { categories } = useCategories();
  const category = categories[event.category];
  const date = parseISO(event.date);

  return (
    <div 
      onClick={() => onClick(event)}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
    >
      {/* Caixa de Data (Esquerda) */}
      <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl w-16 h-16 shrink-0 border border-gray-100 group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-primary/60">
            {format(date, 'MMM', { locale: ptBR })}
        </span>
        <span className="text-xl font-display font-black text-gray-900 group-hover:text-primary">
            {format(date, 'dd')}
        </span>
      </div>

      {/* Detalhes (Direita) */}
      <div className="flex-1 min-w-0"> {/* min-w-0 impede que texto longo quebre o flex */}
        <div className="flex justify-between items-start mb-1">
           <span className="text-xs font-bold text-primary uppercase tracking-wide">
              {format(date, 'EEEE', { locale: ptBR })}
           </span>
           
           <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap ml-2`}>
              {category?.label || 'Geral'}
           </span>
        </div>

        <h3 className="text-base font-bold text-gray-900 leading-tight mb-2 truncate">
            {event.title}
        </h3>

        <div className="flex flex-col gap-1">
            {/* Horário */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <ClockIcon className="w-4 h-4 text-gray-400" />
                <span>
                    {event.allDay ? 'Dia Inteiro' : (
                        <>
                            {event.time} {event.endTime ? `- ${event.endTime}` : ''}
                        </>
                    )}
                </span>
            </div>

            {/* Local (só aparece se existir) */}
            {event.local && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPinIcon className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{event.local}</span>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}