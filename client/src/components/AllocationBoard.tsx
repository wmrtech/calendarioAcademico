import { useState, useEffect, useMemo } from "react";
import { collection, query, where, setDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Employee, Room, Availability, Allocation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        updatedAt: new Date()
      });
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
      if (newList.length === 0) {
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
            {allocatedEmployeeIds.size} / {employees.length} Alocados
        </span>
      </div>

      {/* --- CORREÇÃO: ESTADO VAZIO --- */}
      {rooms.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <BuildingOfficeIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm font-medium">Nenhuma sala cadastrada.</p>
            <p className="text-gray-400 text-xs">Vá em Cadastros e adicione salas para começar a alocar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => {
                const allocation = allocations.find(a => a.roomId === room.id);
                const peopleInRoom = allocation?.employeeIds.map(id => employees.find(e => e.id === id)).filter(Boolean) as Employee[] || [];

                return (
                    <div key={room.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-1 font-bold text-gray-800 text-sm">
                                    <MapPinIcon className="w-4 h-4 text-gray-500" /> {room.name}
                                </div>
                                <span className="text-[10px] text-gray-500 uppercase font-bold">{room.block} • Cap: {room.capacity}</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setSelectedRoom(room); setIsModalOpen(true); setSearchTerm(""); }}
                                className="h-7 w-7 p-0 rounded-full hover:bg-blue-100 hover:text-blue-600"
                            >
                                <UserPlusIcon className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="p-2 flex-1 min-h-[100px] space-y-1">
                            {peopleInRoom.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                                    Sala vazia
                                </div>
                            ) : (
                                peopleInRoom.map(emp => {
                                    const status = getAvailabilityStatus(emp.id);
                                    return (
                                        <div key={emp.id} className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-lg shadow-sm group">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {status === 'available' && <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Disponível" />}
                                                {status === 'unavailable' && <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Indisponível (Alerta!)" />}
                                                {status === 'pending' && <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" title="Pendente" />}
                                                
                                                <div className="truncate">
                                                    <p className="text-xs font-bold text-gray-700 truncate">{emp.name}</p>
                                                    <p className="text-[9px] text-gray-400 uppercase">{emp.role}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveEmployee(room.id, emp.id)}
                                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
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

      {/* MODAL (MANTIDO IGUAL) */}
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
                                    <p className="text-xs text-gray-500">{emp.role} • Nível {emp.experienceLevel}</p>
                                </div>
                                
                                {status === 'available' && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" /> Disp.</span>}
                                {status === 'unavailable' && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1"><XCircleIcon className="w-3 h-3" /> Não</span>}
                                {status === 'pending' && <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded flex items-center gap-1"><QuestionMarkCircleIcon className="w-3 h-3" /> ?</span>}
                            </button>
                        );
                    })}
                
                {employees.filter(emp => !allocatedEmployeeIds.has(emp.id) && emp.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <p className="text-center text-gray-400 py-4 text-sm">Nenhum funcionário disponível para adicionar.</p>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}