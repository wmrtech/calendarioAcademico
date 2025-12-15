import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Event, ACADEMIC_PERIODS } from "@/lib/types";
import { useCategories } from "@/hooks/useCategories";
import { processEventsForView, isEventInDay } from "@/lib/eventUtils";
import EventCard from "@/components/EventCard";
import EventModal from "@/components/EventModal";
import HelpModal from "@/components/HelpModal";
import StudentOnboarding from "@/components/StudentOnboarding";
import InstallPrompt from "@/components/InstallPrompt"; 
import NotificationBanner from "@/components/NotificationBanner"; 
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday, 
  parseISO, isSameDay, areIntervalsOverlapping, addWeeks, subWeeks,
  startOfDay,
  isTomorrow
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, 
  ListBulletIcon, Squares2X2Icon, CalendarIcon,
  ArrowPathIcon, AcademicCapIcon, QuestionMarkCircleIcon,
  MapPinIcon, ClockIcon
} from "@heroicons/react/24/outline";

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'week'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 'list' : 'grid';
    }
    return 'grid';
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [studentPeriod, setStudentPeriod] = useState<string>('all');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  const { categories } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [rawEvents, setRawEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Configuração da Grade Semanal
  const START_HOUR = 6;
  const HOURS_COUNT = 18;
  const TIME_SLOTS = Array.from({ length: HOURS_COUNT }, (_, i) => i + START_HOUR); 
  const PIXELS_PER_HOUR = 64; 

  useEffect(() => {
    const saved = localStorage.getItem("student_period");
    if (saved) setStudentPeriod(saved);
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, "events"));
        const querySnapshot = await getDocs(q);
        const fetchedEvents = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
        setRawEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleNext = () => viewMode === 'week' ? setCurrentDate(addWeeks(currentDate, 1)) : setCurrentDate(addMonths(currentDate, 1));
  const handlePrev = () => viewMode === 'week' ? setCurrentDate(subWeeks(currentDate, 1)) : setCurrentDate(subMonths(currentDate, 1));
  const goToday = () => setCurrentDate(new Date());

  const daysToRender = useMemo(() => {
    const options = { weekStartsOn: 0 as const };
    if (viewMode === 'week') {
        const start = startOfWeek(currentDate, options);
        const end = endOfWeek(currentDate, options);
        return eachDayOfInterval({ start, end });
    } else {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const start = startOfWeek(monthStart, options); 
        const end = endOfWeek(monthEnd, options);
        return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  const viewRange = { start: daysToRender[0], end: daysToRender[daysToRender.length - 1] };
  const weekDaysHeader = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const expandedEvents = useMemo(() => {
    return processEventsForView(rawEvents, viewRange.start, viewRange.end);
  }, [rawEvents, viewRange.start, viewRange.end]);

  const passesFilters = (event: Event) => {
    if (!event) return false;
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (event.title || '').toLowerCase().includes(searchLower) || 
                          (event.description || '').toLowerCase().includes(searchLower) ||
                          (event.course || '').toLowerCase().includes(searchLower);
    const targetList = event.targetPeriods || ['all']; 
    const matchesPeriod = targetList.includes('all') || targetList.includes(studentPeriod);
    return matchesCategory && matchesSearch && matchesPeriod;
  };

  const gridFilteredEvents = useMemo(() => {
    return expandedEvents.filter(passesFilters);
  }, [expandedEvents, selectedCategory, searchTerm, studentPeriod]);


  const listModeEvents = useMemo(() => {
    const listStart = startOfMonth(currentDate);
    const listEnd = endOfMonth(currentDate);
    return rawEvents.filter(event => {
        if (!passesFilters(event)) return false;
        if (!event.date) return false;
        const eventStart = parseISO(event.date);
        const eventEnd = event.endDate ? parseISO(event.endDate) : eventStart;
        return areIntervalsOverlapping(
            { start: eventStart, end: eventEnd },
            { start: listStart, end: listEnd }
        );
    })
    .sort((a, b) => {
        const dateA = parseISO(a.date).getTime();
        const dateB = parseISO(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        const timeA = a.allDay ? '00:00' : (a.time || '23:59');
        const timeB = b.allDay ? '00:00' : (b.time || '23:59');
        return timeA.localeCompare(timeB);
    });
  }, [rawEvents, currentDate, selectedCategory, searchTerm, studentPeriod]);

  // --- LÓGICA NOVA PARA TIMELINE ---
  
  // 1. Agrupa os eventos por dia
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    listModeEvents.forEach(event => {
        const dateKey = event.date; // YYYY-MM-DD
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(event);
    });
    return groups;
  }, [listModeEvents]);

  // 2. Helper para título bonito (Hoje, Amanhã, 12 de Fev...)
  const renderDateHeader = (dateStr: string) => {
      const date = parseISO(dateStr);
      if (isToday(date)) return "Hoje";
      if (isTomorrow(date)) return "Amanhã";
      return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  // --- CORREÇÃO DO ALGORITMO DE LAYOUT (TETRIS SÓLIDO) ---
  const layoutByDay = useMemo(() => {
    const layout = new Map<string, (Event | null)[]>();
    const occupiedSlots = new Map<string, boolean[]>(); 
    const eventIdToSlot = new Map<string, number>(); // Garante que o mesmo evento (mesmo ID) use o mesmo slot sempre

    // 1. Agrupar eventos únicos pelo ID original (para tratar multi-dias como um bloco só)
    const uniqueEventsMap = new Map<string, Event>();
    gridFilteredEvents.forEach(e => {
        // Se for semana, filtramos o que não vai no topo
        if (viewMode === 'week') {
            const isMulti = e.originalStartDate !== e.originalEndDate;
            if (!e.allDay && !isMulti) return; 
        }
        
        // Usa o ID original para garantir que pegamos "o evento", não "o dia do evento"
        const uniqueId = e.originalId || e.id;
        if (!uniqueEventsMap.has(uniqueId)) {
            uniqueEventsMap.set(uniqueId, e);
        }
    });

    // 2. Ordenar eventos: Longos primeiro, depois por hora
    const sortedUniqueEvents = Array.from(uniqueEventsMap.values()).sort((a, b) => {
        const startA = a.originalStartDate ? parseISO(a.originalStartDate).getTime() : parseISO(a.date).getTime();
        const startB = b.originalStartDate ? parseISO(b.originalStartDate).getTime() : parseISO(b.date).getTime();
        
        // Se começam em dias diferentes, o que começa antes vem primeiro
        if (startA !== startB) return startA - startB;

        const endA = a.originalEndDate ? parseISO(a.originalEndDate).getTime() : startA;
        const endB = b.originalEndDate ? parseISO(b.originalEndDate).getTime() : startB;
        
        const durA = endA - startA;
        const durB = endB - startB;
        
        // Se começam no mesmo dia, o mais longo tem prioridade (para formar a base)
        if (durB !== durA) return durB - durA; 
        
        return (a.time || '').localeCompare(b.time || '');
    });

    // 3. Alocação de Slots (Reserva o slot para TODOS os dias do evento de uma vez)
    sortedUniqueEvents.forEach(event => {
        const startDate = event.originalStartDate ? parseISO(event.originalStartDate) : parseISO(event.date);
        const endDate = event.originalEndDate ? parseISO(event.originalEndDate) : startDate;
        
        // Array de dias que este evento ocupa
        const daysSpan = eachDayOfInterval({ start: startDate, end: endDate });

        // Encontra o menor índice disponível em TODOS os dias do intervalo
        let slotIndex = 0;
        while (true) {
            const isAvailable = daysSpan.every(day => {
                const key = format(day, 'yyyy-MM-dd');
                const slots = occupiedSlots.get(key) || [];
                return !slots[slotIndex]; 
            });

            if (isAvailable) break;
            slotIndex++;
        }

        // Marca como ocupado em todos os dias e salva a posição
        const uniqueId = event.originalId || event.id;
        eventIdToSlot.set(uniqueId, slotIndex);

        daysSpan.forEach(day => {
            const key = format(day, 'yyyy-MM-dd');
            const slots = occupiedSlots.get(key) || [];
            slots[slotIndex] = true;
            occupiedSlots.set(key, slots);
        });
    });

    // 4. Renderização Final: Preenche o layout dia a dia usando o slot pré-calculado
    daysToRender.forEach(day => {
        const key = format(day, 'yyyy-MM-dd');
        
        // Pega os eventos deste dia que foram processados (têm slot definido)
        const dayEvents = gridFilteredEvents.filter(e => {
             const isInDay = isEventInDay(e, day);
             const uniqueId = e.originalId || e.id;
             return isInDay && eventIdToSlot.has(uniqueId);
        });

        // Determina altura máxima da grade deste dia
        const maxSlot = dayEvents.reduce((max, e) => Math.max(max, eventIdToSlot.get(e.originalId || e.id) || 0), -1);
        
        // Cria array preenchido com null (buracos)
        const slots = new Array(maxSlot + 1).fill(null);

        dayEvents.forEach(event => {
            const uniqueId = event.originalId || event.id;
            const index = eventIdToSlot.get(uniqueId);
            if (index !== undefined) slots[index] = event;
        });

        layout.set(key, slots);
    });

    return layout;
  }, [gridFilteredEvents, daysToRender, viewMode]);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleChangePeriod = (newPeriod: string) => {
    setStudentPeriod(newPeriod);
    localStorage.setItem("student_period", newPeriod);
  };

  const headerTitle = useMemo(() => {
      if (viewMode === 'week') {
          const start = daysToRender[0];
          const end = daysToRender[daysToRender.length - 1];
          return `${format(start, 'dd MMM', { locale: ptBR })} - ${format(end, 'dd MMM', { locale: ptBR })}`;
      }
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
  }, [currentDate, viewMode, daysToRender]);

  return (
    <Layout>
      <StudentOnboarding onComplete={handleChangePeriod} />

      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div><h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 tracking-tight">Calendário Acadêmico</h2><p className="text-gray-500 mt-1">Organize sua rotina acadêmica com facilidade.</p></div>
        <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
           <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100"><AcademicCapIcon className="w-5 h-5 text-primary shrink-0" />
              <select value={studentPeriod} onChange={(e) => handleChangePeriod(e.target.value)} className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"><option value="all">Visão Geral</option>{ACADEMIC_PERIODS.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}</select>
           </div>
           <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
           <button onClick={() => setIsHelpOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition-colors"><QuestionMarkCircleIcon className="w-5 h-5 shrink-0" /><span>Ajuda</span></button>
        </div>
      </div>

      <NotificationBanner studentPeriod={studentPeriod} />

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100"><button onClick={handlePrev} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronLeftIcon className="w-5 h-5" /></button><button onClick={handleNext} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"><ChevronRightIcon className="w-5 h-5" /></button></div>
            <div className="flex items-baseline gap-2"><h3 className="text-xl font-display font-bold text-gray-900 capitalize min-w-[180px]">{headerTitle}</h3><button onClick={goToday} className="text-xs font-bold text-primary hover:underline">Ir para Hoje</button></div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-grow sm:w-64"><MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="neo-input pl-9 h-9 text-sm" /></div>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="neo-input h-9 text-sm w-full sm:w-auto cursor-pointer"><option value="all">Todas</option>{Object.values(categories).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 shrink-0">
                <button onClick={() => setViewMode('grid')} title="Mês" className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}><Squares2X2Icon className="w-5 h-5" /></button>
                <button onClick={() => setViewMode('week')} title="Semana" className={`p-1.5 rounded-md transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}><CalendarIcon className="w-5 h-5" /></button>
                <button onClick={() => setViewMode('list')} title="Lista" className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}><ListBulletIcon className="w-5 h-5" /></button>
            </div>
        </div>
      </div>

      {viewMode === 'grid' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {weekDaysHeader.map((day) => (<div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{day}</div>))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 auto-rows-fr bg-white"> 
            {daysToRender.map((day, idx) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const eventsInSlots = layoutByDay.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDay = isToday(day);
              const borderClass = `border-b border-gray-100 ${ (idx + 1) % 7 !== 0 ? 'md:border-r' : '' }`;
              return (
                <div key={day.toString()} className={`min-h-[140px] flex flex-col transition-colors ${borderClass} ${!isCurrentMonth ? 'bg-gray-50/30' : ''}`}>
                  <div className="flex justify-between items-center p-2 mb-1"><span className="md:hidden text-xs font-bold text-gray-400 uppercase">{format(day, 'EEE', { locale: ptBR })}</span><span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isTodayDay ? 'bg-primary text-white shadow-sm' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}>{format(day, 'dd')}</span></div>
                  <div className="flex flex-col gap-[2px] flex-grow pb-2 w-full">
                    {eventsInSlots.map((event, index) => {
                        if (!event) return <div key={`spacer-${index}`} className="h-[26px] w-full invisible" />;
                        
                        const isMultiDay = event.originalStartDate !== event.originalEndDate;
                        const originalStart = event.originalStartDate ? parseISO(event.originalStartDate) : parseISO(event.date);
                        const originalEnd = event.originalEndDate ? parseISO(event.originalEndDate) : parseISO(event.date);
                        
                        const isVisualStart = isSameDay(originalStart, day) || day.getDay() === 0;
                        const isVisualEnd = isSameDay(originalEnd, day) || day.getDay() === 6;
                        
                        let visualStyles = "mx-1.5 rounded-md"; 
                        if (isMultiDay) {
                           if (isVisualStart && isVisualEnd) {
                               visualStyles = "mx-1.5 rounded-md"; 
                           } else if (isVisualStart) {
                               visualStyles = "ml-1.5 mr-0 rounded-l-md rounded-r-none"; 
                           } else if (isVisualEnd) {
                               visualStyles = "mr-1.5 ml-0 rounded-r-md rounded-l-none"; 
                           } else {
                               visualStyles = "mx-0 rounded-none"; 
                           }
                        }

                        return (
                          <div key={event.id} onClick={() => handleEventClick(event)} className={`relative h-[26px] text-[11px] font-semibold leading-tight cursor-pointer flex items-center shadow-sm hover:brightness-110 transition-all ${visualStyles} ${categories[event.category]?.color || 'bg-gray-500'} text-white`}>
                             <div className="flex items-center justify-between gap-1 w-full overflow-hidden px-1.5"><span className="truncate">{event.title}</span>{(event.recurrence && event.recurrence.type !== 'none') && (<ArrowPathIcon className="w-3 h-3 opacity-70 flex-shrink-0" />)}</div>{!event.allDay && isVisualStart && (<p className="opacity-90 text-[9px] mr-1.5 flex-shrink-0">{event.time}</p>)}
                          </div>
                        );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex border-b border-gray-200 bg-white sticky top-0 z-20">
                <div className="w-14 shrink-0 border-r border-gray-100 bg-gray-50"></div> 
                <div className="flex-1 grid grid-cols-7">
                    {daysToRender.map((day) => {
                        const isTodayDay = isToday(day);
                        return (<div key={day.toString()} className={`py-3 text-center border-r border-gray-100 last:border-r-0 ${isTodayDay ? 'bg-primary/5' : ''}`}><p className="text-xs font-bold text-gray-400 uppercase mb-1">{format(day, 'EEE', { locale: ptBR })}</p><div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold ${isTodayDay ? 'bg-primary text-white shadow-md' : 'text-gray-900'}`}>{format(day, 'dd')}</div></div>);
                    })}
                </div>
                <div className="w-[15px] shrink-0 bg-gray-50 border-l border-gray-100"></div> 
            </div>

            <div className="flex border-b border-gray-200 bg-white">
                <div className="w-14 shrink-0 border-r border-gray-100 flex items-center justify-center p-2"><span className="text-[10px] font-bold text-gray-400 leading-tight text-center">DIA<br/>TODO</span></div>
                <div className="flex-1 grid grid-cols-7 relative">
                    {daysToRender.map((day) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const eventsInSlots = layoutByDay.get(dayKey) || [];
                        const isTodayDay = isToday(day);
                        return (
                            <div key={day.toString()} className={`flex flex-col gap-[2px] py-1 border-r border-gray-100 last:border-r-0 ${isTodayDay ? 'bg-primary/5' : ''}`}>
                                {eventsInSlots.map((event, index) => {
                                    if (!event) return <div key={`spacer-${index}`} className="h-[26px] w-full invisible" />;
                                    
                                    const isMultiDay = event.originalStartDate !== event.originalEndDate;
                                    const originalStart = event.originalStartDate ? parseISO(event.originalStartDate) : parseISO(event.date);
                                    const originalEnd = event.originalEndDate ? parseISO(event.originalEndDate) : parseISO(event.date);
                                    
                                    const isVisualStart = isSameDay(originalStart, day) || day.getDay() === 0;
                                    const isVisualEnd = isSameDay(originalEnd, day) || day.getDay() === 6;
                                    
                                    let visualStyles = "mx-1 rounded-md"; 
                                    if (isMultiDay) {
                                        if (isVisualStart && isVisualEnd) visualStyles = "mx-1 rounded-md";
                                        else if (isVisualStart) visualStyles = "ml-1 mr-0 rounded-l-md rounded-r-none";
                                        else if (isVisualEnd) visualStyles = "mr-1 ml-0 rounded-r-md rounded-l-none";
                                        else visualStyles = "mx-0 rounded-none";
                                    }

                                    return (<div key={event.id} onClick={() => handleEventClick(event)} className={`relative h-[26px] text-[10px] font-bold flex items-center shadow-sm hover:brightness-110 cursor-pointer ${visualStyles} ${categories[event.category]?.color || 'bg-gray-500'} text-white`}><span className="truncate px-1.5">{event.title}</span></div>);
                                })}
                            </div>
                        );
                    })}
                </div>
                <div className="w-[15px] shrink-0 bg-white border-l border-gray-100"></div>
            </div>

            <div className="flex-1 overflow-y-scroll max-h-[600px] relative scrollbar-thin">
                <div className="flex">
                    <div className="w-14 shrink-0 bg-white border-r border-gray-100">
                        {TIME_SLOTS.map(hour => (<div key={hour} className="relative" style={{ height: `${PIXELS_PER_HOUR}px` }}><span className="absolute -top-2.5 right-2 text-xs text-gray-400 font-medium">{hour}:00</span></div>))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 relative">
                        <div className="absolute inset-0 z-0">{TIME_SLOTS.map(hour => (<div key={hour} className="border-b border-gray-100 w-full" style={{ height: `${PIXELS_PER_HOUR}px` }}></div>))}</div>
                        {daysToRender.map((day) => {
                            const isTodayDay = isToday(day);
                            const dayEvents = gridFilteredEvents
                                .filter(e => isEventInDay(e, day))
                                .filter(e => !e.allDay && e.originalStartDate === e.originalEndDate)
                                .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

                            return (
                                <div key={day.toString()} className={`relative border-r border-gray-100 last:border-r-0 z-10 ${isTodayDay ? 'bg-primary/5' : ''}`}>
                                    {dayEvents.map((event, index, array) => {
                                        if (!event.time) return null;
                                        const [h, m] = event.time.split(':').map(Number);
                                        const eventStart = (h * 60) + m;
                                        
                                        let durationMinutes = 60;
                                        if (event.endTime) {
                                            const [h2, m2] = event.endTime.split(':').map(Number);
                                            durationMinutes = (h2 * 60 + m2) - eventStart;
                                            if (durationMinutes < 15) durationMinutes = 30; 
                                        }
                                        const eventEnd = eventStart + durationMinutes;

                                        const overlapping = array.filter(other => {
                                            if (!other.time) return false;
                                            const [oh, om] = other.time.split(':').map(Number);
                                            const otherStart = (oh * 60) + om;
                                            let otherDuration = 60;
                                            if (other.endTime) {
                                                const [oh2, om2] = other.endTime.split(':').map(Number);
                                                otherDuration = (oh2 * 60 + om2) - otherStart;
                                            }
                                            const otherEnd = otherStart + otherDuration;
                                            return (eventStart < otherEnd && eventEnd > otherStart);
                                        });

                                        const totalOverlaps = overlapping.length;
                                        const myIndex = overlapping.indexOf(event);
                                        const minutesFromStart = eventStart - (START_HOUR * 60);
                                        const top = (minutesFromStart / 60) * PIXELS_PER_HOUR;
                                        const height = (durationMinutes / 60) * PIXELS_PER_HOUR;
                                        const safeOverlaps = totalOverlaps || 1;
                                        const width = 100 / safeOverlaps;
                                        const left = (myIndex === -1 ? 0 : myIndex) * width;

                                        return (
                                            <div key={event.id} onClick={() => handleEventClick(event)} className={`absolute rounded-md p-1.5 shadow-sm border border-white hover:brightness-110 cursor-pointer flex flex-col overflow-hidden text-white transition-all ${categories[event.category]?.color || 'bg-gray-500'}`}
                                                style={{ top: `${top}px`, height: `${height}px`, width: `${width}%`, left: `${left}%`, zIndex: 20 + index }} 
                                            >
                                                <div className="relative z-10">
                                                    <p className="text-[9px] font-bold opacity-90 leading-tight mb-0.5">{event.time} {event.endTime ? `- ${event.endTime}` : ''}</p>
                                                    <p className="text-[10px] font-bold leading-tight line-clamp-2">{event.title}</p>
                                                    {event.local && (<p className="text-[9px] opacity-80 mt-0.5 truncate">{event.local}</p>)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-8 pb-12">
          {Object.keys(groupedEvents).sort().map(dateKey => {
              const date = parseISO(dateKey);
              const events = groupedEvents[dateKey];
              const isTodayDay = isToday(date);

              return (
                  <div key={dateKey} className="relative">
                      {/* Cabeçalho do Dia (Sticky) */}
                      <div className="sticky top-[72px] z-10 bg-gray-50/95 backdrop-blur-sm py-2 px-4 border-y border-gray-200 mb-4 flex items-baseline gap-2 shadow-sm">
                          <h3 className={`text-lg font-display font-black uppercase ${isTodayDay ? 'text-primary' : 'text-gray-700'}`}>
                              {renderDateHeader(dateKey)}
                          </h3>
                          <span className="text-xs font-bold text-gray-400 uppercase">
                              {format(date, "EEEE, dd 'de' MMM", { locale: ptBR })}
                          </span>
                      </div>

                      {/* Corpo da Timeline */}
                      <div className="relative px-4">
                          
                          {/* Linha Vertical (Fixa na esquerda) */}
                          <div className="absolute left-[5.5rem] top-2 bottom-0 w-0.5 bg-gray-200"></div>

                          <div className="space-y-6">
                              {events.map((event) => {
                                  const category = categories[event.category] || categories['general'];
                                  return (
                                      <div key={event.id} onClick={() => handleEventClick(event)} className="relative flex items-start group cursor-pointer">
                                          
                                          {/* Coluna 1: Horário */}
                                          <div className="w-16 text-right pr-4 pt-1 shrink-0">
                                              <span className="text-xs font-bold text-gray-600 block leading-tight">
                                                  {event.allDay ? 'Dia Todo' : event.time}
                                              </span>
                                              {event.endTime && !event.allDay && (
                                                  <span className="text-[9px] text-gray-400 font-medium block mt-0.5">
                                                      até {event.endTime}
                                                  </span>
                                              )}
                                          </div>

                                          {/* REMOVIDO: Coluna 2 (Bolinha) foi deletada daqui */}

                                          {/* Coluna 3: Card do Evento */}
                                          <div className="flex-1 ml-8 bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 group-hover:shadow-md group-hover:border-primary/20 transition-all active:scale-[0.98]">
                                              <div className="flex justify-between items-start mb-1.5">
                                                  <h4 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-primary transition-colors pr-2">
                                                      {event.title}
                                                  </h4>
                                                  
                                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${category.color.replace('bg-', 'text-').replace('text-white', 'border-current bg-transparent')}`}>
                                                      {category.label}
                                                  </span>
                                              </div>
                                              
                                              {event.local && (
                                                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                      <MapPinIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                      <span className="truncate">{event.local}</span>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              );
          })}

          {/* Estado Vazio */}
          {listModeEvents.length === 0 && (
            <div className="py-24 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <MagnifyingGlassIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Nenhum evento encontrado</h3>
              <p className="text-gray-500 text-sm">Tente mudar o período ou os filtros de busca.</p>
            </div>
          )}
        </div>
      )}

      {/* COMPONENTES FINAIS E FECHAMENTO DO LAYOUT */}
      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <InstallPrompt />
    </Layout>
  );
}