import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Room, Allocation } from "@/lib/types";
import { 
  CalendarDaysIcon, ClockIcon, MagnifyingGlassIcon, 
  MapPinIcon, MegaphoneIcon, BuildingLibraryIcon
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

  // Avisos para o letreiro digital
  const [warnings, setWarnings] = useState<string[]>([
    "⚠️ Confira seu documento de identificação com foto",
    "📱 Celulares devem permanecer desligados durante toda a prova",
    "🕒 Chegue com 15 minutos de antecedência",
    "🖊️ Utilize apenas caneta azul ou preta",
    "🤫 Silêncio absoluto nos corredores"
  ]);

  useEffect(() => {
    // Atualiza relógio
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

      // Se houver instruções específicas da prova, adiciona aos avisos
      if (examData.instructions) {
        setWarnings(prev => [ ...prev, `📢 ${examData.instructions.substring(0, 50)}...`]);
      }

      // Escuta alocações para saber quais salas estão ativas
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

  // Filtra apenas salas que têm alocação (estão sendo usadas)
  const activeRooms = useMemo(() => {
    const allocatedRoomIds = new Set(allocations.map(a => a.roomId));
    let result = rooms.filter(r => allocatedRoomIds.has(r.id));

    if (searchTerm) {
      result = result.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.block.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return result;
  }, [rooms, allocations, searchTerm]);

  // Agrupa salas por Bloco
  const roomsByBlock = useMemo(() => {
    const groups: Record<string, Room[]> = {};
    activeRooms.forEach(room => {
      if (!groups[room.block]) groups[room.block] = [];
      groups[room.block].push(room);
    });
    return groups;
  }, [activeRooms]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d31c5b] mb-4"></div>
        <p className="animate-pulse tracking-widest uppercase text-xs font-bold text-[#d31c5b]">Carregando Mural...</p>
    </div>
  );
  
  if (!exam) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Prova não encontrada.</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-[#d31c5b] selection:text-white flex flex-col">
      
      {/* --- HEADER --- */}
      <header className="bg-[#d31c5b] text-white shadow-lg z-40 border-b border-[#a01545]">
        <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <img src="/logo.png" alt="Logo" className="h-10 md:h-12 w-auto object-contain filter drop-shadow-sm" />
                <div className="border-l border-white/20 pl-4 h-10 hidden md:block"></div>
                <div>
                    <h1 className="text-xl md:text-2xl font-black uppercase leading-none">{exam.title}</h1>
                    <p className="text-xs text-white/80 font-bold mt-1 uppercase">Localização de Salas para Alunos</p>
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

      {/* --- LETREIRO DIGITAL (TICKER) --- */}
      <div className="bg-yellow-400 text-yellow-900 overflow-hidden py-3 relative shadow-md">
        <div className="absolute top-0 left-0 bg-yellow-500 text-yellow-900 px-3 h-full flex items-center z-10 font-black text-xs uppercase tracking-wider shadow-sm">
            <MegaphoneIcon className="w-4 h-4 mr-1" /> Avisos
        </div>
        <div className="whitespace-nowrap animate-marquee flex gap-12 items-center">
            {/* Repetimos a lista 2x para garantir o loop visual sem buracos */}
            {[...warnings, ...warnings].map((warning, index) => (
                <span key={index} className="text-sm md:text-base font-bold uppercase tracking-wide flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-yellow-800 rounded-full"></span>
                    {warning}
                </span>
            ))}
        </div>
      </div>

      {/* --- CONTEÚDO --- */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        
        {/* Busca Simples */}
        <div className="mb-8 max-w-md mx-auto relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" />
            <input 
                type="text" 
                placeholder="Qual o seu bloco ou sala?" 
                className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-200 shadow-sm focus:ring-2 focus:ring-[#d31c5b] focus:border-transparent outline-none text-center font-bold text-gray-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Lista de Blocos */}
        {Object.keys(roomsByBlock).length === 0 ? (
            <div className="text-center py-20 opacity-50">
                <BuildingLibraryIcon className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                <p className="text-xl font-bold text-gray-400">Nenhuma sala alocada ainda.</p>
            </div>
        ) : (
            <div className="space-y-10">
                {Object.entries(roomsByBlock).sort().map(([blockName, blockRooms]) => (
                    <div key={blockName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Cabeçalho do Bloco */}
                        <div className="bg-gray-100/50 p-4 border-b border-gray-100 flex items-center gap-2">
                            <div className="bg-[#d31c5b] text-white p-2 rounded-lg">
                                <BuildingLibraryIcon className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{blockName}</h2>
                            <span className="ml-auto bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                                {blockRooms.length} Salas
                            </span>
                        </div>

                        {/* Grid de Salas do Bloco */}
                        <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {blockRooms.map(room => (
                                <div key={room.id} className="bg-gray-50 hover:bg-[#d31c5b]/5 border-2 border-transparent hover:border-[#d31c5b] rounded-xl p-4 text-center transition-all group">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Sala</p>
                                    <p className="text-2xl md:text-3xl font-black text-gray-800 group-hover:text-[#d31c5b]">
                                        {room.name.replace("Sala ", "").replace("Laboratório ", "Lab ")}
                                    </p>
                                    <div className="mt-2 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 w-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-3 text-center">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Afya • Boa Prova • {format(currentTime, "HH:mm")}
        </p>
      </footer>

      {/* Estilo para animação do marquee */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}