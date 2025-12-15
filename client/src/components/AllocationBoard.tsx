import { useState, useEffect, useMemo } from "react";
import { collection, query, where, setDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Employee, Room, Availability, Allocation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserPlusIcon, TrashIcon, MapPinIcon, CheckCircleIcon, 
  XCircleIcon, QuestionMarkCircleIcon, BuildingOfficeIcon 
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface Props {
  exam: Exam;
  employees: Employee[];
  rooms: Room[];
  availabilities: Availability[];
}

export default function AllocationBoard({ exam, employees, rooms, availabilities }: Props) {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const q = query(collection(db, "allocations"), where("examId", "==", exam.id));
    const unsubscribe = onSnapshot(q, (snap) => {
      setAllocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Allocation)));
    });
    return () => unsubscribe();
  }, [exam.id]);

  const allocatedEmployeeIds = useMemo(() => {
    const ids = new Set<string>();
    allocations.forEach(a => a.employeeIds.forEach(id => ids.add(id)));
    return ids;
  }, [allocations]);

  // --- DEFINIR PERÍODO DA SALA ---
  const handleSetPeriod = async (roomId: string, period: string) => {
    const currentAllocation = allocations.find(a => a.roomId === roomId);
    const docId = currentAllocation ? currentAllocation.id : `${exam.id}_${roomId}`;
    const employeeIds = currentAllocation ? currentAllocation.employeeIds : [];

    try {
        await setDoc(doc(db, "allocations", docId), {
            id: docId,
            examId: exam.id,
            roomId: roomId,
            employeeIds: employeeIds,
            period: period, // Salva o período
            updatedAt: new Date()
        }, { merge: true });
        toast.success(`Sala definida para o ${period}º Período`);
    } catch (err) {
        toast.error("Erro ao definir período.");
    }
  };

  const handleAddEmployee = async (employeeId: string) => {
    if (!selectedRoom) return;
    const currentAllocation = allocations.find(a => a.roomId === selectedRoom.id);
    const docId = currentAllocation ? currentAllocation.id : `${exam.id}_${selectedRoom.id}`;
    const newEmployeeList = currentAllocation ? [...currentAllocation.employeeIds, employeeId] : [employeeId];

    try {
      await setDoc(doc(db, "allocations", docId), {
        id: docId,
        examId: exam.id,
        roomId: selectedRoom.id,
        employeeIds: newEmployeeList,
        // Mantém o período se já existir
        period: currentAllocation?.period || null,
        updatedAt: new Date()
      }, { merge: true });
      toast.success("Funcionário alocado!");
    } catch (err) {
      toast.error("Erro ao alocar.");
    }
  };

  const handleRemoveEmployee = async (roomId: string, employeeId: string) => {
    const currentAllocation = allocations.find(a => a.roomId === roomId);
    if (!currentAllocation) return;
    const newList = currentAllocation.employeeIds.filter(id => id !== employeeId);

    try {
      // Se não tiver mais ninguém E não tiver período definido, deleta. 
      // Se tiver período, mantém o doc só com o período.
      if (newList.length === 0 && !currentAllocation.period) {
        await deleteDoc(doc(db, "allocations", currentAllocation.id));
      } else {
        await setDoc(doc(db, "allocations", currentAllocation.id), {
          ...currentAllocation,
          employeeIds: newList,
          updatedAt: new Date()
        });
      }
      toast.success("Removido da sala.");
    } catch (err) {
      toast.error("Erro ao remover.");
    }
  };

  const getAvailabilityStatus = (empId: string) => {
    const av = availabilities.find(a => a.employeeId === empId);
    if (!av) return 'pending';
    return av.isAvailable ? 'available' : 'unavailable';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800">Distribuição de Salas</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {allocatedEmployeeIds.size} / {employees.length} Fiscais Alocados
        </span>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <BuildingOfficeIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm font-medium">Nenhuma sala cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => {
                const allocation = allocations.find(a => a.roomId === room.id);
                const peopleInRoom = allocation?.employeeIds.map(id => employees.find(e => e.id === id)).filter(Boolean) as Employee[] || [];
                const currentPeriod = allocation?.period;

                return (
                    <div key={room.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                        {/* HEADER DA SALA */}
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <div className="flex items-center gap-1 font-bold text-gray-800 text-sm">
                                        <MapPinIcon className="w-4 h-4 text-gray-500" /> {room.name}
                                    </div>
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">{room.block} • Cap: {room.capacity}</span>
                                </div>
                                <Button 
                                    variant="ghost" size="sm" 
                                    onClick={() => { setSelectedRoom(room); setIsModalOpen(true); setSearchTerm(""); }}
                                    className="h-7 w-7 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                                >
                                    <UserPlusIcon className="w-4 h-4" />
                                </Button>
                            </div>
                            
                            {/* SELETOR DE PERÍODO (NOVIDADE) */}
                            <Select 
                                value={currentPeriod || ""} 
                                onValueChange={(val) => handleSetPeriod(room.id, val)}
                            >
                                <SelectTrigger className="h-7 text-xs bg-white border-gray-200">
                                    <SelectValue placeholder="Selecione o Período da Sala" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Lista os períodos configurados na prova OU uma lista genérica se for 'all' */}
                                    {exam.targetPeriods.includes('all') 
                                      ? Array.from({length: 12}, (_, i) => (
                                          <SelectItem key={i} value={`${i+1}`}>{i+1}º Período</SelectItem>
                                        ))
                                      : exam.targetPeriods.map(p => (
                                          <SelectItem key={p} value={p}>{p}º Período</SelectItem>
                                      ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        {/* LISTA DE FISCAIS */}
                        <div className="p-2 flex-1 min-h-[80px] space-y-1">
                            {peopleInRoom.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-gray-400 italic py-4">
                                    Sem fiscais
                                </div>
                            ) : (
                                peopleInRoom.map(emp => {
                                    const status = getAvailabilityStatus(emp.id);
                                    return (
                                        <div key={emp.id} className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-lg shadow-sm group">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {status === 'available' && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                                                {status === 'unavailable' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                                                {status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />}
                                                <p className="text-xs font-bold text-gray-700 truncate">{emp.name}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveEmployee(room.id, emp.id)}
                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <TrashIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {/* MODAL MANTIDO IGUAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Adicionar em: {selectedRoom?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-2">
                <Input 
                    placeholder="Buscar funcionário..." 
                    className="neo-input mb-4" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {employees
                    .filter(emp => !allocatedEmployeeIds.has(emp.id))
                    .filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .sort((a, b) => {
                        const statusOrder = { 'available': 0, 'pending': 1, 'unavailable': 2 };
                        return statusOrder[getAvailabilityStatus(a.id)] - statusOrder[getAvailabilityStatus(b.id)];
                    })
                    .map(emp => {
                        const status = getAvailabilityStatus(emp.id);
                        return (
                            <button 
                                key={emp.id} 
                                onClick={() => handleAddEmployee(emp.id)}
                                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-primary/30 transition-all text-left group"
                            >
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{emp.name}</p>
                                    <p className="text-xs text-gray-500">{emp.role}</p>
                                </div>
                                {status === 'available' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                                {status === 'unavailable' && <XCircleIcon className="w-4 h-4 text-red-500" />}
                                {status === 'pending' && <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400" />}
                            </button>
                        );
                    })}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}