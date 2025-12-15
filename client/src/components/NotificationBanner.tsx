import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppNotification } from "@/lib/types";
import { MegaphoneIcon, XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

interface NotificationBannerProps {
  studentPeriod: string;
}

export default function NotificationBanner({ studentPeriod }: NotificationBannerProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Busca avisos recentes
        const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        const allNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
        
        // Filtra localmente para garantir compatibilidade com arrays do Firestore
        const relevantNotes = allNotes.filter(note => 
          note.targetPeriods.includes('all') || note.targetPeriods.includes(studentPeriod)
        );

        setNotifications(relevantNotes);
        setIsVisible(true); // Reabre o banner se novos avisos carregarem
      } catch (error) {
        console.error("Erro ao buscar avisos:", error);
      }
    };

    fetchNotifications();
  }, [studentPeriod]);

  if (notifications.length === 0 || !isVisible) return null;

  // Pega o aviso mais prioritário para definir a cor do banner
  const hasUrgent = notifications.some(n => n.type === 'urgent');
  const hasWarning = notifications.some(n => n.type === 'warning');

  let bgClass = "bg-blue-50 border-blue-100 text-blue-800";
  let icon = <InformationCircleIcon className="w-5 h-5 text-blue-600" />;

  if (hasUrgent) {
    bgClass = "bg-red-50 border-red-100 text-red-800";
    icon = <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
  } else if (hasWarning) {
    bgClass = "bg-yellow-50 border-yellow-100 text-yellow-800";
    icon = <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
  }

  return (
    <div className={`mb-6 rounded-xl border p-4 shadow-sm relative animate-in slide-in-from-top-2 fade-in duration-500 ${bgClass}`}>
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors"
      >
        <XMarkIcon className="w-4 h-4 opacity-50" />
      </button>

      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex flex-col gap-1.5 w-full pr-6">
          {notifications.map(note => (
            <div key={note.id} className="text-sm font-medium leading-relaxed border-b border-black/5 last:border-0 pb-1 last:pb-0">
               {note.type === 'urgent' && <span className="font-bold text-red-600 mr-1">[URGENTE]</span>}
               {note.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}