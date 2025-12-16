import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Employee, Room, EmployeeRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SharePortalModal from "@/components/SharePortalModal";
import { 
  UsersIcon, BuildingOfficeIcon, TrashIcon, PencilIcon, 
  PlusIcon, ArrowLeftIcon, StarIcon, LinkIcon 
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import ShareRegistrationModal from "@/components/ShareRegistrationModal";

export default function Registries() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'employees' | 'rooms'>('employees');
  const [loading, setLoading] = useState(true);

  // Estados de Dados
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  // Estados de Modal
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Forms
  const [empForm, setEmpForm] = useState<Partial<Employee>>({
    name: '', email: '', phone: '', role: 'Fiscal', experienceLevel: 3, isActive: true
  });
  const [roomForm, setRoomForm] = useState<Partial<Room>>({
    name: '', block: '', capacity: 40, features: [], isActive: true
  });

  useEffect(() => {
    if (!user) { setLocation("/"); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const empQ = query(collection(db, "employees"), orderBy("name"));
      const roomQ = query(collection(db, "rooms"), orderBy("name"));
      
      const [empSnap, roomSnap] = await Promise.all([getDocs(empQ), getDocs(roomQ)]);
      
      setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
      setRooms(roomSnap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS FUNCIONÁRIOS ---
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmp) {
        await updateDoc(doc(db, "employees", editingEmp.id), empForm);
        toast.success("Funcionário atualizado!");
      } else {
        await addDoc(collection(db, "employees"), { ...empForm, createdAt: Timestamp.now() });
        toast.success("Funcionário cadastrado!");
      }
      setIsEmpModalOpen(false);
      setEditingEmp(null);
      resetEmpForm();
      fetchData();
    } catch (err) { 
        console.error(err);
        toast.error("Erro ao salvar funcionário.");
    }
  };

  const deleteEmployee = async (id: string) => {
    if (confirm("Remover este funcionário?")) {
      try {
          await deleteDoc(doc(db, "employees", id));
          toast.success("Funcionário removido.");
          fetchData();
      } catch (err) {
          toast.error("Erro ao remover.");
      }
    }
  };

  const openEditEmp = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpForm(emp);
    setIsEmpModalOpen(true);
  };

  const copyLink = (empId: string) => {
    const url = `${window.location.origin}/availability?uid=${empId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado! Envie para o funcionário.");
  };

  const resetEmpForm = () => {
    setEmpForm({ name: '', email: '', phone: '', role: 'Fiscal', experienceLevel: 3, isActive: true });
  };

  // --- HANDLERS SALAS ---
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        await updateDoc(doc(db, "rooms", editingRoom.id), roomForm);
        toast.success("Sala atualizada!");
      } else {
        await addDoc(collection(db, "rooms"), { ...roomForm, createdAt: Timestamp.now() });
        toast.success("Sala cadastrada!");
      }
      setIsRoomModalOpen(false);
      setEditingRoom(null);
      resetRoomForm();
      fetchData();
    } catch (err) { 
        console.error(err); 
        toast.error("Erro ao salvar sala.");
    }
  };

  const deleteRoom = async (id: string) => {
    if (confirm("Remover esta sala?")) {
      try {
          await deleteDoc(doc(db, "rooms", id));
          toast.success("Sala removida.");
          fetchData();
      } catch (err) {
          toast.error("Erro ao remover.");
      }
    }
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm(room);
    setIsRoomModalOpen(true);
  };

  const resetRoomForm = () => {
    setRoomForm({ name: '', block: '', capacity: 40, features: [], isActive: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      
      {/* HEADER FIXO E ALINHADO */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 max-w-5xl h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                {/* Correção do Link: vai para /admin/dashboard ao invés de /admin */}
                <button onClick={() => setLocation("/admin/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                
                <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
                
                {/* LOGO E TÍTULO */}
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Afya" className="h-8 w-auto object-contain" />
                    <h1 className="text-sm font-display font-bold text-gray-900">Cadastros Base</h1>
                </div>
            </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 max-w-5xl">
        
        {/* Navegação de Abas */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
            <button 
                onClick={() => setActiveTab('employees')}
                className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'employees' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                <UsersIcon className="w-5 h-5" /> Equipe
            </button>
            <button 
                onClick={() => setActiveTab('rooms')}
                className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'rooms' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
                <BuildingOfficeIcon className="w-5 h-5" /> Salas
            </button>
        </div>

        {/* --- CONTEÚDO FUNCIONÁRIOS --- */}
        {activeTab === 'employees' && (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-gray-700">Funcionários Cadastrados ({employees.length})</h2>
                    
                    {/* Agrupamos os botões aqui */}
                    <div className="flex items-center gap-2">
                        {/* BOTÃO NOVO: Link de Cadastro */}
                        <ShareRegistrationModal />

                        {/* BOTÃO ANTIGO: Cadastro Manual */}
                        <Button onClick={() => { setEditingEmp(null); resetEmpForm(); setIsEmpModalOpen(true); }} className="neo-btn flex items-center gap-2 text-xs">
                            <PlusIcon className="w-4 h-4" /> Novo Manual
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map(emp => (
                        <div key={emp.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${emp.role === 'Coordenação' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-600'}`}>{emp.role}</span>
                                    <div className="flex text-yellow-400">
                                        {[...Array(emp.experienceLevel)].map((_, i) => <StarIcon key={i} className="w-3 h-3 fill-current" />)}
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-900">{emp.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">{emp.email}</p>
                                <p className="text-xs text-gray-500">{emp.phone}</p>
                            </div>
                            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-50">
                                <button 
                                    onClick={() => copyLink(emp.id)} 
                                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded" 
                                    title="Copiar Link de Disponibilidade"
                                >
                                    <LinkIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => openEditEmp(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Editar"><PencilIcon className="w-4 h-4" /></button>
                                <button onClick={() => deleteEmployee(emp.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remover"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- CONTEÚDO SALAS --- */}
        {activeTab === 'rooms' && (
          <div>
              <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-700">Salas Disponíveis ({rooms.length})</h2>
                  
                  {/* Agrupamos os botões aqui */}
                  <div className="flex items-center gap-2">
                      {/* NOVO BOTÃO: Portal Reprografia */}
                      <SharePortalModal />

                      {/* BOTÃO ANTIGO: Nova Sala */}
                      <Button onClick={() => { setEditingRoom(null); resetRoomForm(); setIsRoomModalOpen(true); }} className="neo-btn flex items-center gap-2 text-xs">
                          <PlusIcon className="w-4 h-4" /> Nova Sala
                      </Button>
                  </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map(room => (
                        <div key={room.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-gray-900">{room.name}</h3>
                                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">{room.block}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <UsersIcon className="w-4 h-4" /> <span>Capacidade: {room.capacity}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-4">
                                {room.features.map((feat, i) => (
                                    <span key={i} className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100">{feat}</span>
                                ))}
                            </div>
                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-50">
                                <button onClick={() => openEditRoom(room)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><PencilIcon className="w-4 h-4" /></button>
                                <button onClick={() => deleteRoom(room.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>

      {/* MODAL FUNCIONÁRIO */}
      <Dialog open={isEmpModalOpen} onOpenChange={setIsEmpModalOpen}>
        <DialogContent className="bg-white">
            <DialogHeader><DialogTitle>{editingEmp ? 'Editar' : 'Novo'} Funcionário</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveEmployee} className="space-y-4 pt-2">
                <div><Label>Nome Completo</Label><Input value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} required className="neo-input" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Email</Label><Input value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} required className="neo-input" /></div>
                    <div><Label>Telefone</Label><Input value={empForm.phone} onChange={e => setEmpForm({...empForm, phone: e.target.value})} className="neo-input" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Função</Label><Select value={empForm.role} onValueChange={(v: any) => setEmpForm({...empForm, role: v})}><SelectTrigger className="neo-input"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Fiscal">Fiscal</SelectItem><SelectItem value="Aplicador">Aplicador</SelectItem><SelectItem value="Apoio">Apoio</SelectItem><SelectItem value="Coordenação">Coordenação</SelectItem></SelectContent></Select></div>
                    <div><Label>Nível (1-5)</Label><Input type="number" min="1" max="5" value={empForm.experienceLevel} onChange={e => setEmpForm({...empForm, experienceLevel: parseInt(e.target.value) as any})} className="neo-input" /></div>
                </div>
                <Button type="submit" className="w-full neo-btn mt-4">Salvar</Button>
            </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SALA */}
      <Dialog open={isRoomModalOpen} onOpenChange={setIsRoomModalOpen}>
        <DialogContent className="bg-white">
            <DialogHeader><DialogTitle>{editingRoom ? 'Editar' : 'Nova'} Sala</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveRoom} className="space-y-4 pt-2">
                <div><Label>Nome da Sala</Label><Input value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})} placeholder="Ex: Sala 101" required className="neo-input" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><Label>Bloco</Label><Input value={roomForm.block} onChange={e => setRoomForm({...roomForm, block: e.target.value})} placeholder="Ex: Bloco C" className="neo-input" /></div>
                    <div><Label>Capacidade</Label><Input type="number" value={roomForm.capacity} onChange={e => setRoomForm({...roomForm, capacity: parseInt(e.target.value)})} className="neo-input" /></div>
                </div>
                <div>
                    <Label>Recursos (separar por vírgula)</Label>
                    <Input 
                        placeholder="Ex: Projetor, Ar Condicionado" 
                        value={roomForm.features?.join(', ')} 
                        onChange={e => setRoomForm({...roomForm, features: e.target.value.split(',').map(s => s.trim())})} 
                        className="neo-input" 
                    />
                </div>
                <Button type="submit" className="w-full neo-btn mt-4">Salvar</Button>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}