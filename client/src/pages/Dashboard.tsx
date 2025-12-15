import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Event, RecurrenceType, ACADEMIC_PERIODS, DEFAULT_CATEGORIES, AppNotification, NotificationType } from "@/lib/types"; 
import { useCategories } from "@/hooks/useCategories";
import CategoryManager from "@/components/CategoryManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  PlusIcon, PencilIcon, TrashIcon, ArrowLeftOnRectangleIcon, 
  UsersIcon, MagnifyingGlassIcon, FunnelIcon, CalendarDaysIcon, 
  ClockIcon, CheckCircleIcon, MegaphoneIcon, DocumentDuplicateIcon 
} from "@heroicons/react/24/outline";
import { format, isSameMonth, parseISO, compareAsc } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { categories } = useCategories();
  const [, setLocation] = useLocation();
  
  // --- ESTADOS ---
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isMultiDay, setIsMultiDay] = useState(false);

  // --- NOTIFICAÇÕES ---
  const [activeNotifications, setActiveNotifications] = useState<AppNotification[]>([]);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifData, setNotifData] = useState({
      message: '',
      type: 'info' as NotificationType,
      targetPeriods: ['all']
  });

  // --- FORMULÁRIO ---
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
    time: '09:00',
    endTime: '',
    category: 'general',
    allDay: false,
    recurrence: { type: 'none', until: '' },
    targetPeriods: ['all'],
    description: '',
    local: '',
    course: '',
    link: ''
  });

  useEffect(() => {
    if (!user) {
      setLocation("/admin");
      return;
    }
    fetchEvents();
    fetchNotifications();
  }, [user]);

  const fetchEvents = async () => {
    try {
      const q = query(collection(db, "events"));
      const querySnapshot = await getDocs(q);
      // IMPORTANTE: id: doc.id DEVE vir por último para garantir identidade correta
      const fetchedEvents = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
        const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setActiveNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
    } catch (error) {
        console.error("Error fetching notifications:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  // --- FILTROS ROBUSTOS ---
  const filteredEvents = useMemo(() => {
    return events
      .filter(event => {
        if (!event) return false;
        const title = (event.title || '').toLowerCase();
        const local = (event.local || '').toLowerCase();
        const category = event.category || 'general';
        const targetPeriods = event.targetPeriods || ['all'];
        const searchLower = searchTerm.toLowerCase();
        
        const matchesSearch = title.includes(searchLower) || local.includes(searchLower);
        const matchesPeriod = filterPeriod === 'all' || targetPeriods.includes('all') || targetPeriods.includes(filterPeriod);
        const matchesCategory = filterCategory === 'all' || category === filterCategory;

        return matchesSearch && matchesPeriod && matchesCategory;
      })
      .sort((a, b) => {
        const dateA = a.date ? parseISO(a.date) : new Date(0);
        const dateB = b.date ? parseISO(b.date) : new Date(0);
        return compareAsc(dateA, dateB);
      });
  }, [events, searchTerm, filterPeriod, filterCategory]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: filteredEvents.length,
      thisMonth: filteredEvents.filter(e => e.date && isSameMonth(parseISO(e.date), now)).length,
      nextEvent: filteredEvents.find(e => e.date && parseISO(e.date) >= now)
    };
  }, [filteredEvents]);

  // --- AÇÕES DO FORMULÁRIO ---
  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const eventData = {
        ...formData,
        endDate: isMultiDay ? formData.endDate : null,
        time: formData.allDay ? '' : formData.time, 
        endTime: formData.allDay ? '' : formData.endTime,
        recurrence: formData.recurrence?.type === 'none' ? { type: 'none' } : formData.recurrence,
        targetPeriods: formData.targetPeriods || ['all'],
        updatedAt: Timestamp.now()
      };

      if (editingEvent) {
        await updateDoc(doc(db, "events", editingEvent.id), eventData);
      } else {
        await addDoc(collection(db, "events"), {
          ...eventData,
          createdAt: Timestamp.now()
        });
      }
      setIsModalOpen(false);
      setEditingEvent(null);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm("Tem certeza? Esta ação é irreversível.")) {
      try {
        await deleteDoc(doc(db, "events", id));
        fetchEvents();
      } catch (error) {
        console.error("Error deleting event:", error);
      }
    }
  };

  // --- AÇÕES DE NOTIFICAÇÃO ---
  const handleSaveNotification = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await addDoc(collection(db, "notifications"), {
              ...notifData,
              createdAt: Timestamp.now()
          });
          setIsNotifModalOpen(false);
          setNotifData({ message: '', type: 'info', targetPeriods: ['all'] });
          fetchNotifications();
      } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeleteNotification = async (id: string) => {
      if(confirm("Remover este aviso?")) {
          await deleteDoc(doc(db, "notifications", id));
          fetchNotifications();
      }
  };

  // --- HELPERS DE TOGGLE ---
  const toggleEventPeriod = (periodId: string) => {
    const current = formData.targetPeriods || [];
    if (periodId === 'all') {
        setFormData({ ...formData, targetPeriods: ['all'] });
        return;
    }
    let newPeriods = current.filter(p => p !== 'all');
    if (newPeriods.includes(periodId)) newPeriods = newPeriods.filter(p => p !== periodId);
    else newPeriods.push(periodId);
    if (newPeriods.length === 0) newPeriods = ['all'];
    setFormData({ ...formData, targetPeriods: newPeriods });
  };

  const toggleNotifPeriod = (periodId: string) => {
    const current = notifData.targetPeriods || [];
    if (periodId === 'all') {
        setNotifData({ ...notifData, targetPeriods: ['all'] });
        return;
    }
    let newPeriods = current.filter(p => p !== 'all');
    if (newPeriods.includes(periodId)) newPeriods = newPeriods.filter(p => p !== periodId);
    else newPeriods.push(periodId);
    if (newPeriods.length === 0) newPeriods = ['all'];
    setNotifData({ ...notifData, targetPeriods: newPeriods });
  };

  // --- MODAIS ---
  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormData({
        ...event,
        endTime: event.endTime || '',
        recurrence: event.recurrence || { type: 'none', until: '' },
        targetPeriods: event.targetPeriods || ['all'] // Garante array
    });
    setIsMultiDay(!!event.endDate);
    setIsModalOpen(true);
  };

  // --- FUNÇÃO DUPLICAR CORRIGIDA (Deep Copy) ---
  const openDuplicateModal = (event: Event) => {
    setEditingEvent(null); // Garante modo criação
    
    // Remove ID e dados do sistema
    const { id, createdAt, updatedAt, ...cleanEvent } = event;
    
    setFormData({
        ...cleanEvent,
        title: `${event.title} (Cópia)`,
        
        // CÓPIA SEGURA (Deep Copy) dos Arrays/Objetos
        // Isso impede que a cópia aponte para o mesmo lugar na memória que o original
        targetPeriods: event.targetPeriods ? [...event.targetPeriods] : ['all'],
        recurrence: event.recurrence ? { ...event.recurrence } : { type: 'none', until: '' },
        
        // Garante valores de fallback
        category: event.category || 'general',
        endTime: event.endTime || '',
    });
    
    setIsMultiDay(!!event.endDate);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      endDate: '',
      time: '09:00',
      endTime: '',
      category: 'general',
      allDay: false,
      recurrence: { type: 'none', until: '' },
      targetPeriods: ['all'],
      description: '',
      local: '',
      course: '',
      link: ''
    });
    setIsMultiDay(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 h-16 shadow-sm">
        <div className="container mx-auto h-full flex justify-between items-center max-w-6xl">
          <div className="flex items-center gap-3">
             <div className="bg-primary/10 p-2 rounded-lg"><UsersIcon className="w-5 h-5 text-primary" /></div>
             <div><h1 className="text-sm font-display font-bold text-gray-900 leading-tight">Painel Administrativo</h1><p className="text-[10px] text-gray-500 font-medium">Afya Itajubá</p></div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"><ArrowLeftOnRectangleIcon className="w-4 h-4" /> Sair</button>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 max-w-6xl">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><CalendarDaysIcon className="w-6 h-6" /></div><div><p className="text-xs font-bold text-gray-400 uppercase">Total de Eventos</p><p className="text-2xl font-display font-bold text-gray-900">{stats.total}</p></div></div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4"><div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircleIcon className="w-6 h-6" /></div><div><p className="text-xs font-bold text-gray-400 uppercase">Neste Mês</p><p className="text-2xl font-display font-bold text-gray-900">{stats.thisMonth}</p></div></div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4"><div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><ClockIcon className="w-6 h-6" /></div><div className="overflow-hidden"><p className="text-xs font-bold text-gray-400 uppercase">Próximo Evento</p><p className="text-sm font-bold text-gray-900 truncate">{stats.nextEvent ? stats.nextEvent.title : 'Nenhum futuro'}</p>{stats.nextEvent && (<p className="text-xs text-gray-500">{format(parseISO(stats.nextEvent.date), "dd 'de' MMM", { locale: ptBR })}</p>)}</div></div>
        </div>

        {/* Mural Avisos */}
        <div className="mb-8 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2"><div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><MegaphoneIcon className="w-5 h-5" /></div><div><h3 className="font-display font-bold text-gray-900">Mural de Avisos</h3><p className="text-xs text-gray-500">Notificações ativas no topo da Home.</p></div></div>
                <Button onClick={() => setIsNotifModalOpen(true)} variant="outline" className="text-xs h-8">Criar Aviso</Button>
            </div>
            {activeNotifications.length === 0 ? (<p className="text-xs text-gray-400 italic">Nenhum aviso ativo no momento.</p>) : (
                <div className="space-y-2">
                    {activeNotifications.map(notif => (
                        <div key={notif.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-3"><span className={`w-2 h-2 rounded-full ${notif.type === 'urgent' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} /><span className="text-sm font-medium text-gray-700">{notif.message}</span><span className="text-[10px] bg-white border px-1.5 py-0.5 rounded text-gray-400">{notif.targetPeriods.includes('all') ? 'Todos' : notif.targetPeriods.join(', ') + 'º'}</span></div>
                            <button onClick={() => handleDeleteNotification(notif.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <div className="mb-8"><CategoryManager /></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
            <div className="w-full md:w-auto flex flex-col gap-1"><h2 className="text-xl font-display font-bold text-gray-900">Agenda Acadêmica</h2><p className="text-sm text-gray-500">Gerencie todos os eventos.</p></div>
            <Button onClick={openCreateModal} className="neo-btn flex items-center gap-2 shadow-md hover:shadow-lg w-full md:w-auto"><PlusIcon className="w-5 h-5" /> Adicionar Evento</Button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-5 relative"><MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input placeholder="Buscar evento por título..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="neo-input pl-9" /></div>
            <div className="md:col-span-3"><Select value={filterPeriod} onValueChange={setFilterPeriod}><SelectTrigger className="neo-input bg-white"><SelectValue placeholder="Filtrar Período" /></SelectTrigger><SelectContent className="bg-white"><SelectItem value="all">Todos os Períodos</SelectItem>{ACADEMIC_PERIODS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-3"><Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="neo-input bg-white"><SelectValue placeholder="Filtrar Categoria" /></SelectTrigger><SelectContent className="bg-white"><SelectItem value="all">Todas as Categorias</SelectItem>{Object.values(categories).map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="md:col-span-1 flex justify-center"><div className="text-xs font-bold text-gray-400 flex flex-col items-center"><FunnelIcon className="w-4 h-4 mb-1" /><span>{filteredEvents.length}</span></div></div>
        </div>

        {/* Tabela */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider"><th className="p-4 w-32">Data</th><th className="p-4">Detalhes</th><th className="p-4 w-48">Público</th><th className="p-4 text-center w-32">Ações</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEvents.map((event) => {
                    const category = categories[event.category] || DEFAULT_CATEGORIES.general;
                    return (
                        <tr key={event.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="p-4 align-top">
                                <div className="flex flex-col"><span className="font-bold text-gray-900 text-sm">{format(parseISO(event.date), 'dd/MM/yyyy')}</span><span className="text-xs text-gray-400 font-medium capitalize">{format(parseISO(event.date), 'EEEE', { locale: ptBR })}</span>
                                {event.time && <span className="text-[10px] text-gray-500 mt-1 bg-gray-100 px-1.5 py-0.5 rounded w-fit">{event.time} {event.endTime ? `- ${event.endTime}` : ''}</span>}
                                </div>
                            </td>
                            <td className="p-4 align-top">
                                <div className="flex items-start justify-between"><div><p className="font-bold text-gray-900 text-base mb-1">{event.title}</p><span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${category.color.replace('bg-', 'text-').replace('text-white', 'border-current bg-transparent')}`}><span className={`w-1.5 h-1.5 rounded-full ${category.color}`}></span>{category.label}</span></div></div>
                                {event.local && (<p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><span className="font-semibold">Local:</span> {event.local}</p>)}
                            </td>
                            <td className="p-4 align-top">
                                {event.targetPeriods?.includes('all') ? (<span className="inline-block bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded">TODOS OS ALUNOS</span>) : (<div className="flex flex-wrap gap-1">{event.targetPeriods?.map(p => (<span key={p} className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-bold px-1.5 py-0.5 rounded">{p}º</span>))}</div>)}
                            </td>
                            <td className="p-4 align-top">
                                <div className="flex justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openDuplicateModal(event)} className="p-2 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors" title="Duplicar"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                                    <button onClick={() => openEditModal(event)} className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors" title="Editar"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteEvent(event.id)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors" title="Excluir"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL EVENTO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-0 border border-gray-100 shadow-xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto outline-none">
          <DialogHeader className="p-5 border-b border-gray-100 bg-gray-50"><DialogTitle className="font-display font-bold text-xl text-gray-900">{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitEvent} className="p-6 space-y-5">
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Título do Evento</Label><Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required className="neo-input" placeholder="Ex: Prova de Anatomia" /></div>
            <div className="p-4 border border-gray-200 bg-gray-50/50 rounded-xl space-y-3">
                <div className="flex items-center gap-2"><UsersIcon className="w-4 h-4 text-primary" /><Label className="text-xs font-bold uppercase text-primary">Público Alvo</Label></div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => toggleEventPeriod('all')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${formData.targetPeriods?.includes('all') ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>TODOS</button>
                    {ACADEMIC_PERIODS.map((period) => (<button key={period.id} type="button" onClick={() => toggleEventPeriod(period.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${formData.targetPeriods?.includes(period.id) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/50'}`}>{period.label}</button>))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Data de Início</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required className="neo-input" /></div>
              <div className="space-y-1.5"><div className="flex justify-between items-center mb-1"><Label className="text-xs font-bold uppercase text-gray-500">Data de Término</Label><div className="flex items-center gap-2"><Checkbox id="multiDay" checked={isMultiDay} onCheckedChange={(c) => setIsMultiDay(c as boolean)} className="data-[state=checked]:bg-primary" /><label htmlFor="multiDay" className="text-xs font-medium cursor-pointer text-gray-600">Vários dias?</label></div></div><Input type="date" value={formData.endDate || ''} onChange={(e) => setFormData({...formData, endDate: e.target.value})} disabled={!isMultiDay} className="neo-input disabled:bg-gray-100" /></div>
            </div>
            <div className="p-4 border border-dashed border-gray-300 rounded-xl space-y-3">
                <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Repetição</Label><Select value={formData.recurrence?.type || 'none'} onValueChange={(val: RecurrenceType) => setFormData({...formData, recurrence: { ...formData.recurrence, type: val }})}><SelectTrigger className="neo-input bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não repetir</SelectItem><SelectItem value="daily">Diariamente</SelectItem><SelectItem value="weekly">Semanalmente</SelectItem><SelectItem value="biweekly">Quinzenalmente</SelectItem><SelectItem value="monthly">Mensalmente</SelectItem></SelectContent></Select></div>
                {formData.recurrence?.type !== 'none' && (<div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Repetir até:</Label><Input type="date" value={formData.recurrence?.until || ''} onChange={(e) => setFormData({...formData, recurrence: { ...formData.recurrence, type: formData.recurrence!.type, until: e.target.value }})} className="neo-input" /></div>)}
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Horário</Label><div className="flex gap-2 items-center"><Input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} disabled={formData.allDay} className="neo-input flex-grow" /><span className="text-gray-400 text-xs">até</span><Input type="time" value={formData.endTime || ''} onChange={(e) => setFormData({...formData, endTime: e.target.value})} disabled={formData.allDay} className="neo-input flex-grow" /></div><div className="flex items-center gap-2 mt-2"><Checkbox id="allDay" checked={formData.allDay} onCheckedChange={(c) => setFormData({...formData, allDay: c as boolean})} className="data-[state=checked]:bg-primary" /><label htmlFor="allDay" className="text-xs font-bold text-gray-600 cursor-pointer">Evento de dia inteiro</label></div></div>
                 <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Categoria</Label><Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}><SelectTrigger className="neo-input"><SelectValue /></SelectTrigger><SelectContent>{Object.values(categories).map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Local</Label><Input value={formData.local} onChange={(e) => setFormData({...formData, local: e.target.value})} className="neo-input" placeholder="Sala, Auditório ou Link" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Descrição</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="neo-input min-h-[100px] resize-none" placeholder="Detalhes do evento..." /></div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-6">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="hover:bg-gray-200 text-gray-600">Cancelar</Button>
              <Button type="submit" disabled={loading} className="neo-btn px-8 shadow-lg shadow-primary/20">{loading ? 'Salvando...' : 'Salvar Evento'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL NOTIFICAÇÃO (MANTIDO) */}
      <Dialog open={isNotifModalOpen} onOpenChange={setIsNotifModalOpen}>
        <DialogContent className="max-w-md bg-white">
            <DialogHeader><DialogTitle>Novo Aviso</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveNotification} className="space-y-4 pt-4">
                <div className="space-y-1.5"><Label>Mensagem</Label><Textarea value={notifData.message} onChange={e => setNotifData({...notifData, message: e.target.value})} placeholder="Ex: Aula de Anatomia cancelada..." className="neo-input" required /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Tipo</Label><Select value={notifData.type} onValueChange={(v: NotificationType) => setNotifData({...notifData, type: v})}><SelectTrigger className="neo-input"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">Informação (Azul)</SelectItem><SelectItem value="warning">Atenção (Amarelo)</SelectItem><SelectItem value="urgent">Urgente (Vermelho)</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-1.5"><Label>Quem deve ver?</Label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => toggleNotifPeriod('all')} className={`px-2 py-1 text-xs border rounded ${notifData.targetPeriods.includes('all') ? 'bg-gray-900 text-white' : ''}`}>Todos</button>{ACADEMIC_PERIODS.map(p => (<button key={p.id} type="button" onClick={() => toggleNotifPeriod(p.id)} className={`px-2 py-1 text-xs border rounded ${notifData.targetPeriods.includes(p.id) ? 'bg-primary text-white' : ''}`}>{p.id}º</button>))}</div></div>
                <Button type="submit" disabled={loading} className="w-full neo-btn mt-4 flex items-center justify-center gap-2">{loading ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Publicando...</>) : ('Publicar Aviso')}</Button>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}