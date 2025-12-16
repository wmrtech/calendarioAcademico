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
import ShareEnsalamentoModal from "@/components/ShareEnsalamentoModal";
import { 
  PlusIcon, PencilIcon, TrashIcon, ArrowLeftOnRectangleIcon, 
  UsersIcon, MagnifyingGlassIcon, FunnelIcon, CalendarDaysIcon, 
  ClockIcon, CheckCircleIcon, MegaphoneIcon, DocumentDuplicateIcon,
  Cog6ToothIcon, ClipboardDocumentCheckIcon, MapPinIcon, PresentationChartLineIcon,
  EyeIcon, EyeSlashIcon, ChevronDownIcon, ChevronUpIcon, DocumentTextIcon
} from "@heroicons/react/24/outline";
import { format, isSameMonth, parseISO, compareAsc, isFuture, isToday } from "date-fns";
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

  // Controle de exibição da lista (Recolhida/Expandida)
  const [forceShowList, setForceShowList] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

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

  // --- LÓGICA DE FILTROS ---
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
    const nextEvent = filteredEvents.find(e => e.date && (isFuture(parseISO(e.date)) || isToday(parseISO(e.date))));
    return {
      total: filteredEvents.length,
      thisMonth: filteredEvents.filter(e => e.date && isSameMonth(parseISO(e.date), now)).length,
      nextEvent: nextEvent
    };
  }, [filteredEvents]);

  // Verifica se há filtros ativos para exibir a lista automaticamente
  const hasActiveFilters = useMemo(() => {
    return searchTerm !== '' || filterPeriod !== 'all' || filterCategory !== 'all';
  }, [searchTerm, filterPeriod, filterCategory]);

  // Decide se mostra a lista (Se tiver filtro OU se o usuário forçou a exibição)
  const shouldShowList = hasActiveFilters || forceShowList;

  // --- CRUD (Mantido igual) ---
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
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm("Tem certeza?")) {
      await deleteDoc(doc(db, "events", id));
      fetchEvents();
    }
  };

  const handleSaveNotification = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          await addDoc(collection(db, "notifications"), { ...notifData, createdAt: Timestamp.now() });
          setIsNotifModalOpen(false);
          setNotifData({ message: '', type: 'info', targetPeriods: ['all'] });
          fetchNotifications();
      } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeleteNotification = async (id: string) => {
      if(confirm("Remover?")) { await deleteDoc(doc(db, "notifications", id)); fetchNotifications(); }
  };

  // Helpers de Form
  const toggleEventPeriod = (id: string) => { /* Lógica mantida... */ 
      const current = formData.targetPeriods || [];
      if (id === 'all') { setFormData({ ...formData, targetPeriods: ['all'] }); return; }
      let newPeriods = current.filter(p => p !== 'all');
      if (newPeriods.includes(id)) newPeriods = newPeriods.filter(p => p !== id); else newPeriods.push(id);
      if (newPeriods.length === 0) newPeriods = ['all'];
      setFormData({ ...formData, targetPeriods: newPeriods });
  };
  const toggleNotifPeriod = (id: string) => { /* Lógica mantida... */
      const current = notifData.targetPeriods || [];
      if (id === 'all') { setNotifData({ ...notifData, targetPeriods: ['all'] }); return; }
      let newPeriods = current.filter(p => p !== 'all');
      if (newPeriods.includes(id)) newPeriods = newPeriods.filter(p => p !== id); else newPeriods.push(id);
      if (newPeriods.length === 0) newPeriods = ['all'];
      setNotifData({ ...notifData, targetPeriods: newPeriods });
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormData({ ...event, endTime: event.endTime || '', recurrence: event.recurrence || { type: 'none', until: '' }, targetPeriods: event.targetPeriods || ['all'] });
    setIsMultiDay(!!event.endDate);
    setIsModalOpen(true);
  };
  const openDuplicateModal = (event: Event) => {
    setEditingEvent(null);
    const { id, createdAt, updatedAt, ...cleanEvent } = event;
    setFormData({ ...cleanEvent, title: `${event.title} (Cópia)`, targetPeriods: event.targetPeriods ? [...event.targetPeriods] : ['all'], recurrence: event.recurrence ? { ...event.recurrence } : { type: 'none', until: '' }, category: event.category || 'general', endTime: event.endTime || '' });
    setIsMultiDay(!!event.endDate);
    setIsModalOpen(true);
  };
  const openCreateModal = () => { setEditingEvent(null); resetForm(); setIsModalOpen(true); };
  const resetForm = () => { setFormData({ title: '', date: format(new Date(), 'yyyy-MM-dd'), endDate: '', time: '09:00', endTime: '', category: 'general', allDay: false, recurrence: { type: 'none', until: '' }, targetPeriods: ['all'], description: '', local: '', course: '', link: '' }); setIsMultiDay(false); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#d31c5b]"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans text-gray-900">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             {/* 1. CORREÇÃO LOGO: Sem fundo rosa, sem inversão de cor */}
             <img src="/logo.png" className="h-8 w-auto object-contain" alt="Afya" />
             
             <div>
                <h1 className="text-xl font-black text-gray-800 tracking-tight uppercase">Painel Administrativo</h1>
                <p className="text-xs text-gray-400 font-medium">Coordenação do Curso de Medicina</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <Button variant="ghost" onClick={() => setLocation("/admin/registries")} className="text-gray-500 hover:text-[#d31c5b] hover:bg-pink-50 gap-2"><Cog6ToothIcon className="w-5 h-5" /> Cadastros</Button>
            <Button variant="ghost" onClick={() => setLocation("/admin/exams")} className="text-gray-500 hover:text-purple-600 hover:bg-purple-50 gap-2"><ClipboardDocumentCheckIcon className="w-5 h-5" /> Provas</Button>
            <Button 
                variant="ghost" 
                onClick={() => setLocation("/admin/reenrollment")} 
                className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 gap-2"
            >
                <DocumentTextIcon className="w-5 h-5" /> Rematrículas
            </Button>
            <div className="h-5 w-px bg-gray-200 mx-2"></div>
            <Button onClick={handleLogout} variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-2"><ArrowLeftOnRectangleIcon className="w-5 h-5" /> Sair</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><CalendarDaysIcon className="w-8 h-8" /></div>
                <div><p className="text-3xl font-black text-gray-800">{stats.total}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Eventos Totais</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircleIcon className="w-8 h-8" /></div>
                <div><p className="text-3xl font-black text-gray-800">{stats.thisMonth}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Neste Mês</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><MegaphoneIcon className="w-8 h-8" /></div>
                <div><p className="text-3xl font-black text-gray-800">{activeNotifications.length}</p><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avisos Ativos</p></div>
            </div>
        </div>

        {/* --- DESTAQUE: PRÓXIMO EVENTO --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                 {/* Card Próximo Evento */}
                 {stats.nextEvent ? (
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-32 bg-[#d31c5b] blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <span className="inline-block px-3 py-1 rounded-full bg-[#d31c5b] text-xs font-bold uppercase mb-3 shadow-lg shadow-pink-900/50">Próximo na Agenda</span>
                                {/* 2. CORREÇÃO TÍTULO: Forçado text-white */}
                                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-2 text-white">
                                    {stats.nextEvent.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-4 text-gray-300 font-medium text-sm">
                                    <span className="flex items-center gap-2"><CalendarDaysIcon className="w-5 h-5" /> {format(parseISO(stats.nextEvent.date), "dd 'de' MMMM", { locale: ptBR })}</span>
                                    {stats.nextEvent.local && <span className="flex items-center gap-2"><MapPinIcon className="w-5 h-5" /> {stats.nextEvent.local}</span>}
                                </div>
                            </div>
                            <Button onClick={() => openEditModal(stats.nextEvent!)} className="bg-white text-gray-900 hover:bg-gray-100 border-0 shadow-lg">
                                <PencilIcon className="w-4 h-4 mr-2" /> Gerenciar
                            </Button>
                        </div>
                    </div>
                 ) : (
                    <div className="bg-gray-100 rounded-2xl p-8 text-center border border-dashed border-gray-300">
                        <p className="text-gray-400 font-medium">Nenhum evento futuro agendado.</p>
                    </div>
                 )}

                 {/* --- ÁREA DA LISTA DE EVENTOS --- */}
                 <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    
                    {/* Header da Tabela com Filtros */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input placeholder="Buscar evento..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-white" />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                                <SelectTrigger className="w-full md:w-[140px] bg-white"><SelectValue placeholder="Período" /></SelectTrigger>
                                <SelectContent><SelectItem value="all">Todos</SelectItem>{ACADEMIC_PERIODS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="w-full md:w-[140px] bg-white"><SelectValue placeholder="Categoria" /></SelectTrigger>
                                <SelectContent><SelectItem value="all">Todas</SelectItem>{Object.values(categories).map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button onClick={openCreateModal} className="bg-[#d31c5b] hover:bg-[#a01545] text-white whitespace-nowrap">
                                <PlusIcon className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Novo Evento</span>
                            </Button>
                        </div>
                    </div>

                    {/* 3. LISTA RECOLHIDA / EXPANDIDA */}
                    <div className="bg-white transition-all">
                        {!shouldShowList ? (
                            // ESTADO RECOLHIDO (PLACEHOLDER)
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <div className="bg-gray-50 p-4 rounded-full mb-3">
                                    <FunnelIcon className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-gray-900 font-bold mb-1">A lista está recolhida</h3>
                                <p className="text-sm text-gray-500 max-w-sm mb-4">
                                    Selecione um <strong>Período</strong>, uma <strong>Categoria</strong> ou digite uma <strong>Busca</strong> acima para visualizar os eventos correspondentes.
                                </p>
                                <Button variant="outline" size="sm" onClick={() => setForceShowList(true)} className="gap-2">
                                    <EyeIcon className="w-4 h-4" /> Carregar tudo mesmo assim
                                </Button>
                            </div>
                        ) : (
                            // ESTADO EXPANDIDO (TABELA)
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse animate-in fade-in zoom-in-95 duration-300">
                                <thead><tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider"><th className="p-4">Data</th><th className="p-4">Evento</th><th className="p-4">Público</th><th className="p-4 text-center">Ações</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredEvents.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400 italic">Nenhum evento encontrado com estes filtros.</td></tr>
                                    ) : (
                                        filteredEvents.map((event) => {
                                            const category = categories[event.category] || DEFAULT_CATEGORIES.general;
                                            return (
                                                <tr key={event.id} className="hover:bg-gray-50/80 transition-colors group">
                                                    <td className="p-4 align-top w-32">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-800 text-sm">{format(parseISO(event.date), 'dd/MM')}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{format(parseISO(event.date), 'EEE', { locale: ptBR })}</span>
                                                            {event.time && <span className="text-[10px] text-gray-500 mt-1">{event.time}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div>
                                                            <p className="font-bold text-gray-800 text-sm mb-1">{event.title}</p>
                                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${category.color.replace('bg-', 'text-').replace('text-white', 'border-current bg-transparent')}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${category.color}`}></span>{category.label}
                                                            </span>
                                                            {event.local && (<p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1"><MapPinIcon className="w-3 h-3" /> {event.local}</p>)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top w-48">
                                                        {event.targetPeriods?.includes('all') ? 
                                                            (<span className="inline-block bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded">TODOS</span>) : 
                                                            (<div className="flex flex-wrap gap-1">{event.targetPeriods?.map(p => (<span key={p} className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-bold px-1.5 py-0.5 rounded">{p}º</span>))}</div>)
                                                        }
                                                    </td>
                                                    <td className="p-4 align-top w-32">
                                                        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openDuplicateModal(event)} className="p-1.5 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded transition-colors" title="Duplicar"><DocumentDuplicateIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => openEditModal(event)} className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Editar"><PencilIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded transition-colors" title="Excluir"><TrashIcon className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Footer da Tabela para recolher */}
                    {shouldShowList && (
                        <div className="bg-gray-50 p-2 text-center border-t border-gray-100">
                             <button onClick={() => { setForceShowList(false); setSearchTerm(''); setFilterPeriod('all'); setFilterCategory('all'); }} className="text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 w-full">
                                <EyeSlashIcon className="w-3 h-3" /> Limpar filtros e recolher lista
                             </button>
                        </div>
                    )}
                 </div>
            </div>

            {/* BARRA LATERAL (WIDGETS) MANTIDA */}
            <div className="space-y-8">
    
            {/* WIDGET: MURAL DE AVISOS (MANTIDO IGUAL) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                              <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg"><MegaphoneIcon className="w-5 h-5" /></div>
                              <h3 className="font-bold text-gray-900 text-sm">Avisos Ativos</h3>
                          </div>
                          <Button onClick={() => setIsNotifModalOpen(true)} variant="outline" size="sm" className="text-xs h-7">Novo</Button>
                      </div>
                      {activeNotifications.length === 0 ? (
                          <p className="text-xs text-gray-400 italic text-center py-4">Sem avisos no momento.</p>
                      ) : (
                          <div className="space-y-3">
                              {activeNotifications.map(notif => (
                                  <div key={notif.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 relative group">
                                      <div className="flex items-start gap-2">
                                          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.type === 'urgent' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                          <div>
                                              <p className="text-xs text-gray-700 font-medium leading-relaxed">{notif.message}</p>
                                              <span className="text-[10px] text-gray-400 mt-1 block">
                                                  Para: {notif.targetPeriods.includes('all') ? 'Todos' : notif.targetPeriods.join(', ') + 'º Período'}
                                              </span>
                                          </div>
                                      </div>
                                      <button onClick={() => handleDeleteNotification(notif.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <TrashIcon className="w-3 h-3" />
                                      </button>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {/* WIDGET: CATEGORIAS (ALTERADO PARA MENU SUSPENSO) */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all">
                      <button 
                          onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                          className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition-colors"
                      >
                          <div className="flex items-center gap-2">
                              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                  <PresentationChartLineIcon className="w-5 h-5" />
                              </div>
                              <h3 className="font-bold text-gray-900 text-sm">Gerenciar Categorias</h3>
                          </div>
                          {isCategoriesOpen ? (
                              <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                          ) : (
                              <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                          )}
                      </button>

                      {/* Conteúdo que abre/fecha */}
                      {isCategoriesOpen && (
                          <div className="p-5 pt-0 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                              <CategoryManager />
                          </div>
                      )}
                  </div>

              </div>
        </div>
      </main>

      {/* --- MODAIS (EXATAMENTE OS MESMOS DE ANTES) --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-0 border border-gray-100 shadow-xl rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto outline-none">
          <DialogHeader className="p-5 border-b border-gray-100 bg-gray-50"><DialogTitle className="font-bold text-xl text-gray-900">{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitEvent} className="p-6 space-y-5">
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Título do Evento</Label><Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required className="neo-input" placeholder="Ex: Prova de Anatomia" /></div>
            <div className="p-4 border border-gray-200 bg-gray-50/50 rounded-xl space-y-3">
                <div className="flex items-center gap-2"><UsersIcon className="w-4 h-4 text-primary" /><Label className="text-xs font-bold uppercase text-primary">Público Alvo</Label></div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => toggleEventPeriod('all')} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${formData.targetPeriods?.includes('all') ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>TODOS</button>
                    {ACADEMIC_PERIODS.map((period) => (<button key={period.id} type="button" onClick={() => toggleEventPeriod(period.id)} className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${formData.targetPeriods?.includes(period.id) ? 'bg-[#d31c5b] text-white border-[#d31c5b] shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-[#d31c5b]/50'}`}>{period.label}</button>))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Data de Início</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required className="neo-input" /></div>
              <div className="space-y-1.5"><div className="flex justify-between items-center mb-1"><Label className="text-xs font-bold uppercase text-gray-500">Data de Término</Label><div className="flex items-center gap-2"><Checkbox id="multiDay" checked={isMultiDay} onCheckedChange={(c) => setIsMultiDay(c as boolean)} className="data-[state=checked]:bg-[#d31c5b]" /><label htmlFor="multiDay" className="text-xs font-medium cursor-pointer text-gray-600">Vários dias?</label></div></div><Input type="date" value={formData.endDate || ''} onChange={(e) => setFormData({...formData, endDate: e.target.value})} disabled={!isMultiDay} className="neo-input disabled:bg-gray-100" /></div>
            </div>
            <div className="p-4 border border-dashed border-gray-300 rounded-xl space-y-3">
                <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Repetição</Label><Select value={formData.recurrence?.type || 'none'} onValueChange={(val: RecurrenceType) => setFormData({...formData, recurrence: { ...formData.recurrence, type: val }})}><SelectTrigger className="neo-input bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Não repetir</SelectItem><SelectItem value="daily">Diariamente</SelectItem><SelectItem value="weekly">Semanalmente</SelectItem><SelectItem value="biweekly">Quinzenalmente</SelectItem><SelectItem value="monthly">Mensalmente</SelectItem></SelectContent></Select></div>
                {formData.recurrence?.type !== 'none' && (<div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Repetir até:</Label><Input type="date" value={formData.recurrence?.until || ''} onChange={(e) => setFormData({...formData, recurrence: { ...formData.recurrence, type: formData.recurrence!.type, until: e.target.value }})} className="neo-input" /></div>)}
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Horário</Label><div className="flex gap-2 items-center"><Input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} disabled={formData.allDay} className="neo-input flex-grow" /><span className="text-gray-400 text-xs">até</span><Input type="time" value={formData.endTime || ''} onChange={(e) => setFormData({...formData, endTime: e.target.value})} disabled={formData.allDay} className="neo-input flex-grow" /></div><div className="flex items-center gap-2 mt-2"><Checkbox id="allDay" checked={formData.allDay} onCheckedChange={(c) => setFormData({...formData, allDay: c as boolean})} className="data-[state=checked]:bg-[#d31c5b]" /><label htmlFor="allDay" className="text-xs font-bold text-gray-600 cursor-pointer">Evento de dia inteiro</label></div></div>
                 <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Categoria</Label><Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}><SelectTrigger className="neo-input"><SelectValue /></SelectTrigger><SelectContent>{Object.values(categories).map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Local</Label><Input value={formData.local} onChange={(e) => setFormData({...formData, local: e.target.value})} className="neo-input" placeholder="Sala, Auditório ou Link" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase text-gray-500">Descrição</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="neo-input min-h-[100px] resize-none" placeholder="Detalhes do evento..." /></div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-6">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="hover:bg-gray-200 text-gray-600">Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-[#d31c5b] hover:bg-[#a01545] text-white px-8 shadow-lg shadow-pink-200">{loading ? 'Salvando...' : 'Salvar Evento'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* MODAL NOTIFICAÇÃO (MESMO CÓDIGO) */}
      <Dialog open={isNotifModalOpen} onOpenChange={setIsNotifModalOpen}>
        <DialogContent className="max-w-md bg-white">
            <DialogHeader><DialogTitle>Novo Aviso</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveNotification} className="space-y-4 pt-4">
                <div className="space-y-1.5"><Label>Mensagem</Label><Textarea value={notifData.message} onChange={e => setNotifData({...notifData, message: e.target.value})} placeholder="Ex: Aula de Anatomia cancelada..." className="neo-input" required /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Tipo</Label><Select value={notifData.type} onValueChange={(v: NotificationType) => setNotifData({...notifData, type: v})}><SelectTrigger className="neo-input"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">Informação (Azul)</SelectItem><SelectItem value="warning">Atenção (Amarelo)</SelectItem><SelectItem value="urgent">Urgente (Vermelho)</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-1.5"><Label>Quem deve ver?</Label><div className="flex flex-wrap gap-2"><button type="button" onClick={() => toggleNotifPeriod('all')} className={`px-2 py-1 text-xs border rounded ${notifData.targetPeriods.includes('all') ? 'bg-gray-900 text-white' : ''}`}>Todos</button>{ACADEMIC_PERIODS.map(p => (<button key={p.id} type="button" onClick={() => toggleNotifPeriod(p.id)} className={`px-2 py-1 text-xs border rounded ${notifData.targetPeriods.includes(p.id) ? 'bg-[#d31c5b] text-white' : ''}`}>{p.id}º</button>))}</div></div>
                <Button type="submit" disabled={loading} className="w-full bg-[#d31c5b] hover:bg-[#a01545] text-white mt-4 flex items-center justify-center gap-2">{loading ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Publicando...</>) : ('Publicar Aviso')}</Button>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}