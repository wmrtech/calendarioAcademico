import { useState, useEffect, useMemo } from "react";
import { collection, query, where, setDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam, Employee, Room, Allocation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    UserPlusIcon, TrashIcon, MapPinIcon, FunnelIcon,
    MagnifyingGlassIcon, SunIcon, MoonIcon, BriefcaseIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface Props {
    exam: Exam;
    employees: Employee[];
    rooms: Room[];
}

export default function AllocationBoard({ exam, employees, rooms }: Props) {
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAvailable, setFilterAvailable] = useState(false); // Novo filtro

    // Identifica o turno da prova baseado na hora de início
    const examShift = useMemo(() => {
        const hour = parseInt(exam.startTime.split(':')[0]);
        if (hour < 12) return "Manhã";
        if (hour < 18) return "Tarde";
        return "Noite";
    }, [exam.startTime]);

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

    // --- FUNÇÕES DE BANCO ---
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
                period: period,
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

    // Helper para verificar compatibilidade
    const checkAvailability = (emp: Employee) => {
        // Se não tiver disponibilidade cadastrada, assume que pode (para legados)
        if (!emp.availability || emp.availability.length === 0) return 'unknown';
        return emp.availability.includes(examShift) ? 'available' : 'unavailable';
    };

    return (
        <div className="space-y-6">

            {/* HEADER DO PAINEL */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <BriefcaseIcon className="w-5 h-5 text-[#d31c5b]" />
                        Central de Alocação
                    </h3>
                    <p className="text-xs text-gray-500">
                        Turno da Prova: <span className="font-bold text-gray-700">{examShift}</span> ({exam.startTime})
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                        {allocatedEmployeeIds.size} / {employees.length} Alocados
                    </span>
                </div>
            </div>

            {rooms.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <MapPinIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm font-medium">Nenhuma sala cadastrada.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {rooms.map(room => {
                        const allocation = allocations.find(a => a.roomId === room.id);
                        const peopleInRoom = allocation?.employeeIds.map(id => employees.find(e => e.id === id)).filter(Boolean) as Employee[] || [];
                        const currentPeriod = allocation?.period;
                        const isCorridor = room.name.toLowerCase().includes('corredor') || room.name.toLowerCase().includes('apoio');

                        return (
                            <div key={room.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col ${isCorridor ? 'border-blue-200' : 'border-gray-200'}`}>
                                {/* HEADER DA SALA */}
                                <div className={`px-4 py-3 border-b flex justify-between items-center ${isCorridor ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div>
                                        <div className="flex items-center gap-1 font-bold text-gray-800 text-sm">
                                            <MapPinIcon className={`w-4 h-4 ${isCorridor ? 'text-blue-500' : 'text-[#d31c5b]'}`} />
                                            {room.name}
                                        </div>
                                        <span className="text-[10px] text-gray-500 uppercase font-bold">{room.block} • Cap: {room.capacity}</span>
                                    </div>
                                    <Button
                                        variant="ghost" size="sm"
                                        onClick={() => { setSelectedRoom(room); setIsModalOpen(true); setSearchTerm(""); }}
                                        className={`h-7 w-7 p-0 rounded-full ${isCorridor ? 'hover:bg-blue-200 text-blue-600' : 'hover:bg-pink-100 text-pink-600'}`}
                                    >
                                        <UserPlusIcon className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* SELETOR DE PERÍODO (Só mostra para salas de aula, não corredores) */}
                                {!isCorridor && (
                                    <div className="px-2 pt-2">
                                        <Select
                                            value={currentPeriod || ""}
                                            onValueChange={(val) => handleSetPeriod(room.id, val)}
                                        >
                                            <SelectTrigger className="h-7 text-xs bg-white border-gray-200 focus:ring-0">
                                                <SelectValue placeholder="Selecione o Período" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {exam.targetPeriods.includes('all')
                                                    ? Array.from({ length: 12 }, (_, i) => (<SelectItem key={i} value={`${i + 1}`}>{i + 1}º Período</SelectItem>))
                                                    : exam.targetPeriods.map(p => (<SelectItem key={p} value={p}>{p}º Período</SelectItem>))
                                                }
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* LISTA DE FISCAIS */}
                                <div className="p-2 flex-1 min-h-[60px] space-y-1">
                                    {peopleInRoom.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-xs text-gray-400 italic py-2">
                                            Vazio
                                        </div>
                                    ) : (
                                        peopleInRoom.map(emp => {
                                            const compat = checkAvailability(emp);
                                            return (
                                                <div key={emp.id} className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-lg shadow-sm group">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {/* Bolinha de Status de Disponibilidade */}
                                                        <div
                                                            className={`w-2 h-2 rounded-full shrink-0 ${compat === 'available' ? 'bg-green-500' : compat === 'unavailable' ? 'bg-red-500' : 'bg-gray-300'}`}
                                                            title={compat === 'unavailable' ? 'Atenção: Não listou disponibilidade para este turno' : ''}
                                                        />
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-700 truncate leading-none">{emp.name}</p>
                                                            <p className="text-[9px] text-gray-400">{emp.role}</p>
                                                        </div>
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

            {/* MODAL DE ALOCAÇÃO */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-md bg-white max-h-[80vh] flex flex-col">
                    <DialogHeader className="border-b pb-2">
                        <DialogTitle>Adicionar em: {selectedRoom?.name}</DialogTitle>
                        <p className="text-xs text-gray-500">Selecione um funcionário para alocar.</p>
                    </DialogHeader>

                    <div className="space-y-3 mt-4 flex-1 overflow-hidden flex flex-col">
                        {/* Filtros */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input
                                    placeholder="Buscar nome..."
                                    className="pl-9 h-9 text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button
                                variant={filterAvailable ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilterAvailable(!filterAvailable)}
                                className={`h-9 gap-2 ${filterAvailable ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                title="Filtrar por Disponibilidade"
                            >
                                <FunnelIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Disponíveis ({examShift})</span>
                            </Button>
                        </div>

                        {/* Lista de Funcionários */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                            {employees
                                .filter(emp => !allocatedEmployeeIds.has(emp.id)) // Tira quem já está alocado
                                .filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                .filter(emp => !filterAvailable || (emp.availability && emp.availability.includes(examShift))) // Filtro de turno
                                .sort((a, b) => {
                                    // Ordena: Disponíveis primeiro, depois por nome
                                    const compatA = checkAvailability(a) === 'available' ? 1 : 0;
                                    const compatB = checkAvailability(b) === 'available' ? 1 : 0;
                                    if (compatA !== compatB) return compatB - compatA;
                                    return a.name.localeCompare(b.name);
                                })
                                .map(emp => {
                                    const compat = checkAvailability(emp);
                                    return (
                                        <button
                                            key={emp.id}
                                            onClick={() => handleAddEmployee(emp.id)}
                                            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-[#d31c5b]/30 transition-all text-left group"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-gray-800">{emp.name}</p>
                                                    {/* Badges de Disponibilidade */}
                                                    <div className="flex gap-0.5">
                                                        {emp.availability?.includes("Manhã") && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" title="Manhã"></span>}
                                                        {emp.availability?.includes("Tarde") && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Tarde"></span>}
                                                        {emp.availability?.includes("Noite") && <span className="w-1.5 h-1.5 rounded-full bg-indigo-900" title="Noite"></span>}
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">{emp.role}</p>
                                                {emp.notes && <p className="text-[10px] text-blue-500 italic truncate max-w-[200px]">Nota: {emp.notes}</p>}
                                            </div>

                                            {/* Ícone de Status */}
                                            {compat === 'available' && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Disponível</span>}
                                            {compat === 'unavailable' && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1"><ExclamationTriangleIcon className="w-3 h-3" /> Indisponível</span>}
                                        </button>
                                    );
                                })}

                            {employees.filter(e => !allocatedEmployeeIds.has(e.id)).length === 0 && (
                                <p className="text-center text-sm text-gray-400 py-4">Todos os funcionários já foram alocados.</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}