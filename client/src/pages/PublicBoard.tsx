import { useState, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Room, Allocation, Employee } from "@/lib/types";
import { 
  CalendarDaysIcon, ClockIcon, MagnifyingGlassIcon, 
  UserIcon, MegaphoneIcon, ChevronDownIcon, ChevronUpIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { format, parseISO, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PublicBoard() {
  const [, params] = useRoute("/board/:id");
  const examId = params?.id;
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Estado para o Contador
  const [countdownText, setCountdownText] = useState<string | null>(null);
  
  // Estado para o ícone flutuante de avisos
  const [isNoticesOpen, setIsNoticesOpen] = useState(false);

  // --- TIMER GERAL (Relógio + Contador) ---
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
                setCountdownText(`Início em ${diffMinutes} min`);
            }
        } else {
             const passedMinutes = Math.abs(Math.floor(diffMs / 60000));
             if (passedMinutes < 60) {
                 setCountdownText("Prova Iniciada");
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

  // --- LÓGICA DE SEPARAÇÃO E FILTRO ---
  const { classroomRooms, supportGroups, coordinationTeam } = useMemo(() => {
    
    // 1. COORDENAÇÃO
    const coordinationTeam = employees.filter(emp => {
        const role = emp.role.toUpperCase();
        return role.includes('COORD') || role.includes('COO') || role.includes('ADM');
    }).sort((a, b) => a.name.localeCompare(b.name));

    // 2. APOIO
    const supportMap = new Map<string, Employee[]>();
    const allocatedSupportIds = new Set<string>(); 

    // A) Alocados em Corredores
    allocations.forEach(allocation => {
        const room = rooms.find(r => r.id === allocation.roomId);
        if (!room) return;

        if (isCirculation(room.name)) {
            const staff = allocation.employeeIds
                .map(id => employees.find(e => e.id === id))
                .filter(Boolean) as Employee[];

            const validStaff = staff.filter(e => {
                const r = e.role.toUpperCase();
                return !(r.includes('COORD') || r.includes('COO') || r.includes('ADM'));
            });

            if (validStaff.length > 0) {
                supportMap.set(room.name, validStaff);
                validStaff.forEach(e => allocatedSupportIds.add(e.id));
            }
        }
    });

    // B) Cargo de Apoio/Volante não alocados em corredores
    const unallocatedSupport = employees.filter(emp => {
        const role = emp.role.toUpperCase();
        const isSupport = role.includes('APO') || role.includes('SUPORTE') || role.includes('VOLANTE');
        const isCoord = role.includes('COORD') || role.includes('COO') || role.includes('ADM');
        const alreadyAllocatedInCorridor = allocatedSupportIds.has(emp.id);

        return isSupport && !isCoord && !alreadyAllocatedInCorridor;
    });

    if (unallocatedSupport.length > 0) {
        supportMap.set("Apoio", unallocatedSupport);
    }

    const supportGroups = Array.from(supportMap.entries()).map(([roomName, staff]) => ({ roomName, staff }));

    // 3. SALAS DE AULA
    const classroomList: Room[] = [];
    rooms.forEach(room => {
        if (!isCirculation(room.name)) {
            if (searchTerm) {
                const allocation = allocations.find(a => a.roomId === room.id);
                const matchesName = room.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStaff = allocation?.employeeIds.some(id => employees.find(e => e.id === id)?.name.toLowerCase().includes(searchTerm.toLowerCase()));
                
                if (matchesName || matchesStaff) classroomList.push(room);
            } else {
                classroomList.push(room);
            }
        }
    });

    return { 
        classroomRooms: classroomList, 
        supportGroups, 
        coordinationTeam
    };
  }, [rooms, allocations, employees, searchTerm]);

  function isCirculation(name: string) {
      const n = name.toLowerCase();
      return n.includes('corredor') || n.includes('banheiro') || n.includes('pátio') || n.includes('apoio') || n.includes('volante');
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-600 mb-4"></div>
        <p className="animate-pulse tracking-widest uppercase text-xs font-bold text-pink-600">Carregando Sistema...</p>
    </div>
  );
  
  if (!exam) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Prova não encontrada.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 font-sans text-gray-900 selection:bg-pink-600 selection:text-white pb-16">
      
      {/* HEADER OTIMIZADO */}
      <header className="text-white shadow-2xl sticky top-0 z-40" style={{ backgroundColor: '#d31c5b' }}>
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row justify-between items-center gap-3">
            
            {/* LADO ESQUERDO: LOGO E TÍTULO */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-4">
                    <img src="/logo_branco.png" alt="Logo" className="h-7 md:h-10 w-auto object-contain shrink-0 filter drop-shadow-sm" />
                    <div className="text-left">
                        <span className="bg-pink-600/80 text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-white border border-pink-700/50 shadow-md block w-fit mb-0.5">Ensalamento</span>
                        <h1 className="text-base md:text-2xl font-extrabold uppercase tracking-tight leading-none text-white">{exam.title}</h1>
                    </div>
                </div>
                
                {/* CONTADOR NO MOBILE */}
                {countdownText && (
                    <div className="md:hidden bg-pink-600 border border-pink-700 px-3 py-1 rounded-lg shadow-sm flex items-center">
                        <ClockIcon className="w-3.5 h-3.5 text-white mr-1.5" />
                        <span className="text-xs font-black uppercase text-white tracking-wide whitespace-nowrap">
                            {countdownText}
                        </span>
                    </div>
                )}
            </div>
            
            {/* LADO DIREITO: CONTADOR DESKTOP */}
            <div className="hidden md:flex items-center gap-6">
                {countdownText && (
                    <div className="bg-pink-600 border border-pink-700 px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm inline-flex items-center self-center transition-all duration-300">
                        <ClockIcon className="w-4 h-4 text-white mr-2" />
                        <div className="text-right">
                            <span className="text-sm font-black uppercase text-white tracking-wide block leading-none">
                                {countdownText}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 flex flex-col gap-6 items-start mt-2">
        
        {/* 1. BARRA DE PESQUISA */}
        <section className="w-full">
            <div className="flex items-center gap-4 bg-white p-3 md:p-4 rounded-2xl border-2 border-pink-600/50 shadow-lg hover:border-pink-600 transition-colors">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 ml-1" />
                <input 
                  type="text" 
                  placeholder="Buscar sua sala ou nome..." 
                  className="w-full bg-transparent text-base md:text-lg font-bold text-gray-800 placeholder:text-gray-400 outline-none" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
            </div>
        </section>

        {/* 2. GRID PRINCIPAL (SALAS DE AULA) */}
        <section className="w-full">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-300">
                <h2 className="flex items-center gap-3 text-lg md:text-xl font-extrabold text-gray-800 uppercase">
                    Salas de Aplicação
                    <span className="bg-pink-600 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md">{classroomRooms.length}</span>
                </h2>
            </div>
            
            {classroomRooms.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border-2 border-dashed border-gray-300 shadow-inner">
                    <MagnifyingGlassIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-xl font-medium">Nenhuma sala encontrada.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                    {classroomRooms.map(room => (
                        <RoomCard key={room.id} room={room} allocations={allocations} employees={employees} searchTerm={searchTerm} />
                    ))}
                </div>
            )}
        </section>

        {/* 3. FISCAIS DE APOIO (FULL WIDTH) */}
        <section className="w-full">
          <h2 className="text-lg md:text-xl font-extrabold text-gray-800 uppercase mb-4">
            Volantes
          </h2>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-blue-300">
              <div className="p-5 flex-1">
                  {supportGroups.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-4">Nenhum apoio identificado.</p>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {supportGroups.map((item, idx) => (
                              // Aqui removemos o container "wrapper" com título e deixamos só o grid de pessoas fluir, 
                              // mas como eles são agrupados por local, mantemos a estrutura plana.
                              item.staff.map(emp => (
                                  <div key={emp.id} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 hover:bg-white hover:border-blue-300 transition-all shadow-sm">
                                      <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                                          {emp.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                          <p className="font-bold text-gray-800 text-sm leading-tight truncate">{emp.name}</p>
                                          <p className="text-[10px] text-blue-600 uppercase font-bold mt-0.5 truncate">{emp.role}</p>
                                      </div>
                                  </div>
                              ))
                          ))}
                      </div>
                  )}
              </div>
          </div>
        </section>

        {/* 4. COORDENAÇÃO (FULL WIDTH) */}
        <section className="w-full">
          <h2 className="text-lg md:text-xl font-extrabold text-gray-800 uppercase mb-4">
            Coordenação Geral
          </h2>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:border-pink-300">
              <div className="p-5 flex-1">
                  {coordinationTeam.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-4">Nenhum coordenador cadastrado.</p>
                  ) : (
                      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {coordinationTeam.map(emp => (
                              <li key={emp.id} className="flex items-center gap-3 p-3 rounded-xl bg-pink-50 border border-pink-100 hover:bg-white hover:border-pink-300 transition-all shadow-sm">
                                  <div className="h-10 w-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                                      {emp.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                      <p className="font-bold text-gray-800 text-sm leading-tight truncate">{emp.name}</p>
                                      <p className="text-[10px] text-pink-600 uppercase font-bold mt-0.5 truncate">{emp.role}</p>
                                  </div>
                              </li>
                          ))}
                      </ul>
                  )}
              </div>
          </div>
        </section>

      </main>
      
      {/* ÍCONE FLUTUANTE DE AVISOS */}
      {exam.instructions && (
        <div className="fixed bottom-20 right-6 z-50">
          {/* Botão Flutuante */}
          <button
            onClick={() => setIsNoticesOpen(!isNoticesOpen)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-4 shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
            title="Clique para ver avisos importantes"
          >
            <MegaphoneIcon className="w-6 h-6" />
          </button>

          {/* Modal de Avisos (Expandido) */}
          {isNoticesOpen && (
            <div className="absolute bottom-20 right-0 bg-white rounded-2xl border border-yellow-200 shadow-2xl w-80 max-h-96 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100/50 p-4 border-b border-yellow-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500 text-white p-2 rounded-lg">
                    <MegaphoneIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-800 uppercase tracking-wide text-sm">Avisos Importantes</h3>
                </div>
                <button
                  onClick={() => setIsNoticesOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar">
                <div className="prose prose-sm text-gray-700 whitespace-pre-wrap font-medium text-sm leading-relaxed">
                  {exam.instructions}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* FOOTER */}
      <footer className="fixed bottom-0 w-full bg-white border-t border-gray-200 py-2 px-4 md:px-6 text-center text-[9px] md:text-[10px] text-gray-500 uppercase font-bold z-30 flex justify-between items-center">
        <span>Sistema Afya</span>
        <div className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            <span>{format(currentTime, "HH:mm")}</span>
        </div>
      </footer>
    </div>
  );
}

// SUBCOMPONENTE DE CARD DE SALA (LIMPO E DIRETO)
function RoomCard({ room, allocations, employees, searchTerm }: any) {
    const allocation = allocations.find((a: Allocation) => a.roomId === room.id);
    const staff = allocation?.employeeIds.map((id: string) => employees.find((e: Employee) => e.id === id)).filter(Boolean) || [];
    const isEmpty = staff.length === 0;
    const period = allocation?.period; 

    return (
        <div className={`group bg-white rounded-2xl border shadow-lg transition-all duration-300 flex flex-col overflow-hidden relative ${isEmpty ? 'border-gray-200 opacity-75 hover:opacity-100 hover:shadow-md' : 'border-pink-300/50 hover:shadow-2xl hover:border-pink-600/70 hover:-translate-y-1'}`}>
            
            {/* CABEÇALHO DO CARD - REMOVIDO BLOCO E PENDENTE */}
            <div className={`p-4 md:p-5 flex items-start justify-between ${isEmpty ? 'bg-gray-50' : 'bg-gradient-to-r from-pink-50 to-pink-100/50'}`}>
                <div className="flex flex-col items-start gap-1 flex-1">
                    <h3 className="text-xl md:text-2xl font-black text-gray-800 leading-tight">
                        {room.name}
                    </h3>
                    {period ? (
                         <span className="inline-block px-2.5 py-1 bg-pink-100 text-pink-700 text-[10px] font-bold uppercase rounded-full border border-pink-200 shadow-sm">
                            {period}º Período
                        </span>
                    ) : (
                        <p className="text-xs text-gray-500 font-medium">Cap: {room.capacity}</p>
                    )}
                </div>
            </div>
            
            {/* EQUIPE */}
            <div className="p-4 md:p-5 flex-1 flex flex-col">
                <h4 className="text-[10px] font-bold text-gray-600 uppercase mb-3 flex items-center gap-2 border-b border-gray-100 pb-2">
                    <UserIcon className="w-3.5 h-3.5 text-pink-600" />
                    Equipe ({staff.length})
                </h4>
                
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center py-8 flex-1 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <span className="text-xs font-semibold">Aguardando alocação</span>
                    </div>
                ) : (
                    <ul className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        {staff.map((emp: Employee) => {
                            const isMatch = searchTerm && emp.name.toLowerCase().includes(searchTerm.toLowerCase());
                            return (
                                <li key={emp.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${isMatch ? 'bg-pink-100 border-pink-300 shadow-md' : 'bg-white border-gray-100 hover:border-pink-200 hover:bg-pink-50/30'}`}>
                                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${isMatch ? 'bg-pink-600 animate-pulse' : 'bg-gray-300'}`}></div>
                                        <span className={`text-sm font-bold truncate ${isMatch ? 'text-pink-800' : 'text-gray-700'}`}>
                                            {emp.name}
                                        </span>
                                    </div>
                                    <span className="text-[9px] uppercase font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 shrink-0">
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
}