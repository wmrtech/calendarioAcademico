import { useState, useEffect } from "react";
import { Link } from "wouter";
import { collection, query, getDocs, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exam } from "@/lib/types";
import { CalendarDaysIcon, ArrowRightIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { format, parseISO, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PublicExamSelection() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        // Busca todas as provas
        const q = query(collection(db, "exams"), orderBy("date", "asc"));
        const snap = await getDocs(q);
        
        // Filtra no cliente apenas as futuras ou de hoje
        const data = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Exam))
            .filter(e => isFuture(parseISO(e.date)) || new Date(e.date).toDateString() === new Date().toDateString());
            
        setExams(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      
      {/* HEADER */}
      <div className="text-center mb-10 mt-10">
        <div className="bg-white p-4 rounded-2xl shadow-sm inline-block mb-4">
            <img src="/logo.png" alt="Afya" className="h-8 md:h-10 object-contain" />
        </div>
        <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Portal de Ensalamento</h1>
        <p className="text-gray-500 font-medium">Selecione uma prova para definir as salas</p>
      </div>

      {/* LISTA DE PROVAS */}
      {loading ? (
        <div className="animate-pulse text-[#d31c5b] font-bold">Carregando provas...</div>
      ) : exams.length === 0 ? (
        <div className="text-center text-gray-400 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma prova agendada para ensalamento.</p>
        </div>
      ) : (
        <div className="w-full max-w-2xl space-y-4">
            {exams.map(exam => (
                <Link key={exam.id} href={`/ensalamento/${exam.id}`}>
                    <div className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#d31c5b]/50 transition-all cursor-pointer flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-black text-gray-800 uppercase group-hover:text-[#d31c5b] transition-colors">{exam.title}</h2>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
                                <span className="flex items-center gap-1"><CalendarDaysIcon className="w-4 h-4" /> {format(parseISO(exam.date), "dd 'de' MMMM", { locale: ptBR })}</span>
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs uppercase font-bold text-gray-600">
                                    {exam.startTime}
                                </span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-full text-gray-400 group-hover:bg-[#d31c5b] group-hover:text-white transition-all">
                            <ArrowRightIcon className="w-5 h-5" />
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      )}
    </div>
  );
}