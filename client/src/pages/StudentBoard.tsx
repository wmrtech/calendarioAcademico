import { useState, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Room, Allocation } from "@/lib/types";
import { 
  CalendarDaysIcon, ClockIcon, MegaphoneIcon, 
  AcademicCapIcon, MapPinIcon
} from "@heroicons/react/24/outline";
import { format, parseISO, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StudentBoard() {
  const [, params] = useRoute("/student-board/:id");
  const examId = params?.id;
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [countdownText, setCountdownText] = useState<string | null>(null);

  const [warnings, setWarnings] = useState<string[]>([
    "Confira seu documento com foto",
    "Celulares desligados",
    "Chegue com antecedência",
    "Caneta azul ou preta",
    "Silêncio nos corredores"
  ]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      setCurrentTime(now);

      if (exam) {
        let startDateTime = parseISO(exam.date);
        const [hours, minutes] = exam.startTime.split(':').map(Number);
        startDateTime = setHours(startDateTime, hours);
        startDateTime = setMinutes(startDateTime, minutes);

        const diffMs = startDateTime.getTime() - now.getTime();

        if (diffMs > 0) {
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            if (diffDays > 0) {
                setCountdownText(`Faltam ${diffDays} dia${diffDays > 1 ? 's' : ''} e ${diffHours}h`);
            } else if (diffHours > 0) {
                setCountdownText(`Início em ${diffHours}h ${diffMinutes}min`);
            } else {
                setCountdownText(`Início em ${diffMinutes} minutos`);
            }
        } else {
             const passedMinutes = Math.abs(Math.floor(diffMs / 60000));
             if (passedMinutes < 60) {
                 setCountdownText("A prova já começou");
             } else {
                 setCountdownText(null);
             }
        }
      }
    };

    updateTimer(); 
    const timer = setInterval(updateTimer, 10000); 
    return () => clearInterval(timer);
  }, [exam]);

  useEffect(() => {
    if (examId) fetchData();
  }, [examId]);

  const fetchData = async () => {
    try {
      if (!examId) return;

      const [examSnap, roomsSnap] = await Promise.all([
        getDoc(doc(db, "exams", examId)),
        getDocs(query(collection(db, "rooms"), orderBy("name")))
      ]);

      if (!examSnap.exists()) return;

      const examData = { id: examSnap.id, ...examSnap.data() } as Exam;
      setExam(examData);
      setRooms(roomsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));

      if (examData.instructions) {
        setWarnings(prev => [`NOTA DA COORDENAÇÃO: ${examData.instructions}`, ...prev]);
      }

      const q = query(collection(db, "allocations"), where("examId", "==", examId));
      const unsubscribe = onSnapshot(q, (snap) => {
        setAllocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Allocation)));
        setLoading(false);
      });

      return () => unsubscribe();

    } catch (error) {
      console.error("Erro ao carregar:", error);
      setLoading(false);
    }
  };

  const roomsByPeriod = useMemo(() => {
    const groups: Record<string, Room[]> = {};
    
    rooms.forEach(room => {
        const allocation = allocations.find(a => a.roomId === room.id);
        if (allocation && allocation.period) {
            const label = `${allocation.period}º Período`;
            if (!groups[label]) groups[label] = [];
            groups[label].push(room);
        }
    });

    return groups;
  }, [rooms, allocations]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d31c5b] mb-4"></div>
        <p className="animate-pulse tracking-widest uppercase text-xs font-bold text-[#d31c5b]">Carregando Mural...</p>
    </div>
  );
  
  if (!exam) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Prova não encontrada.</div>;

  return (
    <div className="min-h-screen font-sans text-gray-900 selection:bg-[#d31c5b] selection:text-white flex flex-col overflow-hidden bg-white">
      
      {/* --- HEADER --- */}
      <header className="bg-[#d31c5b] text-white shadow-xl z-50 border-b border-[#a01545] relative">
        <div className="container mx-auto px-6 py-5 flex justify-between items-start">
             
             <div className="flex items-start gap-6">
                <img src="/logo_branco.png" alt="Logo" className="h-14 w-auto object-contain filter drop-shadow-sm" />
                <div className="border-l border-white/20 pl-6 pt-1 hidden md:block min-h-[60px]"></div>
                <div>
                    <p className="text-sm font-bold text-white/80 uppercase mb-1 tracking-widest animate-pulse">
                        Confira seu local de prova
                    </p>
                    
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                        <h1 className="text-3xl md:text-4xl font-black uppercase leading-none tracking-tight text-white">
                            {exam.title}
                        </h1>
                        
                        {countdownText && (
                            <div className="bg-white/10 border border-white/20 px-3 py-1 rounded-lg backdrop-blur-sm animate-pulse inline-flex items-center self-start md:self-auto">
                                <ClockIcon className="w-4 h-4 text-white mr-2" />
                                <span className="text-sm md:text-base font-bold uppercase text-white tracking-wide">
                                    {countdownText}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
             </div>
             
             <div className="hidden md:flex items-center gap-8 text-right text-white/90 pt-2">
                <div>
                    <p className="text-[10px] uppercase font-bold text-white/60">Data</p>
                    <p className="text-xl font-bold flex items-center gap-2 justify-end"><CalendarDaysIcon className="w-5 h-5" /> {format(parseISO(exam.date), "dd/MM")}</p>
                </div>
                <div className="border-l border-white/20 pl-8">
                    <p className="text-[10px] uppercase font-bold text-white/60">Horário</p>
                    <p className="text-xl font-bold flex items-center gap-2 justify-end"><ClockIcon className="w-5 h-5" /> {exam.startTime}</p>
                </div>
             </div>
        </div>
      </header>

      {/* --- LETREIRO DIGITAL --- */}
      <div className="bg-gray-50 border-b border-gray-200 py-4 relative shadow-sm z-40">
        <div className="container mx-auto px-6 md:px-8 flex items-center gap-4">
          <div className="bg-[#d31c5b] text-white px-4 py-3 rounded-lg flex items-center z-10 font-black text-xs uppercase tracking-wider shadow-lg flex-shrink-0">
            <MegaphoneIcon className="w-4 h-4 mr-2" /> Avisos
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="whitespace-nowrap animate-marquee flex gap-12 items-center">
              {[...warnings, ...warnings].map((warning, index) => (
                  <span key={index} className="text-sm font-semibold tracking-wide text-gray-700 flex items-center gap-3 flex-shrink-0 px-2">
                      <span className="w-2 h-2 bg-[#d31c5b] rounded-full flex-shrink-0"></span>
                      {warning}
                  </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <main className="flex-1 container mx-auto p-6 md:p-8 overflow-y-auto custom-scrollbar relative z-10">
        {Object.keys(roomsByPeriod).length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-60">
                <AcademicCapIcon className="w-32 h-32 mb-6 text-gray-400" />
                <p className="text-3xl font-black text-gray-500 uppercase tracking-tight">Aguardando Ensalamento</p>
                <p className="text-gray-500 mt-2 font-medium">As salas aparecerão aqui assim que definidas.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {Object.entries(roomsByPeriod)
                    .sort((a,b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
                    .map(([periodName, periodRooms]) => (
                    
                    <div key={periodName} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow duration-300">
                        <div className="bg-gray-50/80 border-b border-gray-100 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#d31c5b]/10 text-[#d31c5b] p-2 rounded-lg">
                                    <AcademicCapIcon className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight leading-none">
                                    {periodName}
                                </h2>
                            </div>
                            <span className="bg-white border border-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                                {periodRooms.length} Salas
                            </span>
                        </div>
                        <div className="p-4 flex-1 bg-white/50">
                            <div className="grid grid-cols-2 gap-3">
                                {periodRooms.map(room => {
                                    const numericPart = room.name.replace(/\D/g, '');
                                    const isNumericOnly = numericPart && room.name.match(/^[\d\s]+$/);
                                    const displayName = isNumericOnly ? numericPart : room.name;
                                    const roomType = room.name.includes("Lab") ? "" : "";
                                    
                                    return (
                                        <div key={room.id} className="bg-[#d31c5b]/5 border border-[#d31c5b]/30 rounded-xl p-4 text-center flex flex-col items-center justify-center min-h-[90px]">
                                            <span className="text-xs font-bold text-gray-400 uppercase mb-1 tracking-wider">
                                                {roomType}
                                            </span>
                                            <span className={`font-black text-[#d31c5b] leading-none ${isNumericOnly ? 'text-3xl' : 'text-lg'}`}>
                                                {displayName}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-3 px-6 flex justify-between items-center z-40">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Afya • Faculdade de Medicina de Itajubá
        </p>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-100 px-2 py-1 rounded">
            Atualizado às {format(currentTime, "HH:mm")}
        </p>
      </footer>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 60s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 20px; }
      `}</style>
    </div>
  );
}
