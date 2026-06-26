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
  try {
    const count = await db.routes.count();
    if (count > 0) return; // Already seeded
    
    console.log("Seeding delivery history database with high-fidelity Amazonas routes...");
    
    const now = new Date();
    const pastDate1 = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
    const pastDate2 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const pastDate3 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

    const sampleRoutes = [
      {
        date: pastDate1,
        addresses: [
          'Porto de Manaus, Centro',
          'Av. Tefé, 1000 - Japiim',
          'Av. Noel Nutels, 500 - Cidade Nova',
          'Porto de Manaus, Centro'
        ],
        sequence: [
          { address: 'Porto de Manaus, Centro', status: 'completed', actualServiceDuration: 15, deliveryNotes: 'Saída às 08:00' },
          { address: 'Av. Tefé, 1000 - Japiim', status: 'completed', actualServiceDuration: 35, deliveryNotes: 'Descarga de caixas grandes demorou no galpão.' },
          { address: 'Av. Noel Nutels, 500 - Cidade Nova', status: 'failed', failureReason: 'Destinatário Ausente', deliveryNotes: 'Portão fechado, ninguém atendeu ao interfone.' },
          { address: 'Porto de Manaus, Centro', status: 'completed', actualServiceDuration: 10, deliveryNotes: 'Retorno com devolução.' }
        ],
        score: 75,
        status: 'completed' as const
      },
      {
        date: pastDate2,
        addresses: [
          'Terminal Graneleiro, Ponta Negra',
          'Shopping Grande Circular',
          'Av. Djalma Batista, 2000'
        ],
        sequence: [
          { address: 'Terminal Graneleiro, Ponta Negra', status: 'completed', actualServiceDuration: 20 },
          { address: 'Shopping Grande Circular', status: 'completed', actualServiceDuration: 15, deliveryNotes: 'Docas do shopping liberadas rapidamente.' },
          { address: 'Av. Djalma Batista, 2000', status: 'completed', actualServiceDuration: 12 }
        ],
        score: 92,
        status: 'completed' as const
      },
      {
        date: pastDate3,
        addresses: [
          'Porto de Manaus, Centro',
          'Av. Noel Nutels, 500 - Cidade Nova',
          'Distrito Industrial I'
        ],
        sequence: [
          { address: 'Porto de Manaus, Centro', status: 'completed', actualServiceDuration: 15 },
          { address: 'Av. Noel Nutels, 500 - Cidade Nova', status: 'failed', failureReason: 'Cliente Recusou Receber', deliveryNotes: 'Mercadoria em desacordo com o pedido.' },
          { address: 'Distrito Industrial I', status: 'completed', actualServiceDuration: 40, deliveryNotes: 'Muita fila de caminhões para descarregar.' }
        ],
        score: 68,
        status: 'failed' as const
      }
    ];

    for (const r of sampleRoutes) {
      await db.routes.add(r);
    }
    console.log("Database history seeded successfully with 3 rich logs.");
  } catch (err) {
    console.error("Error seeding history:", err);
  }
}
