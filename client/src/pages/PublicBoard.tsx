import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Room, Allocation, Employee } from "@/lib/types";
import { 
  CalendarDaysIcon, ClockIcon, MagnifyingGlassIcon, 
  MapPinIcon, UserIcon, MegaphoneIcon, ChevronDownIcon, ChevronUpIcon,
  FunnelIcon 
} from "@heroicons/react/24/outline";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PublicBoard() {
  const [, params] = useRoute("/board/:id");
  const examId = params?.id;
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [activeBlock, setActiveBlock] = useState("Todos");
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isNoticesOpen, setIsNoticesOpen] = useState(false);

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

      const [examSnap, roomsSnap, empsSnap] = await Promise.all([
        getDoc(doc(db, "exams", examId)),
        getDocs(query(collection(db, "rooms"), orderBy("name"))),
        getDocs(collection(db, "employees"))
      ]);

      if (!examSnap.exists()) return;

      setExam({ id: examSnap.id, ...examSnap.data() } as Exam);
      setRooms(roomsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));
      setEmployees(empsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));

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

  const availableBlocks = useMemo(() => {
      const blocks = new Set(rooms.map(r => r.block).filter(Boolean));
      return ["Todos", ...Array.from(blocks).sort()];
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    let result = rooms;

    if (activeBlock !== "Todos") {
        result = result.filter(r => r.block === activeBlock);
    }

    if (searchTerm) {
        result = result.filter(room => {
            if (room.name.toLowerCase().includes(searchTerm.toLowerCase())) return true;
            const allocation = allocations.find(a => a.roomId === room.id);
            if (!allocation) return false;
            return allocation.employeeIds.some(empId => {
                const emp = employees.find(e => e.id === empId);
                return emp?.name.toLowerCase().includes(searchTerm.toLowerCase());
            });
        });
    }
    
    return result;
  }, [rooms, allocations, employees, searchTerm, activeBlock]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d31c5b] mb-4"></div>
        <p className="animate-pulse tracking-widest uppercase text-xs font-bold text-[#d31c5b]">Carregando Sistema...</p>
    </div>
  );
  
  if (!exam) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Prova não encontrada.</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-[#d31c5b] selection:text-white pb-12">
      
      {/* --- HEADER AFYA CORRIGIDO --- */}
      <header className="bg-[#d31c5b] text-white shadow-xl sticky top-0 z-40 border-b border-[#a01545]">
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                
                {/* AJUSTE MOBILE: 
                   - w-full para ocupar tudo
                   - justify-between para separar Logo (esq) e Texto (dir)
                   - items-center para alinhar verticalmente
                */}
                <div className="flex items-center justify-between md:justify-start w-full md:w-auto gap-4">
                    
                    {/* Logo na Esquerda */}
                    <img 
                        src="/logo_branco.png" 
                        alt="Logo Instituição" 
                        // Ajustei a altura no mobile (h-8) para não brigar com o texto
                        className="h-8 md:h-12 w-auto object-contain shrink-0 filter drop-shadow-sm" 
                    />
                    
                    {/* Separador (Desktop) */}
                    <div className="border-l border-white/20 pl-0 md:pl-6 hidden md:block h-10"></div>
                    
                    {/* Texto na Direita (Mobile: text-right | Desktop: text-left) */}
                    <div className="text-right md:text-left">
                        {/* Container dos Badges alinhado à direita no mobile */}
                        <div className="flex items-center justify-end md:justify-start gap-2 mb-1">
                            <span className="bg-white/20 text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider text-white border border-white/10">
                                Ensalamento
                            </span>
                            <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] text-white font-bold uppercase animate-pulse">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
                                Ao Vivo
                            </span>
                        </div>
                        {/* Título */}
                        <h1 className="text-lg md:text-3xl font-black uppercase tracking-tight leading-none text-white">
                            {exam.title}
                        </h1>
                    </div>
                </div>

                {/* Info Rápida (Desktop) */}
                <div className="items-center gap-8 text-white/80 hidden md:flex">
                    <div className="text-right">
                        <p className="text-xs uppercase font-bold text-white/60">Data</p>
                        <p className="text-lg font-bold text-white flex items-center gap-2 justify-end">
                            <CalendarDaysIcon className="w-5 h-5" />
                            {format(parseISO(exam.date), "dd/MM", { locale: ptBR })}
                        </p>
                    </div>
                    <div className="text-right border-l border-white/20 pl-8">
                        <p className="text-xs uppercase font-bold text-white/60">Horário</p>
                        <p className="text-lg font-bold text-white flex items-center gap-2 justify-end">
                            <ClockIcon className="w-5 h-5" />
                            {exam.startTime} - {exam.endTime}
                        </p>
                    </div>
                </div>
            </div>
        </div>
        
        {/* BARRA DE BUSCA & FILTROS */}
        <div className="bg-white border-b border-gray-200 shadow-sm sticky top-[68px] md:top-[88px] z-30">
             <div className="container mx-auto px-4 md:px-6 py-3 space-y-3">
                
                {/* Input de Busca */}
                <div className="flex items-center gap-4">
                    <MagnifyingGlassIcon className="w-5 md:w-6 h-5 md:h-6 text-[#d31c5b]" />
                    <input 
                        type="text" 
                        placeholder="Busque por nome, sala ou fiscal..." 
                        className="w-full bg-transparent text-base md:text-lg font-medium text-gray-800 placeholder:text-gray-300 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filtros Rápidos */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar md:no-scrollbar mask-gradient">
                    <FunnelIcon className="w-4 h-4 text-gray-400 shrink-0 mr-1" />
                    {availableBlocks.map(block => (
                        <button
                            key={block}
                            onClick={() => setActiveBlock(block)}
                            className={`whitespace-nowrap px-3 py-1 text-xs font-bold uppercase rounded-full border transition-all 
                                ${activeBlock === block 
                                    ? 'bg-[#d31c5b] text-white border-[#d31c5b] shadow-md shadow-[#d31c5b]/20' 
                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#d31c5b]/50 hover:text-[#d31c5b]'
                                }
                            `}
                        >
                            {block}
                        </button>
                    ))}
                </div>
             </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 flex flex-col gap-6 items-start mt-2">
        
        {/* AVISOS IMPORTANTES (TOPO) */}
        {exam.instructions && (
            <div className="w-full">
                <button 
                    onClick={() => setIsNoticesOpen(!isNoticesOpen)}
                    className={`w-full group rounded-xl border transition-all duration-500 overflow-hidden text-left relative
                        ${isNoticesOpen 
                            ? 'bg-yellow-50 border-yellow-200 shadow-sm' 
                            : 'bg-white border-l-4 border-l-yellow-400 border-y-gray-200 border-r-gray-200 hover:shadow-md'
                        }
                    `}
                >
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isNoticesOpen ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-100 text-yellow-600 animate-pulse'}`}>
                                <MegaphoneIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-bold text-sm uppercase tracking-wide text-yellow-900">
                                    {isNoticesOpen ? 'Quadro de Avisos' : 'Avisos Importantes'}
                                </h2>
                                {!isNoticesOpen && (
                                    <p className="text-xs text-gray-400 mt-0.5">Ler instruções.</p>
                                )}
                            </div>
                        </div>
                        {isNoticesOpen ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
                    </div>

                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isNoticesOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="px-6 pb-6 pt-0">
                            <div className="max-h-60 overflow-y-auto pr-2 border-t border-yellow-200 pt-4 custom-scrollbar">
                                <div className="prose prose-sm text-gray-700 whitespace-pre-wrap font-medium">
                                    {exam.instructions}
                                </div>
                            </div>
                        </div>
                    </div>
                </button>
            </div>
        )}

        {/* SALAS (ABAIXO) */}
        <section className="w-full">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2">
                    {activeBlock !== "Todos" ? `Filtrando por: ${activeBlock}` : "Todas as Salas"}
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">
                        {filteredRooms.length}
                    </span>
                </h3>
            </div>

            {filteredRooms.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-gray-200">
                    <MagnifyingGlassIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 text-xl font-medium">Nenhum resultado encontrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                    {filteredRooms.map(room => {
                        const allocation = allocations.find(a => a.roomId === room.id);
                        const staff = allocation?.employeeIds.map(id => employees.find(e => e.id === id)).filter(Boolean) as Employee[] || [];
                        const isEmpty = staff.length === 0;

                        return (
                            <div key={room.id} className={`group bg-white rounded-xl border shadow-sm transition-all duration-300 flex flex-col overflow-hidden relative ${isEmpty ? 'border-gray-100 opacity-80' : 'border-gray-200 hover:shadow-lg hover:border-[#d31c5b]/30'}`}>
                                
                                <div className="absolute top-0 right-0 p-3">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded-md group-hover:bg-[#d31c5b]/5 group-hover:text-[#d31c5b] transition-colors">
                                        {room.block}
                                    </span>
                                </div>

                                <div className="p-4 md:p-5 border-b border-gray-50 bg-gradient-to-r from-transparent via-transparent to-gray-50/30">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isEmpty ? 'bg-gray-100 text-gray-400' : 'bg-[#d31c5b] text-white shadow-lg shadow-[#d31c5b]/20'}`}>
                                            <MapPinIcon className="w-5 h-5" />
                                        </div>
                                        <div className="mt-1">
                                            <h3 className="text-lg md:text-xl font-black text-gray-800 leading-none">
                                                {room.name}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-1 font-medium">Cap: {room.capacity}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-4 md:p-5 flex-1 bg-gray-50/30">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                                        <UserIcon className="w-3 h-3" />
                                        Equipe Designada
                                    </h4>
                                    
                                    {isEmpty ? (
                                        <div className="flex flex-col items-center justify-center py-4 text-gray-300 border-2 border-dashed border-gray-100 rounded-lg">
                                            <span className="text-xs font-medium">Aguardando...</span>
                                        </div>
                                    ) : (
                                        <ul className="space-y-2">
                                            {staff.map(emp => {
                                                const isMatch = searchTerm && emp.name.toLowerCase().includes(searchTerm.toLowerCase());
                                                return (
                                                    <li key={emp.id} className={`flex items-center justify-between p-2 rounded-lg border transition-all ${isMatch ? 'bg-[#d31c5b]/10 border-[#d31c5b]/20 shadow-sm' : 'bg-white border-gray-100'}`}>
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMatch ? 'bg-[#d31c5b]' : 'bg-gray-300'}`}></div>
                                                            <span className={`text-sm font-bold truncate ${isMatch ? 'text-[#a01545]' : 'text-gray-700'}`}>
                                                                {emp.name}
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                            {emp.role.substring(0,3)}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>

      </main>
      
      {/* Footer Mobile/Desktop */}
      <footer className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-2 px-4 md:px-6 text-center text-[10px] text-gray-400 uppercase font-bold z-30 flex justify-between items-center">
        <span>Afya - Faculdade de Medicina de Itajubá | Coordenação de Medicina</span>
        <span>Atualizado • {format(currentTime, "HH:mm")}</span>
      </footer>
    </div>
  );
}