import { useState, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { doc, getDoc, collection, query, where, onSnapshot, setDoc, deleteDoc, orderBy, addDoc, Timestamp, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Room, Allocation, ACADEMIC_PERIODS } from "@/lib/types";
import { 
  UsersIcon, CalendarDaysIcon, PlusIcon, RectangleStackIcon, 
  BuildingLibraryIcon, ChartPieIcon, XCircleIcon, MagnifyingGlassIcon,
  PencilSquareIcon, TrashIcon, UserGroupIcon, ShieldCheckIcon, ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PublicEnsalamento() {
  const [, params] = useRoute("/ensalamento/:id");
  const examId = params?.id;

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Estados de Criação, Edição e Filtros
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [newRoom, setNewRoom] = useState({ name: "", block: "", capacity: "" });
  const [editingRoom, setEditingRoom] = useState<Room | null>(null); 
  
  const [creating, setCreating] = useState(false);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    if (examId) fetchData();
  }, [examId]);

  const fetchData = async () => {
    try {
      if (!examId) return;
      const examSnap = await getDoc(doc(db, "exams", examId));
      if (!examSnap.exists()) { setLoading(false); return; }
      setExam({ id: examSnap.id, ...examSnap.data() } as Exam);

      const unsubRooms = onSnapshot(query(collection(db, "rooms"), orderBy("name")), (snap) => {
          setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));
      });

      const unsubAlloc = onSnapshot(query(collection(db, "allocations"), where("examId", "==", examId)), (snap) => {
        setAllocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Allocation)));
        setLoading(false);
      });

      return () => { unsubRooms(); unsubAlloc(); };
    } catch (error) { console.error(error); setLoading(false); }
  };

  // --- MEMO: AGRUPAMENTO E KPIs ---
  const data = useMemo(() => {
      const groups: Record<string, Room[]> = {};
      const available: Room[] = [];
      let totalCapacityAllocated = 0;
      let totalCapacityAvailable = 0;
      let totalStudents = 0;
      let totalFiscals = 0;

      rooms.forEach(room => {
          const allocation = allocations.find(a => a.roomId === room.id);
          const period = allocation?.period;

          if (filterText && !room.name.toLowerCase().includes(filterText.toLowerCase()) && !room.block.toLowerCase().includes(filterText.toLowerCase())) return;

          if (period) {
              if (!groups[period]) groups[period] = [];
              groups[period].push(room);
              totalCapacityAllocated += (room.capacity || 0);
              
              // Contagem de Alunos e Fiscais
              const stCount = allocation.studentCount || 0; // studentCount agora existe na alocação
              totalStudents += stCount;
              totalFiscals += Math.ceil(stCount / 20); // REGRA: 1 fiscal a cada 20
          } else {
              available.push(room);
              totalCapacityAvailable += (room.capacity || 0);
          }
      });

      const sortedKeys = Object.keys(groups).sort((a, b) => parseInt(a) - parseInt(b));
      const occupancyRate = rooms.length > 0 ? Math.round((rooms.length - available.length) / rooms.length * 100) : 0;

      return { sortedKeys, groups, available, totalCapacityAllocated, totalCapacityAvailable, occupancyRate, totalStudents, totalFiscals };
  }, [rooms, allocations, filterText]);

  // --- AÇÕES DE SALA (CRUD) ---

  const handleCreateRoom = async (e: React.FormEvent) => {
      e.preventDefault();
      setCreating(true);
      try {
          await addDoc(collection(db, "rooms"), {
              name: newRoom.name.toUpperCase(), 
              block: newRoom.block.toUpperCase(),
              capacity: parseInt(newRoom.capacity), 
              isActive: true, features: [], createdAt: Timestamp.now()
          });
          toast.success("Sala criada!"); setIsCreateOpen(false); setNewRoom({ name: "", block: "", capacity: "" });
      } catch (err) { toast.error("Erro ao criar."); } 
      finally { setCreating(false); }
  };

  const handleEditRoomSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingRoom) return;
      setCreating(true);
      try {
          await setDoc(doc(db, "rooms", editingRoom.id), {
              ...editingRoom,
              name: editingRoom.name.toUpperCase(),
              block: editingRoom.block.toUpperCase(),
              capacity: Number(editingRoom.capacity)
          }, { merge: true });
          toast.success("Sala atualizada!");
          setIsEditOpen(false);
          setEditingRoom(null);
      } catch (err) { toast.error("Erro ao editar."); }
      finally { setCreating(false); }
  };

  const handleDeleteRoom = async (roomId: string) => {
      if(!window.confirm("Tem certeza que deseja excluir esta sala? Todas as alocações vinculadas a ela serão removidas.")) return;
      
      try {
          const q = query(collection(db, "allocations"), where("roomId", "==", roomId));
          const querySnapshot = await getDocs(q);
          const batch = writeBatch(db);
          querySnapshot.forEach((doc) => batch.delete(doc.ref));
          batch.delete(doc(db, "rooms", roomId));
          await batch.commit();
          toast.success("Sala excluída com sucesso.");
      } catch (err) {
          console.error(err);
          toast.error("Erro ao excluir sala.");
      }
  };

  const openEditModal = (room: Room) => {
      setEditingRoom(room);
      setIsEditOpen(true);
  };

  // --- AÇÕES DE ALOCAÇÃO (Agora com Qtd de Alunos) ---

  const handleUpdateAllocation = async (roomId: string, period: string | null, studentCount: number = 0) => {
    if (!exam) return;
    setSavingId(roomId);
    const currentAllocation = allocations.find(a => a.roomId === roomId);
    
    // CASO DE REMOÇÃO (Liberar Sala)
    if (!period) {
        if (currentAllocation) {
            await deleteDoc(doc(db, "allocations", currentAllocation.id));
            toast.success("Sala liberada.");
        }
        setSavingId(null);
        return;
    }

    // CASO DE CRIAÇÃO OU ATUALIZAÇÃO
    const docId = currentAllocation ? currentAllocation.id : `${exam.id}_${roomId}`;
    try {
      await setDoc(doc(db, "allocations", docId), {
        id: docId, 
        examId: exam.id, 
        roomId: roomId, 
        employeeIds: currentAllocation?.employeeIds || [],
        period: period, 
        studentCount: studentCount, // SALVA A QUANTIDADE DE ALUNOS
        updatedAt: new Date()
      }, { merge: true });
      
      if(!currentAllocation) toast.success("Alocado!");
    } catch (error) { toast.error("Erro."); } 
    finally { setSavingId(null); }
  };

  // Atualização rápida de apenas a quantidade de alunos no card
  const handleUpdateStudentCount = async (allocationId: string, count: number) => {
      try {
        await setDoc(doc(db, "allocations", allocationId), { studentCount: count }, { merge: true });
      } catch(e) { toast.error("Erro ao atualizar alunos"); }
  }

  const handleUpdateCapacityInline = async (roomId: string, newCap: number) => {
      try { await setDoc(doc(db, "rooms", roomId), { capacity: newCap }, { merge: true }); toast.success("Capacidade atualizada."); } catch (err) {}
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#d31c5b] font-medium animate-pulse">Carregando...</div>;
  if (!exam) return <div className="min-h-screen flex items-center justify-center text-gray-500">Prova inválida.</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col font-sans">
      
      {/* HEADER FIXO */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Afya" className="h-7 w-auto object-contain" />
                <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
                <div className="hidden md:block">
                    <h1 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Ensalamento de Prova</h1>
                </div>
            </div>
            
            {/* KPI BAR */}
            <div className="hidden lg:flex items-center gap-6 text-xs font-medium text-gray-500 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <ChartPieIcon className="w-4 h-4 text-[#d31c5b]" />
                    <span>Ocupação: <b className="text-gray-800 font-bold">{data.occupancyRate}%</b></span>
                </div>
                <div className="w-px h-3 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-4 h-4 text-blue-600" />
                    <span>Total Alunos: <b className="text-gray-800 font-bold">{data.totalStudents}</b></span>
                </div>
                <div className="w-px h-3 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                    <span>Fiscais Necessários: <b className="text-gray-800 font-bold">{data.totalFiscals}</b></span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-white px-3 py-1.5 rounded border border-gray-200">
                     <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
                     <span className="font-bold text-[#d31c5b] uppercase truncate max-w-[150px]">{exam.title}</span>
                </div>

                {/* MODAL CRIAR SALA */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="bg-[#d31c5b] hover:bg-[#a01545] text-white gap-1 font-medium shadow-sm transition-all">
                            <PlusIcon className="w-4 h-4" /> <span className="hidden sm:inline">Nova Sala</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white font-sans">
                        <DialogHeader><DialogTitle>Cadastrar Nova Sala</DialogTitle></DialogHeader>
                        <form onSubmit={handleCreateRoom} className="space-y-4 pt-4">
                            <div><Label>Nome da Sala</Label><Input value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})} placeholder="Ex: Sala 102" required /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Bloco</Label><Input value={newRoom.block} onChange={e => setNewRoom({...newRoom, block: e.target.value})} placeholder="Ex: A" required /></div>
                                <div><Label>Capacidade</Label><Input type="number" value={newRoom.capacity} onChange={e => setNewRoom({...newRoom, capacity: e.target.value})} required /></div>
                            </div>
                            <Button type="submit" disabled={creating} className="w-full bg-[#d31c5b] mt-2 text-white font-bold">Salvar Cadastro</Button>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* MODAL EDITAR SALA */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="bg-white font-sans">
                        <DialogHeader><DialogTitle>Editar Sala</DialogTitle></DialogHeader>
                        {editingRoom && (
                            <form onSubmit={handleEditRoomSubmit} className="space-y-4 pt-4">
                                <div><Label>Nome da Sala</Label><Input value={editingRoom.name} onChange={e => setEditingRoom({...editingRoom, name: e.target.value})} required /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>Bloco</Label><Input value={editingRoom.block} onChange={e => setEditingRoom({...editingRoom, block: e.target.value})} required /></div>
                                    <div><Label>Capacidade</Label><Input type="number" value={editingRoom.capacity} onChange={e => setEditingRoom({...editingRoom, capacity: Number(e.target.value)})} required /></div>
                                </div>
                                <Button type="submit" disabled={creating} className="w-full bg-blue-600 hover:bg-blue-700 mt-2 text-white font-bold">Atualizar Sala</Button>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
      </header>

      {/* LAYOUT PRINCIPAL */}
      <div className="flex-1 container mx-auto p-4 flex flex-col lg:flex-row gap-6 overflow-hidden h-[calc(100vh-60px)]">
        
        {/* COLUNA ESQUERDA: ALOCAÇÕES */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20">
            {data.sortedKeys.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl p-10 bg-gray-50/50">
                    <BuildingLibraryIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-medium">Nenhuma sala alocada ainda.</p>
                    <p className="text-sm font-light">Selecione uma sala na barra lateral para começar.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {data.sortedKeys.map(periodId => (
                        <div key={periodId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                <h2 className="font-bold text-gray-700 flex items-center gap-2">
                                    <span className="bg-[#d31c5b] text-white w-6 h-6 rounded flex items-center justify-center text-xs shadow-sm">{periodId}º</span>
                                    Período
                                </h2>
                                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                                    {data.groups[periodId].length} salas
                                </span>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {data.groups[periodId].map(room => (
                                    <RoomCard 
                                        key={room.id} 
                                        room={room} 
                                        allocation={allocations.find(a => a.roomId === room.id)}
                                        currentPeriod={periodId} 
                                        savingId={savingId} 
                                        onUpdateAllocation={handleUpdateAllocation} 
                                        onUpdateCapacity={handleUpdateCapacityInline}
                                        onUpdateStudentCount={handleUpdateStudentCount}
                                        onEdit={() => openEditModal(room)}
                                        onDelete={() => handleDeleteRoom(room.id)}
                                        isAllocated={true}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* COLUNA DIREITA: SIDEBAR */}
        <div className="w-full lg:w-80 bg-white border border-gray-200 shadow-xl rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2 mb-3">
                    <RectangleStackIcon className="w-4 h-4" />
                    Salas Disponíveis ({data.available.length})
                </h3>
                
                <div className="relative group">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 group-focus-within:text-[#d31c5b] transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Filtrar sala..." 
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#d31c5b] focus:ring-1 focus:ring-[#d31c5b]/20 transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-gray-50/30">
                {data.available.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-xs font-light">
                        {filterText ? "Nenhuma sala encontrada." : "Tudo alocado! 🎉"}
                    </div>
                ) : (
                    data.available.map(room => (
                        <RoomCardSidebar 
                            key={room.id} 
                            room={room} 
                            savingId={savingId} 
                            onUpdateAllocation={handleUpdateAllocation}
                            onEdit={() => openEditModal(room)}
                            onDelete={() => handleDeleteRoom(room.id)}
                        />
                    ))
                )}
            </div>
            
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-[10px] text-center text-gray-500 font-medium">
                Capacidade Disponível: <b className="text-gray-800">{data.totalCapacityAvailable}</b> lugares
            </div>
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTES ---

function RoomCardSidebar({ room, savingId, onUpdateAllocation, onEdit, onDelete }: any) {
    const [open, setOpen] = useState(false);
    const [period, setPeriod] = useState("");
    const [students, setStudents] = useState(room.capacity);

    const fiscalsNeeded = Math.ceil(students / 20);

    const handleAllocate = () => {
        if(!period) return toast.error("Selecione um período");
        onUpdateAllocation(room.id, period, Number(students));
        setOpen(false);
    };

    return (
        <div className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group relative">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2 shadow-sm rounded-bl-lg z-10">
                <button onClick={onEdit} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><PencilSquareIcon className="w-3 h-3" /></button>
                <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><TrashIcon className="w-3 h-3" /></button>
            </div>

            <div className="flex justify-between items-start mb-2 pr-12">
                <div>
                    <h4 className="font-bold text-gray-700 text-sm">{room.name}</h4>
                    <span className="text-[10px] text-gray-500 uppercase bg-gray-100 px-1.5 py-0.5 rounded font-medium">{room.block}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                    <UsersIcon className="w-3 h-3" /> {room.capacity}
                </div>
            </div>
            
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full h-7 text-[10px] font-bold uppercase border-gray-200 text-gray-500 hover:border-[#d31c5b] hover:text-[#d31c5b] hover:bg-white transition-all"
                        disabled={savingId === room.id}
                    >
                        Alocar agora...
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-white font-sans sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Alocar Sala {room.name}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Período</Label>
                            <Select onValueChange={setPeriod}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACADEMIC_PERIODS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Alunos</Label>
                            <Input 
                                type="number" 
                                value={students} 
                                onChange={(e) => setStudents(Number(e.target.value))} 
                                className="col-span-3" 
                            />
                        </div>
                        
                        {/* Resumo de Fiscais */}
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between text-sm">
                             <span className="text-gray-500">Regra: 1 Fiscal / 20 alunos</span>
                             <div className="flex items-center gap-2 font-bold text-gray-800">
                                <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                                {fiscalsNeeded} {fiscalsNeeded === 1 ? 'Fiscal' : 'Fiscais'}
                             </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleAllocate} className="bg-[#d31c5b] hover:bg-[#a01545] text-white">Confirmar Alocação</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RoomCard({ room, allocation, savingId, onUpdateAllocation, onUpdateCapacity, onUpdateStudentCount, onEdit, onDelete }: any) {
    const students = allocation?.studentCount || 0;
    const fiscalsNeeded = Math.ceil(students / 20);
    const isOverCapacity = students > room.capacity;

    return (
        <div className="bg-white p-3 rounded-lg border border-l-4 border-l-[#d31c5b] border-y-gray-200 border-r-gray-200 shadow-sm hover:shadow-md transition-all group relative">
            
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={onEdit} className="p-1 text-gray-300 hover:text-blue-600 hover:bg-gray-100 rounded" title="Editar"><PencilSquareIcon className="w-3.5 h-3.5" /></button>
                 <button onClick={onDelete} className="p-1 text-gray-300 hover:text-red-600 hover:bg-gray-100 rounded" title="Excluir"><TrashIcon className="w-3.5 h-3.5" /></button>
            </div>

            <div className="flex justify-between items-start mb-2 pr-10">
                <div>
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        {room.name}
                    </h3>
                    <span className="text-[10px] font-medium text-gray-400 uppercase">{room.block}</span>
                </div>
            </div>
            
            {/* DADOS DE OCUPAÇÃO */}
            <div className="space-y-2 my-3">
                
                {/* Capacidade da Sala (Fixo/Editável) */}
                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 flex items-center gap-1"><UsersIcon className="w-3 h-3" /> Capacidade:</span>
                    <input 
                        type="number" 
                        className="w-10 text-right bg-transparent border-b border-gray-200 focus:border-[#d31c5b] outline-none font-medium text-gray-600"
                        defaultValue={room.capacity}
                        onBlur={(e) => onUpdateCapacity(room.id, parseInt(e.target.value))}
                    />
                </div>

                {/* Quantidade de Alunos Alocados */}
                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 flex items-center gap-1"><UserGroupIcon className="w-3 h-3" /> Alunos:</span>
                    <div className="flex items-center gap-1">
                        {isOverCapacity && <ExclamationTriangleIcon className="w-3 h-3 text-red-500 animate-pulse" title="Superlotação!" />}
                        <input 
                            type="number" 
                            className={`w-10 text-right bg-transparent border-b border-gray-200 focus:border-[#d31c5b] outline-none font-bold ${isOverCapacity ? 'text-red-600' : 'text-gray-800'}`}
                            defaultValue={students}
                            onBlur={(e) => onUpdateStudentCount(allocation.id, parseInt(e.target.value))}
                        />
                    </div>
                </div>

                {/* Fiscais Calculados */}
                <div className="flex justify-between items-center bg-purple-50 p-1.5 rounded text-xs mt-1">
                    <span className="text-purple-700 font-bold flex items-center gap-1"><ShieldCheckIcon className="w-3.5 h-3.5" /> Fiscais:</span>
                    <span className="font-black text-purple-700">{fiscalsNeeded}</span>
                </div>

            </div>

            <div className="pt-2 border-t border-gray-100 mt-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full h-6 text-[10px] text-red-400 hover:text-red-600 hover:bg-red-50 font-medium"
                    onClick={() => onUpdateAllocation(room.id, null)}
                    disabled={savingId === room.id}
                >
                    <XCircleIcon className="w-3 h-3 mr-1" /> Liberar Sala
                </Button>
            </div>
        </div>
    );
}