import { useState, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Room, Allocation } from "@/lib/types";
import { 
  CalendarDaysIcon, ClockIcon, MagnifyingGlassIcon, 
  MegaphoneIcon, AcademicCapIcon, MapPinIcon
} from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StudentBoard() {
  const [, params] = useRoute("/student-board/:id");
  const examId = params?.id;
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  const [warnings, setWarnings] = useState<string[]>([
    "⚠️ Confira seu documento com foto",
    "📱 Celulares desligados",
    "🕒 Chegue com antecedência",
    "🖊️ Caneta azul ou preta"
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
        setWarnings(prev => [ ...prev, `📢 ${examData.instructions.substring(0, 50)}...`]);
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

  // --- AGRUPAR POR PERÍODO ---
  const roomsByPeriod = useMemo(() => {
    const groups: Record<string, Room[]> = {};
    
    // Filtro de busca
    let filteredRooms = rooms;
    if (searchTerm) {
        filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    filteredRooms.forEach(room => {
        // Acha a alocação dessa sala
        const allocation = allocations.find(a => a.roomId === room.id);
        
        // Se a sala tem um período definido, usa ele. Se não, ignora (ou põe em "Outros")
        if (allocation && allocation.period) {
            const label = `${allocation.period}º Período`;
            if (!groups[label]) groups[label] = [];
            groups[label].push(room);
        }
    });

    return groups;
  }, [rooms, allocations, searchTerm]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d31c5b] mb-4"></div>
        <p className="animate-pulse tracking-widest uppercase text-xs font-bold text-[#d31c5b]">Carregando Mural...</p>
    </div>
  );
  
  if (!exam) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Prova não encontrada.</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-[#d31c5b] selection:text-white flex flex-col">
      
      {/* HEADER */}
      <header className="bg-[#d31c5b] text-white shadow-lg z-40 border-b border-[#a01545]">
        <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <img src="/logo.png" alt="Logo" className="h-10 md:h-12 w-auto object-contain filter drop-shadow-sm" />
                <div className="border-l border-white/20 pl-4 h-10 hidden md:block"></div>
                <div>
                    <h1 className="text-xl md:text-2xl font-black uppercase leading-none">{exam.title}</h1>
                    <p className="text-xs text-white/80 font-bold mt-1 uppercase">Localização por Período</p>
                </div>
             </div>
             
             <div className="hidden md:flex items-center gap-6 text-right">
                <div>
                    <p className="text-[10px] uppercase font-bold text-white/60">Data</p>
                    <p className="font-bold flex items-center gap-1"><CalendarDaysIcon className="w-4 h-4" /> {format(parseISO(exam.date), "dd/MM")}</p>
                </div>
                <div>
                    <p className="text-[10px] uppercase font-bold text-white/60">Horário</p>
                    <p className="font-bold flex items-center gap-1"><ClockIcon className="w-4 h-4" /> {exam.startTime}</p>
                </div>
             </div>
        </div>
      </header>

      {/* LETREIRO */}
      <div className="bg-yellow-400 text-yellow-900 overflow-hidden py-3 relative shadow-md">
        <div className="absolute top-0 left-0 bg-yellow-500 text-yellow-900 px-3 h-full flex items-center z-10 font-black text-xs uppercase tracking-wider shadow-sm">
            <MegaphoneIcon className="w-4 h-4 mr-1" /> Avisos
        </div>
        <div className="whitespace-nowrap animate-marquee flex gap-12 items-center">
            {[...warnings, ...warnings].map((warning, index) => (
                <span key={index} className="text-sm md:text-base font-bold uppercase tracking-wide flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-800 rounded-full"></span>
                    {warning}
                </span>
            ))}
        </div>
      </div>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        
        {/* Busca */}
        <div className="mb-10 max-w-md mx-auto relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
            <input 
                type="text" 
                placeholder="Busque sua sala..." 
                className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 shadow-sm focus:ring-2 focus:ring-[#d31c5b] outline-none text-center font-bold text-gray-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>

        {/* LISTAGEM AGRUPADA POR PERÍODO */}
        {Object.keys(roomsByPeriod).length === 0 ? (
            <div className="text-center py-20 opacity-50">
                <AcademicCapIcon className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-bold text-gray-400">Nenhuma turma alocada ainda.</p>
                <p className="text-sm text-gray-400 mt-2">O ensalamento está sendo gerado.</p>
            </div>
        ) : (
            <div className="grid gap-10">
                {/* Ordena os períodos (1º, 2º, 3º...) */}
                {Object.entries(roomsByPeriod).sort((a,b) => a[0].localeCompare(b[0], undefined, { numeric: true })).map(([periodName, periodRooms]) => (
                    <div key={periodName} className="relative">
                        
                        {/* TÍTULO DO PERÍODO (Estilo Divisor) */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-[#d31c5b] text-white p-3 rounded-xl shadow-lg shadow-pink-200">
                                <AcademicCapIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight">{periodName}</h2>
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{periodRooms.length} Salas Alocadas</p>
                            </div>
                            <div className="flex-1 h-px bg-gray-200 ml-4"></div>
                        </div>

                        {/* GRID DE SALAS DESSE PERÍODO */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {periodRooms.map(room => (
                                <div key={room.id} className="bg-white border-2 border-gray-100 hover:border-[#d31c5b] hover:shadow-lg rounded-2xl p-5 text-center transition-all group flex flex-col justify-center items-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 bg-gray-100 text-[10px] font-bold text-gray-500 px-2 py-1 rounded-bl-lg">
                                        {room.block}
                                    </div>
                                    
                                    <MapPinIcon className="w-8 h-8 text-gray-300 group-hover:text-[#d31c5b] mb-2 transition-colors" />
                                    <p className="text-2xl md:text-3xl font-black text-gray-800 leading-none">
                                        {room.name.replace(/\D/g,'')} {/* Mostra só o número grande */}
                                    </p>
                                    <p className="text-xs font-bold text-gray-400 uppercase mt-1">
                                        {room.name.replace(/\d+/g, '') || "Sala"} {/* Mostra "Sala" ou "Lab" */}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 text-center">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Afya • Atualizado às {format(currentTime, "HH:mm")}
        </p>
      </footer>

      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
      `}</style>
    </div>
  );
}