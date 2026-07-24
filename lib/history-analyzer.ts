import { db } from './db';

export interface HistoryInsight {
  address: string;
  totalDeliveries: number;
  successCount: number;
  failedCount: number;
  averageServiceTimeMinutes: number;
  failureReasons: string[];
  notes: string[];
  recommendation: string;
}

/**
 * Normalizes an address for comparison (ignores case, common abbreviations, numbers)
 */
function normalizeAddress(addr: string): string {
  if (!addr) return '';
  return addr
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[,\-\.]/g, '')
    .replace(/\b(rua|avenida|av|r|travessa|trav|tv|beco|bco|alameda|al)\b/gi, '')
    .trim();
}

/**
 * Evaluates whether two addresses are similar enough to be considered the same delivery location
 */
export function isSimilarAddress(addr1: string, addr2: string): boolean {
  const norm1 = normalizeAddress(addr1);
  const norm2 = normalizeAddress(addr2);
  if (!norm1 || !norm2) return false;
  
  // Direct inclusion check or high similarity
  return norm1.includes(norm2) || norm2.includes(norm1) || norm1 === norm2;
}

/**
 * Analyzes the delivery history of a list of target addresses by querying past routes.
 */
export async function analyzeAddressesHistory(addresses: string[]): Promise<Record<string, HistoryInsight>> {
  const insights: Record<string, HistoryInsight> = {};
  
  try {
    // Fetch all routes from local DB
    const allRoutes = await db.routes.toArray();
    
    for (const address of addresses) {
      let totalDeliveries = 0;
      let successCount = 0;
      let failedCount = 0;
      const failureReasons: string[] = [];
      const notes: string[] = [];
      let totalServiceTime = 0;
      let serviceTimeCount = 0;

      // Scan all completed/failed historical routes
      for (const route of allRoutes) {
        if (!route.sequence) continue;
        
        for (const stop of route.sequence) {
          if (isSimilarAddress(stop.address, address)) {
            totalDeliveries++;
            
            if (stop.status === 'completed') {
              successCount++;
              // If we have actual time calculations
              totalServiceTime += stop.actualServiceDuration || 15;
              serviceTimeCount++;
            } else if (stop.status === 'failed') {
              failedCount++;
              if (stop.failureReason) {
                failureReasons.push(stop.failureReason);
              }
            }
            
            if (stop.deliveryNotes) {
              notes.push(stop.deliveryNotes);
            }
          }
        }
      }

      if (totalDeliveries > 0) {
        const averageServiceTimeMinutes = serviceTimeCount > 0 
          ? Math.round(totalServiceTime / serviceTimeCount) 
          : 15;
        
        // Generate proactive recommendations
        let recommendation = 'Nenhum problema crônico detectado. Manter plano padrão.';
        const failureRate = failedCount / totalDeliveries;
        
        if (failureRate >= 0.5) {
          const uniqueReasons = Array.from(new Set(failureReasons)).join(', ');
          recommendation = `ALERTA: Alta taxa de falha (${Math.round(failureRate * 100)}%). Motivos históricos: ${uniqueReasons || 'Não especificado'}. Recomenda-se ligar para o destinatário antes de sair da base.`;
        } else if (averageServiceTimeMinutes > 25) {
          recommendation = `Atenção: Tempo de descarga historicamente longo (${averageServiceTimeMinutes} min). Alocado tempo extra de tolerância nesta parada para não atrasar as subsequentes.`;
        } else if (failedCount > 0) {
          recommendation = `Aviso de restrição: Há registro de falha anterior por "${failureReasons[0]}". Verifique a documentação antes do desembarque.`;
        }

        insights[address] = {
          address,
          totalDeliveries,
          successCount,
          failedCount,
          averageServiceTimeMinutes,
          failureReasons: Array.from(new Set(failureReasons)),
          notes: Array.from(new Set(notes)).slice(0, 3), // max 3 notes
          recommendation
        };
      }
    }
  } catch (err) {
    console.error("Failed to analyze addresses history:", err);
  }
  
  return insights;
}

/**
 * Seeds the database with high-fidelity historical routes if empty.
 * This simulates a realistic scenario for a company in Manaus,
 * so that when the user opens the history panel, they immediately see real,
 * high-value operational insights.
 */
export async function seedHistoryIfEmpty() {
  // No fictitious routes are seeded automatically.
  // The database starts clean for authentic user-generated routes.
  return;
}
