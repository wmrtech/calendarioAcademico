import { Event } from "./types";
import { addDays, addWeeks, addMonths, isBefore, parseISO, isAfter, isWithinInterval, startOfDay, endOfDay } from "date-fns";

export function processEventsForView(events: Event[], viewStart: Date, viewEnd: Date): Event[] {
  const processedEvents: Event[] = [];

  events.forEach(event => {
    if (!event.date) return;
    
    // Datas Originais (cruciais para a barra contínua)
    const originalStart = parseISO(event.date);
    const originalEnd = event.endDate ? parseISO(event.endDate) : originalStart;
    
    // Função auxiliar para criar a instância com metadados
    const pushEvent = (currentDate: Date, instanceEnd: Date) => {
      processedEvents.push({
        ...event,
        id: `${event.id}_${currentDate.toISOString()}`, // ID único para a key do React
        originalId: event.id, // ID original para agrupar se precisar
        date: currentDate.toISOString().split('T')[0], // Data desta fatia específica
        endDate: event.endDate ? instanceEnd.toISOString().split('T')[0] : undefined,
        
        // METADADOS PARA RENDERIZAÇÃO
        originalStartDate: event.date, 
        originalEndDate: event.endDate || event.date
      });
    };

    // 1. Lógica para eventos SEM recorrência (mas podem durar vários dias)
    if (!event.recurrence || event.recurrence.type === 'none') {
        // Se o evento cruza o período de visualização atual
        if (
           (isAfter(originalStart, viewStart) || isWithinInterval(originalStart, { start: viewStart, end: viewEnd }) || isBefore(originalStart, viewEnd)) &&
           (isBefore(originalStart, viewEnd) || isAfter(originalEnd, viewStart))
        ) {
            // No caso de múltiplos dias sem recorrência, precisamos gerar um bloco para CADA dia
            // para que a Grid do React consiga renderizar em cada célula.
            // A "ilusão" de continuidade será feita no CSS do Home.tsx
            
            let cursor = originalStart;
            // Otimização: Começar o cursor no início da view se o evento começou antes
            if (isBefore(cursor, viewStart)) cursor = viewStart;

            const limit = isBefore(originalEnd, viewEnd) ? originalEnd : viewEnd;

            while (cursor <= limit) {
                pushEvent(cursor, originalEnd);
                cursor = addDays(cursor, 1);
            }
        }
        return;
    }

    // 2. Lógica para eventos COM RECORRÊNCIA
    const recurEnd = event.recurrence.until ? parseISO(event.recurrence.until) : addMonths(new Date(), 12);
    const actualRecurEnd = isBefore(recurEnd, viewEnd) ? recurEnd : viewEnd;

    let currentInstanceDate = originalStart;
    let safetyCounter = 0;
    
    while (isBefore(currentInstanceDate, addDays(actualRecurEnd, 1)) && safetyCounter < 365) {
      safetyCounter++;
      
      // Se esta ocorrência da repetição cai dentro da visualização
      // E se for multi-day, temos que gerar os dias intermediários dessa ocorrência também
      const instanceDuration = originalEnd.getTime() - originalStart.getTime();
      const currentInstanceEnd = new Date(currentInstanceDate.getTime() + instanceDuration);

      // Verifica intersecção com a view
      if (
          (isAfter(currentInstanceEnd, viewStart)) && 
          (isBefore(currentInstanceDate, viewEnd))
      ) {
          // Loop interno para gerar os dias dessa instância específica
          let dayCursor = currentInstanceDate;
          const dayLimit = currentInstanceEnd;

          // Proteção para não gerar dias infinitos se o usuário errou
          let innerSafety = 0;
          while (dayCursor <= dayLimit && innerSafety < 30) {
              innerSafety++;
              // Só adiciona se o dia estiver visível na tela
              if (isWithinInterval(dayCursor, { start: viewStart, end: viewEnd })) {
                   // Para instâncias recorrentes, as datas originais de referência 
                   // são o início e fim DESTA INSTÂNCIA
                   processedEvents.push({
                      ...event,
                      id: `${event.id}_${currentInstanceDate.getTime()}_${dayCursor.getTime()}`,
                      date: dayCursor.toISOString().split('T')[0],
                      
                      // Aqui o "Original Start" vira o início desta repetição específica
                      originalStartDate: currentInstanceDate.toISOString().split('T')[0],
                      originalEndDate: currentInstanceEnd.toISOString().split('T')[0]
                   });
              }
              dayCursor = addDays(dayCursor, 1);
          }
      }

      // Avança a recorrência
      switch (event.recurrence.type) {
        case 'daily': currentInstanceDate = addDays(currentInstanceDate, 1); break;
        case 'weekly': currentInstanceDate = addWeeks(currentInstanceDate, 1); break;
        case 'biweekly': currentInstanceDate = addWeeks(currentInstanceDate, 2); break;
        case 'monthly': currentInstanceDate = addMonths(currentInstanceDate, 1); break;
        default: safetyCounter = 999; break;
      }
    }
  });

  return processedEvents;
}

export function isEventInDay(event: Event, day: Date): boolean {
    if (!event.date) return false;
    // Comparação simples de string YYYY-MM-DD para performance
    const dayString = format(day, 'yyyy-MM-dd');
    return event.date === dayString;
}

// Helper para formatação
import { format } from "date-fns";