import { db } from './db';

export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
  name: string;
  context: string;
  confidenceScore: number;
  source: 'ors' | 'nominatim' | 'photon' | 'cache' | 'google' | 'mapbox' | 'viacep' | 'open-meteo';
  type?: 'address' | 'poi' | 'landmark';
  cep?: string;
}

function formatCep(cep: any): string | undefined {
  if (!cep) return undefined;
  const str = String(cep).replace(/\D/g, '');
  if (str.length === 8) {
    return `${str.slice(0, 5)}-${str.slice(5)}`;
  }
  return String(cep);
}

/**
 * Calculates Levenshtein distance between two strings for fuzzy matching.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row: number[] = [];
  for (let i = 0; i <= a.length; i++) {
    row[i] = i;
  }

  for (let i = 1; i <= b.length; i++) {
    let prev = i;
    for (let j = 1; j <= a.length; j++) {
      let val: number;
      if (b[i - 1] === a[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[a.length] = prev;
  }
  return row[a.length];
}

/**
 * Returns a normalized string similarity ratio between 0.0 and 1.0 using Levenshtein distance & substring checks.
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const s2 = str2.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return 0.85 + (0.15 * (minLen / maxLen));
  }

  const maxLen = Math.max(s1.length, s2.length);
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Performs token-level fuzzy matching between query words and candidate text.
 */
export function fuzzyTokenMatch(queryTokens: string[], candidateText: string): { totalScore: number; matchCount: number; ratio: number } {
  if (queryTokens.length === 0 || !candidateText) return { totalScore: 0, matchCount: 0, ratio: 0 };
  const candidateNorm = candidateText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, ' ');
  const candidateWords = candidateNorm.split(/\s+/).filter(w => w.length > 0);

  let matchCount = 0;
  let totalScore = 0;

  for (const qToken of queryTokens) {
    if (qToken.length <= 1) continue;
    let bestTokenScore = 0;

    if (candidateNorm.includes(qToken)) {
      bestTokenScore = 1.0;
    } else {
      for (const cWord of candidateWords) {
        if (cWord.length <= 1) continue;
        if (qToken.length >= 3 && cWord.startsWith(qToken)) {
          const score = 0.85 + 0.15 * (qToken.length / cWord.length);
          if (score > bestTokenScore) bestTokenScore = score;
        } else if (cWord.length >= 3 && qToken.startsWith(cWord)) {
          const score = 0.85 + 0.15 * (cWord.length / qToken.length);
          if (score > bestTokenScore) bestTokenScore = score;
        } else if (Math.abs(qToken.length - cWord.length) <= 2) {
          const sim = stringSimilarity(qToken, cWord);
          if (sim >= 0.70 && sim > bestTokenScore) {
            bestTokenScore = sim;
          }
        }
      }
    }

    if (bestTokenScore >= 0.65) {
      matchCount++;
      totalScore += bestTokenScore;
    }
  }

  const ratio = queryTokens.length > 0 ? matchCount / queryTokens.length : 0;
  return { totalScore, matchCount, ratio };
}

/**
 * Calculates geolocation proximity bonus or penalty based on distance to focus/user coordinates.
 */
export function calculateGeolocationBonus(
  candLat: number,
  candLon: number,
  userLat?: number,
  userLon?: number,
  explicitLocationInQuery: boolean = false
): number {
  if (candLat === 0 || candLon === 0 || userLat == null || userLon == null) return 0;

  const distMeters = geoDistanceMeters(candLat, candLon, userLat, userLon);
  const distKm = distMeters / 1000;

  if (distKm <= 1) return 35;
  if (distKm <= 5) return 25;
  if (distKm <= 15) return 15;
  if (distKm <= 50) return 5;

  if (explicitLocationInQuery) {
    return 0;
  }

  if (distKm > 500) {
    return -45;
  } else if (distKm > 100) {
    return -25;
  } else if (distKm > 50) {
    return -10;
  }

  return 0;
}

const geoCache = new Map<string, GeocodeResult[]>();

// High-precision offline registry for famous Manaus neighborhoods & locations (demoroute)
interface RegistryEntry {
  lat: number;
  lon: number;
  name: string;
  context: string;
  aliases: string[];
}

const RICH_OFFLINE_REGISTRY: RegistryEntry[] = [
  {
    lat: -3.1311,
    lon: -60.0242,
    name: 'Centro',
    context: 'Manaus, AM, Brasil',
    aliases: ['centro', 'centro manaus', 'centro civico']
  },
  {
    lat: -3.1116,
    lon: -60.0121,
    name: 'Adrianópolis',
    context: 'Manaus, AM, Brasil',
    aliases: ['adrianopolis', 'bairro adrianopolis', 'mario ypiranga']
  },
  {
    lat: -3.0963,
    lon: -59.9892,
    name: 'Aleixo',
    context: 'Manaus, AM, Brasil',
    aliases: ['aleixo', 'bairro aleixo']
  },
  {
    lat: -3.0298,
    lon: -59.9723,
    name: 'Cidade Nova',
    context: 'Manaus, AM, Brasil',
    aliases: ['cidade nova', 'bairro cidade nova', 'noel nutels']
  },
  {
    lat: -3.0801,
    lon: -60.0163,
    name: 'Flores',
    context: 'Manaus, AM, Brasil',
    aliases: ['flores', 'bairro flores']
  },
  {
    lat: -3.1102,
    lon: -60.0468,
    name: 'Compensa',
    context: 'Manaus, AM, Brasil',
    aliases: ['compensa', 'bairro compensa']
  },
  {
    lat: -3.0355,
    lon: -60.0125,
    name: 'Bemol Torquato (CD - Centro de Distribuição)',
    context: 'Av. Torquato Tapajós, Manaus - AM',
    aliases: ['bemol torquato', 'cd', 'cd bemol', 'centro de distribuicao', 'centro de distribuicao bemol', 'bemol cd', 'cd bemol torquato', 'torquato tapajos bemol', 'distribuicao bemol', 'deposito bemol']
  },
  {
    lat: -3.1312,
    lon: -60.0268,
    name: 'Bemol Centro',
    context: 'Rua Marquês de Santa Cruz, Centro, Manaus - AM',
    aliases: ['bemol centro', 'loja bemol centro', 'bemol da marques', 'marques de santa cruz']
  },
  {
    lat: -3.0248,
    lon: -59.9678,
    name: 'Sumaúma Park Shopping',
    context: 'Av. Noel Nutels, Cidade Nova, Manaus - AM',
    aliases: ['-3.0248', 'sumauma', 'sumauma shopping', 'sumauma park shopping', 'shopping sumauma']
  },
  {
    lat: -3.1042,
    lon: -60.0102,
    name: 'Manauara Shopping',
    context: 'Av. Mário Ypiranga Monteiro, Adrianópolis, Manaus - AM',
    aliases: ['manauara', 'manauara shopping', 'shopping manauara']
  },
  {
    lat: -3.1025,
    lon: -60.0278,
    name: 'Amazonas Shopping',
    context: 'Av. Djalma Batista, Flores, Manaus - AM',
    aliases: ['amazonas shopping', 'shopping amazonas', 'djalma batista']
  },
  {
    lat: -3.0392,
    lon: -60.0489,
    name: 'Aeroporto Internacional Eduardo Gomes (Terminal 1)',
    context: 'Av. Santos Dumont, 1350, Tarumã, Manaus - AM',
    aliases: ['aeroporto', 'aeroporto de manaus', 'aeroporto internacional eduardo gomes', 'eduardo gomes', 'santos dumont', 'aero', 'aeroporto eduardo gomes', 'mao', 'sbeg', 'aeroporto passageiros', 'terminal aeroporto', 'terminal 1 aeroporto', 'taruma aeroporto', 'aeroporto manaus']
  },
  {
    lat: -3.0388,
    lon: -60.0452,
    name: 'Aeroporto Eduardo Gomes - Terminal de Cargas (TECA)',
    context: 'Av. Santos Dumont, Tarumã, Manaus - AM',
    aliases: ['teca', 'teca aeroporto', 'terminal de cargas aeroporto', 'aeroporto teca', 'cargas aeroporto']
  },
  {
    lat: -3.0425,
    lon: -60.0545,
    name: 'Aeroporto Eduardo Gomes - Terminal 2 (Eduardinho)',
    context: 'Av. Santos Dumont, Tarumã, Manaus - AM',
    aliases: ['eduardinho', 'terminal 2 aeroporto', 'aeroporto terminal 2', 'hangar aeroporto']
  },
  {
    lat: -3.1410,
    lon: -60.0260,
    name: 'Porto de Manaus',
    context: 'Centro, Manaus - AM',
    aliases: ['porto', 'porto de manaus', 'porto centro', 'escadaria roadway']
  },
  {
    lat: -3.0825,
    lon: -60.0281,
    name: 'Arena da Amazônia',
    context: 'Av. Constantino Nery, Flores, Manaus - AM',
    aliases: ['arena da amazonia', 'estadio arena', 'constantino nery', 'sambodromo']
  },
  {
    lat: -3.1302,
    lon: -60.0234,
    name: 'Teatro Amazonas',
    context: 'Largo de São Sebastião, Centro, Manaus - AM',
    aliases: ['teatro amazonas', 'largo de sao sebastiao', 'teatro centro']
  },
  {
    lat: -3.0991,
    lon: -59.9723,
    name: 'Ufam - Campus Universitário',
    context: 'Av. General Rodrigo Otávio, Coroado, Manaus - AM',
    aliases: ['ufam', 'universidade federal', 'campus ufam', 'rodrigo otavio', 'general rodrigo otavio']
  },
  {
    lat: -3.1364,
    lon: -59.9839,
    name: 'Suframa',
    context: 'Distrito Industrial I, Manaus - AM',
    aliases: ['suframa', 'superintendencia suframa', 'distrito industrial']
  },
  {
    lat: -3.0933,
    lon: -60.1018,
    name: 'Orla da Ponta Negra',
    context: 'Av. Coronel Teixeira, Ponta Negra, Manaus - AM',
    aliases: ['ponta negra', 'orla da ponta negra', 'calcadao ponta negra', 'coronel teixeira']
  },
  {
    lat: -3.1444,
    lon: -59.9431,
    name: 'Porto Fluvial do Ceasa',
    context: 'Vila Buriti, Distrito Industrial, Manaus - AM',
    aliases: ['porto do ceasa', 'ceasa', 'porto ceasa', 'balsa ceasa', 'careiro balsa']
  },
  {
    lat: -3.1202,
    lon: -60.0631,
    name: 'Ponte Rio Negro (Jornalista Phelippe Daou)',
    context: 'Compensa / Iranduba, AM',
    aliases: ['ponte rio negro', 'ponte de iranduba', 'ponte phelippe daou', 'ponte da compensa']
  },
  {
    lat: -3.0855,
    lon: -60.0125,
    name: 'Parque Dez de Novembro',
    context: 'Manaus, AM, Brasil',
    aliases: ['parque dez', 'parque 10', 'bairro parque dez', 'parque dez de novembro', 'eldorado']
  },
  {
    lat: -3.0784,
    lon: -60.0248,
    name: 'Av. Constantino Nery',
    context: 'São Geraldo / Flores, Manaus - AM',
    aliases: ['constantino nery', 'av constantino nery', 'avenida constantino nery', 't1', 'terminal 1']
  },
  {
    lat: -3.0910,
    lon: -60.0245,
    name: 'Av. Djalma Batista',
    context: 'Nossa Sra. das Graças / Flores, Manaus - AM',
    aliases: ['djalma batista', 'av djalma batista', 'avenida djalma batista', 'plaza shopping']
  },
  {
    lat: -3.0645,
    lon: -59.9928,
    name: 'Av. das Torres (Av. Gov. José Lindoso)',
    context: 'Aleixo / Cidade Nova, Manaus - AM',
    aliases: ['av das torres', 'avenida das torres', 'gov jose lindoso', 'jose lindoso', 'torres manaus']
  },
  {
    lat: -3.0850,
    lon: -59.9480,
    name: 'Av. Autaz Mirim (Grande Circular)',
    context: 'São José Operário / Jorge Teixeira, Manaus - AM',
    aliases: ['autaz mirim', 'av autaz mirim', 'grande circular', 'zona leste manaus', 't4', 't5']
  },
  {
    lat: -3.1090,
    lon: -60.0620,
    name: 'Av. Brasil',
    context: 'Compensa, Manaus - AM',
    aliases: ['av brasil', 'avenida brasil', 'brasil compensa', 'prefeitura manaus']
  },
  {
    lat: -3.1165,
    lon: -60.0150,
    name: 'Hospital e Pronto-Socorro 28 de Agosto',
    context: 'Av. Mário Ypiranga, Adrianópolis, Manaus - AM',
    aliases: ['28 de agosto', 'hps 28 de agosto', 'hospital 28 de agosto', 'pronto socorro 28']
  },
  {
    lat: -3.0815,
    lon: -59.9472,
    name: 'Hospital e Pronto-Socorro Dr. João Lúcio',
    context: 'Alameda Cosme Ferreira, Coroado, Manaus - AM',
    aliases: ['joao lucio', 'hospital joao lucio', 'hps joao lucio', 'pronto socorro joao lucio']
  },
  {
    lat: -3.1285,
    lon: -59.9912,
    name: 'Distrito Industrial I',
    context: 'Av. Rodrigo Otávio, Manaus - AM',
    aliases: ['distrito industrial', 'distrito industrial 1', 'polo industrial de manaus', 'pim']
  },
  {
    lat: -3.1415,
    lon: -59.9120,
    name: 'Distrito Industrial II',
    context: 'Av. dos Oitis, Manaus - AM',
    aliases: ['distrito industrial 2', 'distrito industrial ii', 'av dos oitis', 'polo duas rodas']
  },
  {
    lat: -3.0862,
    lon: -59.9610,
    name: 'Studio 5 Shopping & Centro de Convenções',
    context: 'Av. Rodrigo Otávio, Japiim, Manaus - AM',
    aliases: ['studio 5', 'studio 5 shopping', 'shopping studio 5', 'centro de convencoes studio 5']
  },
  {
    lat: -3.0210,
    lon: -59.9720,
    name: 'Shopping Grande Circular',
    context: 'Av. Autaz Mirim, São José, Manaus - AM',
    aliases: ['shopping grande circular', 'grande circular shopping']
  },
  {
    lat: -3.0970,
    lon: -60.0760,
    name: 'Shopping Ponta Negra',
    context: 'Av. Coronel Teixeira, Ponta Negra, Manaus - AM',
    aliases: ['shopping ponta negra', 'ponta negra shopping']
  }
];

/**
 * Normalizes a string for deduplication comparison.
 */
function normalizeForDedup(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/,\s*(brasil|brazil)\s*$/i, '') // Remove country suffix
    .replace(/\bavenida\b/gi, 'av')
    .replace(/\brua\b/gi, 'r')
    .replace(/\bdoutor\b/gi, 'dr')
    .replace(/\bprofessor\b/gi, 'prof')
    .replace(/\bsanta\b/gi, 'sta')
    .replace(/\bsanto\b/gi, 'sto')
    .replace(/[\s,\.\-\(\)]+/g, ' ') // Compact spacing and punctuation
    .trim();
}

function geoDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Snaps coordinates of known POIs (such as airports, parks, ports) that might otherwise resolve 
 * into unpaved forest centroids, airstrips, or rivers into valid, drivable vehicle access roads.
 */
export function sanitizeDrivableCoordinates(lat: number, lon: number, addressOrName?: string): { lat: number, lon: number } {
  if (lat === 0 || lon === 0) return { lat, lon };

  const norm = (addressOrName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Eduardo Gomes Airport Airfield / Forest avoidance
  // Airfield perimeter: lat approx -3.0500 to -3.0300, lon -60.0650 to -60.0380
  const isAirportKeyword = /aeroporto|eduardo gomes|sbeg|\bmao\b|santos dumont|taruma.*aeroporto/.test(norm);
  const isInsideAirfieldZone = (lat <= -3.0300 && lat >= -3.0500 && lon <= -60.0380 && lon >= -60.0650);

  if (isAirportKeyword || isInsideAirfieldZone) {
    if (/teca|cargas|galpao/.test(norm)) {
      return { lat: -3.0388, lon: -60.0452 }; // TECA Cargo entrance (Av. Santos Dumont)
    }
    if (/eduardinho|terminal 2/.test(norm)) {
      return { lat: -3.0425, lon: -60.0545 }; // Terminal 2 (Av. Santos Dumont)
    }
    // Main Passenger Terminal 1 / Dropoff Loop on Av. Santos Dumont (paved access, avoids forest trail behind runway)
    return { lat: -3.0392, lon: -60.0489 };
  }

  // 2. Ponta Negra beach / river centroid snapping
  if (/ponta negra|orla ponta negra|praia ponta negra/.test(norm) && lon < -60.1030) {
    return { lat: -3.0933, lon: -60.1018 }; // Av. Coronel Teixeira
  }

  // 3. Porto de Manaus / Rio Negro centroid snapping
  if (/porto de manaus|porto centro|roadway/.test(norm) && lat < -3.1420) {
    return { lat: -3.1410, lon: -60.0260 }; // Av. Lourenço da Silva Braga
  }

  // 4. UFAM Campus deep forest snapping (Adolfo Ducke reserve border)
  if (/ufam|campus universitario|floresta ufam/.test(norm) && (lat < -3.1020 || lon > -59.9700)) {
    return { lat: -3.0991, lon: -59.9723 }; // Portaria Av. General Rodrigo Otávio
  }

  // 5. Aeroclube do Amazonas (prevent landing on grass runway)
  if (/aeroclube/.test(norm) || (lat <= -3.0690 && lat >= -3.0760 && lon <= -60.0120 && lon >= -60.0210)) {
    return { lat: -3.0725, lon: -60.0160 }; // Av. Prof. Nilton Lins / Flores entrance
  }

  // 6. MUSA / Reserva Ducke (prevent routing into deep jungle trails)
  if (/musa|museu da amazonia|reserva ducke|adolfo ducke/.test(norm) || (lat <= -2.9800 && lat >= -3.0200 && lon <= -59.9200 && lon >= -59.9550)) {
    return { lat: -3.0044, lon: -59.9405 }; // Av. Margarita entrance, Santa Etelvina
  }

  // 7. Parque do Mindú (prevent inner forest snapping)
  if (/mindu|parque do mindu/.test(norm)) {
    return { lat: -3.0772, lon: -60.0035 }; // Rua Perimetral, Parque 10 de Novembro
  }

  // 8. Bosque da Ciência / INPA
  if (/bosque da ciencia|inpa/.test(norm)) {
    return { lat: -3.0975, lon: -59.9875 }; // Av. André Araújo entrance, Petrópolis
  }

  // 9. Porto da Ceasa / Encontro das Águas ferry
  if (/ceasa|porto ceasa|porto da ceasa/.test(norm)) {
    return { lat: -3.1360, lon: -59.9235 }; // BR-319, Mauazinho / Ceasa
  }

  return { lat, lon };
}

export interface ParsedAddressQuery {
  raw: string;
  typedNumber?: string;
  typedComplement?: string;
  typedCep?: string;
  typedWords: string[];
  cleanedRaw: string;
  canonicalQuery: string;
  streetOnlyQuery: string;
}

export function parseQueryTokens(text: string): ParsedAddressQuery {
  const raw = text.trim();
  
  // 1. CEP Extraction (8 digits with optional dots, hyphens, or spaces)
  const cepMatch = raw.match(/\b\d{2}\.?\d{3}[- ]?\d{3}\b/) || raw.match(/\b\d{5}[- ]?\d{3}\b/) || raw.match(/\b\d{8}\b/);
  const typedCep = cepMatch ? formatCep(cepMatch[0].replace(/\D/g, '')) : undefined;

  let textWithoutCep = raw;
  if (cepMatch) {
    textWithoutCep = textWithoutCep.replace(cepMatch[0], ' ');
  }

  // 2. Complement / Lot / Block / Quadra detection
  const compMatch = textWithoutCep.match(/\b(apto|apt|bloco|bl|sala|lote|lt|qd|quadra|km|casa|fundos|sobrado|galpao|galpão|andar|ap)\s*[:.-]?\s*([a-zA-Z0-9]+)\b/i);
  const typedComplement = compMatch ? `${compMatch[1].toUpperCase()} ${compMatch[2]}` : undefined;

  let textWithoutComp = textWithoutCep;
  if (compMatch) {
    textWithoutComp = textWithoutComp.replace(compMatch[0], ' ');
  }

  // 3. House Number detection with flexible prefixes (nº, n°, num, #, no., n-, or standalone digits)
  let typedNumber: string | undefined = undefined;
  
  // First check explicit number patterns like "nº 123", "n° 123", "#123", "num 123", "no. 123", "n 123"
  const explicitNumMatch = textWithoutComp.match(/(?:n[º°\.\s-]*|num[.\s]*|#|no[.\s]*)\s*(\d{1,5}[a-zA-Z]?)\b/i);
  if (explicitNumMatch) {
    typedNumber = explicitNumMatch[1];
  } else {
    // Check for standalone 1-5 digit numbers not equal to current/recent years
    const numMatches = Array.from(textWithoutComp.matchAll(/\b(\d{1,5}[a-zA-Z]?)\b/g)).map(m => m[1]);
    for (const num of numMatches) {
      if (!['2023', '2024', '2025', '2026', '2027'].includes(num) && num.length <= 5) {
        typedNumber = num;
        break;
      }
    }
  }

  // 4. Tokenize for out-of-order fuzzy search
  const cleanedRaw = raw
    .replace(/(?:n[º°\.\s-]*|num[.\s]*|#|no[.\s]*)\s*(\d+)/gi, '$1')
    .replace(/[^\w\s\,-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const typedWords = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !['de', 'da', 'do', 'dos', 'das', 'em', 'no', 'na', 'para', 'com', 'nº', 'num', 'no', 'brasil', 'brazil', 'manaus', 'am'].includes(w));

  // Build a query without the house number for geocoders that choke on unformatted numbers
  let streetOnlyQuery = cleanedRaw;
  if (typedNumber) {
    streetOnlyQuery = streetOnlyQuery.replace(new RegExp(`\\b${typedNumber}\\b`, 'g'), ' ').replace(/\s+/g, ' ').trim();
  }

  // Build canonical structured query
  const canonicalParts: string[] = [];
  if (typedWords.length > 0) {
    canonicalParts.push(typedWords.join(' '));
  }
  if (typedNumber) {
    canonicalParts.push(typedNumber);
  }

  return {
    raw,
    typedNumber,
    typedComplement,
    typedCep,
    typedWords,
    cleanedRaw,
    canonicalQuery: canonicalParts.length > 0 ? canonicalParts.join(', ') : raw,
    streetOnlyQuery: streetOnlyQuery.length >= 2 ? streetOnlyQuery : raw
  };
}

export async function enhancedAutocomplete(
  text: string, 
  latOrProximity?: number | { lat: number, lon: number }, 
  lonParam?: number
): Promise<GeocodeResult[]> {
  if (!text || text.trim().length < 2) return [];

  let lat: number | undefined;
  let lon: number | undefined;
  if (typeof latOrProximity === 'number') {
    lat = latOrProximity;
    lon = lonParam;
  } else if (latOrProximity && typeof latOrProximity === 'object') {
    lat = latOrProximity.lat;
    lon = latOrProximity.lon;
  }
  const normalizedText = text.trim().toLowerCase();
  const parsedQueryInfo = parseQueryTokens(text);
  
  // 1. Check offline registry matches by searching our rich aliases, names, and contexts fuzzily
  const normalizedSearch = normalizedText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const offlineMatches: GeocodeResult[] = [];
  
  if (normalizedSearch.length >= 2) {
    for (const entry of RICH_OFFLINE_REGISTRY) {
      let bestAliasSim = 0;
      for (const alias of entry.aliases) {
        const normAlias = alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const sim = stringSimilarity(normAlias, normalizedSearch);
        if (sim > bestAliasSim) bestAliasSim = sim;
      }

      const nameSim = stringSimilarity(entry.name, normalizedSearch);
      const tokenResult = fuzzyTokenMatch(parsedQueryInfo.typedWords, `${entry.name} ${entry.context} ${entry.aliases.join(' ')}`);

      const maxSim = Math.max(bestAliasSim, nameSim);
      if (maxSim >= 0.65 || tokenResult.ratio >= 0.5) {
        let entryName = entry.name;
        if (parsedQueryInfo.typedNumber && !entryName.includes(parsedQueryInfo.typedNumber)) {
          entryName = `${entry.name}, ${parsedQueryInfo.typedNumber}`;
        }

        const geoBonus = (lat != null && lon != null) ? calculateGeolocationBonus(entry.lat, entry.lon, lat, lon) : 0;
        const confidenceScore = Math.min(100, Math.max(10, Math.round(75 + (maxSim * 15) + (tokenResult.ratio * 10) + geoBonus)));

        offlineMatches.push({
          lat: entry.lat,
          lon: entry.lon,
          name: entryName,
          context: entry.context,
          label: `${entryName} - ${entry.context}`,
          confidenceScore,
          source: 'cache',
          type: 'address'
        });
      }
    }
  }

  // 2. Check Cache
  if (geoCache.has(normalizedText)) {
    return geoCache.get(normalizedText)!;
  }

  // 2.5 Check Persistent IndexedDB Cache
  try {
    const cachedEntry = await db.cache.get(`geo-${normalizedText}`);
    if (cachedEntry && cachedEntry.data) {
      geoCache.set(normalizedText, cachedEntry.data);
      return cachedEntry.data;
    }
  } catch (err) {
    console.warn("Persistent geo cache lookup failed:", err);
  }

  try {
    // Check if input resembles any Brazilian Postal Code (CEP) or partial CEP
    const isCepInput = /\b\d{5}-?\d{3}\b/.test(text) || /\b\d{8}\b/.test(text) || /\b\d{5}\b/.test(text);

    // Default fallback to Manaus only if we don't have proximity AND the string doesn't look like an explicit CEP or state
    if ((lat == null || lon == null) && !isCepInput) {
       const queryNorm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
       const isSearchingOutsideAmazonas = /\b(sp|sao paulo|rj|rio de janeiro|mg|minas gerais|pr|parana|rs|rio grande do sul|sc|santa catarina|df|distrito federal|ce|ceara|pe|pernambuco|ba|bahia|pa|para|go|goias|mt|mato grosso|ms|mato grosso do sul|es|espirito santo|ac|acre|al|alagoas|ap|amapa|ma|maranhao|pb|paraiba|pi|piaui|rn|rio grande do norte|ro|rondonia|rr|roraima|se|sergipe|to|tocantins|curitiba|recife|fortaleza|salvador|brasilia|goiania|belem|rio branco|macapa|maceio|vitoria|sao luis|joao pessoa|teresina|natal|aracaju|palmas)\b/.test(queryNorm);
       
       if (!isSearchingOutsideAmazonas) {
           lat = -3.1116;
           lon = -60.0242;
       }
    }
    
    const hasProximity = (lat != null && lon != null);
    
    let composedQuery = parsedQueryInfo.cleanedRaw;
    if (!text.toLowerCase().includes('brasil') && !text.toLowerCase().includes('br') && !text.toLowerCase().includes('brazil')) {
      const queryLower = text.toLowerCase();
      const hasSpecificLocation = queryLower.includes('manaus') || 
                                  queryLower.includes('itacoatiara') || 
                                  queryLower.includes('manacapuru') || 
                                  queryLower.includes('iranduba') || 
                                  queryLower.includes('careiro') || 
                                  queryLower.includes('rio preto') || 
                                  queryLower.includes('presidente figueiredo') ||
                                  queryLower.includes('rio de janeiro') ||
                                  queryLower.includes('sao paulo') ||
                                  queryLower.includes('amazonas') ||
                                  queryLower.includes('am -') ||
                                  queryLower.includes('am-') ||
                                  /\b(am|sp|rj|mg|pr|rs|sc|go|df)\b/.test(queryLower);
      
      if (!hasSpecificLocation) {
        composedQuery = `${parsedQueryInfo.cleanedRaw}, Manaus, AM, Brasil`;
      } else {
        composedQuery = `${parsedQueryInfo.cleanedRaw}, Brasil`;
      }
    }

    let viaCepResolved = false;
    let resolvedViaCepData: any = null;

    // Detect if search query contains a Brazilian Postal Code (CEP), formatting with or without hyphen
    const cepMatch = text.match(/\b\d{5}-?\d{3}\b/) || text.match(/\b\d{8}\b/);
    if (cepMatch) {
      const cleanCep = cepMatch[0].replace('-', '').replace(/\s+/g, '');
      try {
        const response = await fetch(`/api/viacep?cep=${cleanCep}`);
        if (response.ok) {
          const data = await response.json();
          if (data && !data.erro) {
            resolvedViaCepData = data;
            const textWithoutCep = text.replace(cepMatch[0], '').replace(/,/, ' ').replace(/\s+/g, ' ').trim();
            const allNumbers = Array.from(textWithoutCep.matchAll(/\b\d{1,5}\b/g)).map(m => m[0]);
            
            let streetNumber = parsedQueryInfo.typedNumber || '';
            if (!streetNumber) {
              for (const num of allNumbers) {
                if (data.logradouro && !data.logradouro.toLowerCase().includes(num)) {
                  streetNumber = num;
                  break;
                }
              }
              if (!streetNumber && allNumbers.length > 0) {
                streetNumber = allNumbers[0];
              }
            }

            const parts = [
              data.logradouro ? `${data.logradouro}${streetNumber ? ', ' + streetNumber : ''}` : '',
              data.bairro,
              data.localidade,
              data.uf,
              "Brasil"
            ].filter(Boolean);

            if (parts.length > 2) {
              composedQuery = parts.join(', ');
              viaCepResolved = true;
            }
          }
        }
      } catch (err) {
        console.warn("[Geocode CEP] Erro ao buscar CEP no ViaCEP:", err);
      }
    }

    const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 2500) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) return null;
        return await response.json();
      } catch (err) {
        clearTimeout(id);
        return null;
      }
    };

    const cleanText = encodeURIComponent(composedQuery);
    const viewboxStr = hasProximity ? `&viewbox=${lon! - 0.5},${lat! + 0.5},${lon! + 0.5},${lat! - 0.5}` : '';
    const photonLocation = hasProximity ? `&lat=${lat}&lon=${lon}` : '';

    const results: GeocodeResult[] = [];
    const seenKeys = new Set<string>();

    const addResult = (res: GeocodeResult) => {
      // Enforce Typed Number on address results if user provided a house number
      if (parsedQueryInfo.typedNumber && res.type !== 'poi') {
        const numStr = parsedQueryInfo.typedNumber;
        if (!res.name.includes(numStr)) {
          const oldName = res.name;
          res.name = `${res.name}, ${numStr}`;
          if (res.label.startsWith(oldName)) {
            res.label = res.label.replace(oldName, res.name);
          } else if (!res.label.includes(numStr)) {
            res.label = `${res.name} - ${res.context || ''}`;
          }
        }
      }

      // Enforce Typed Complement if present
      if (parsedQueryInfo.typedComplement && !res.name.includes(parsedQueryInfo.typedComplement)) {
        res.name = `${res.name} (${parsedQueryInfo.typedComplement})`;
        if (!res.label.includes(parsedQueryInfo.typedComplement)) {
          res.label = `${res.name} - ${res.context || ''}`;
        }
      }

      // CEP formatting
      const inputFullCep = (viaCepResolved && resolvedViaCepData?.cep) 
        ? formatCep(resolvedViaCepData.cep) 
        : (cepMatch ? formatCep(cepMatch[0]) : null);

      if (inputFullCep && inputFullCep.replace(/\D/g, '').length === 8) {
        if (!res.cep || res.cep.replace(/\D/g, '').length < 8) {
          res.cep = inputFullCep;
        } else {
          res.cep = formatCep(res.cep);
        }
      } else {
        if (!res.cep) {
          const regexCep = /\b\d{5}-?\d{3}\b/;
          const matchLabel = res.label?.match(regexCep);
          if (matchLabel) {
            res.cep = formatCep(matchLabel[0]);
          } else if (viaCepResolved && resolvedViaCepData?.cep) {
            res.cep = resolvedViaCepData.cep;
          } else if (cepMatch) {
            res.cep = formatCep(cepMatch[0]);
          }
        } else {
          res.cep = formatCep(res.cep);
        }
      }

      // Sanitize coordinates to prevent routing into forests / unpaved runways
      const sanitized = sanitizeDrivableCoordinates(res.lat, res.lon, `${res.name} ${res.label} ${res.context || ''}`);
      res.lat = sanitized.lat;
      res.lon = sanitized.lon;

      const normLabel = normalizeForDedup(res.label);
      const normName = normalizeForDedup(res.name);
      
      if (res.cep) {
        const cleanCepStr = res.cep.replace('-', '');
        if (!res.label.replace('-', '').includes(cleanCepStr)) {
            if (res.label.endsWith(', Brasil') || res.label.endsWith(', Brazil')) {
                res.label = res.label.replace(/, (Brasil|Brazil)$/i, ` - CEP ${res.cep}`);
            } else {
                res.label = `${res.label} - CEP ${res.cep}`;
            }
        }
      }

      const latGrid = Math.floor(res.lat * 10000);
      const lonGrid = Math.floor(res.lon * 10000);
      
      const dedupKeyNameCoord = `${normName}-${latGrid},${lonGrid}`;
      const dedupKeyLabel = `label-${normLabel}`;

      if (!seenKeys.has(dedupKeyNameCoord) && !seenKeys.has(dedupKeyLabel)) {
        seenKeys.add(dedupKeyNameCoord);
        seenKeys.add(dedupKeyLabel);
        results.push(res);
      }
    };

    offlineMatches.forEach(addResult);

    const hasNumber = Boolean(parsedQueryInfo.typedNumber);
    const isCompanyOrPOI = /loja|empresa|praça|parque|hospital|restaurante|escola|shopping|supermercado|posto|banco|academia|hotel|aeroporto/i.test(composedQuery);

    const orsParams: any = {
      text: composedQuery,
      size: '10',
      'boundary.country': 'BRA'
    };
    if (hasProximity) {
        orsParams['focus.point.lat'] = lat?.toString();
        orsParams['focus.point.lon'] = lon?.toString();
    }

    const mapboxQs = new URLSearchParams({ q: composedQuery });
    if (hasProximity && lat && lon) {
      mapboxQs.append('lat', lat.toString());
      mapboxQs.append('lon', lon.toString());
    }

    const googleQs = new URLSearchParams({ input: text });
    if (hasProximity && lat && lon) {
      googleQs.append('lat', lat.toString());
      googleQs.append('lon', lon.toString());
    }

    // Parallelize search requests to all geocoding services with 2.5s timeouts
    const providers = [
      // 0. Google Places Autocomplete API
      fetchWithTimeout(`/api/places/google-autocomplete?${googleQs.toString()}`),

      // 1. Mapbox API 
      fetchWithTimeout(`/api/places/search?${mapboxQs.toString()}`),

      // 2. OpenRouteService 
      fetchWithTimeout('/api/ors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: hasNumber && !isCompanyOrPOI ? 'geocode/search' : 'geocode/autocomplete',
          params: orsParams
        })
      }),

      // 3. Nominatim (OSM Geocoder)
      fetchWithTimeout(`/api/places/osm?type=nominatim&q=${cleanText}${viewboxStr}`),

      // 4. Photon (Fast fuzzy search)
      fetchWithTimeout(`/api/places/osm?type=photon&q=${cleanText}${photonLocation}`),

      // 5. Open-Meteo Geocoding API (Fast global & Brazil admin/city/postcode lookup)
      fetchWithTimeout(`/api/places/open-meteo?q=${encodeURIComponent(text)}${hasProximity ? `&lat=${lat}&lon=${lon}` : ''}`)
    ];

    const [googleRes, mapboxRes, orsRes, nomRes, phoRes, openMeteoRes] = await Promise.all(providers);

    // Parse Google Places & Autocomplete API results
    if (googleRes && Array.isArray(googleRes.places)) {
      googleRes.places.forEach((p: any) => {
        const isPOI = p.types?.some((t: string) =>
          ['establishment', 'point_of_interest', 'premise', 'airport', 'hospital', 'shopping_mall', 'food', 'store', 'restaurant', 'lodging', 'gas_station', 'bank', 'supermarket', 'pharmacy', 'school', 'university'].includes(t)
        );

        const mainTitle = p.displayName?.text || p.structured?.mainText || '';
        const route = p.structured?.route || '';
        const streetNum = p.structured?.streetNumber || '';
        const sublocality = p.structured?.sublocality || '';
        const locality = p.structured?.locality || '';
        const adminArea = p.structured?.adminArea || '';
        const cep = p.cep || p.structured?.postalCode || '';

        // Determine exact street + house number component
        let streetAndNum = '';
        if (mainTitle && !isPOI) {
          streetAndNum = mainTitle;
          if (streetNum && !streetAndNum.includes(streetNum)) {
            streetAndNum += `, ${streetNum}`;
          } else if (parsedQueryInfo.typedNumber && !streetAndNum.includes(parsedQueryInfo.typedNumber)) {
            streetAndNum += `, ${parsedQueryInfo.typedNumber}`;
          }
        } else if (route) {
          streetAndNum = route;
          if (streetNum) {
            streetAndNum += `, ${streetNum}`;
          } else if (parsedQueryInfo.typedNumber && !streetAndNum.includes(parsedQueryInfo.typedNumber)) {
            streetAndNum += `, ${parsedQueryInfo.typedNumber}`;
          }
        } else if (mainTitle) {
          streetAndNum = mainTitle;
          if (parsedQueryInfo.typedNumber && !streetAndNum.includes(parsedQueryInfo.typedNumber)) {
            streetAndNum += `, ${parsedQueryInfo.typedNumber}`;
          }
        }

        // Attach typed complement if user provided one (e.g. Apto 101, Bloco A, Sala 3)
        if (parsedQueryInfo.typedComplement && streetAndNum && !streetAndNum.toLowerCase().includes(parsedQueryInfo.typedComplement.toLowerCase())) {
          streetAndNum += ` (${parsedQueryInfo.typedComplement})`;
        }

        // Build neighborhood, city, and state context
        const contextParts: string[] = [];
        if (sublocality) contextParts.push(sublocality);
        if (locality) {
          if (adminArea) {
            contextParts.push(`${locality} - ${adminArea}`);
          } else {
            contextParts.push(locality);
          }
        } else if (adminArea) {
          contextParts.push(adminArea);
        }
        const contextStr = contextParts.join(', ');

        // Format primary name and full display label
        let primaryName = '';
        let fullLabel = '';

        if (isPOI && mainTitle && mainTitle !== route) {
          // Establishment / Venue name + street address
          if (streetAndNum && streetAndNum !== mainTitle) {
            primaryName = `${mainTitle} - ${streetAndNum}`;
          } else {
            primaryName = mainTitle;
          }
        } else {
          // Exact street address
          primaryName = streetAndNum || mainTitle || 'Endereço';
        }

        if (contextStr) {
          fullLabel = `${primaryName} - ${contextStr}`;
        } else {
          fullLabel = primaryName;
        }

        const finalCep = cep || parsedQueryInfo.typedCep;
        if (finalCep && !fullLabel.includes(finalCep)) {
          fullLabel += ` - CEP ${formatCep(finalCep)}`;
        }

        addResult({
          lat: p.location?.latitude || 0,
          lon: p.location?.longitude || 0,
          name: primaryName,
          context: contextStr || p.formattedAddress || '',
          label: fullLabel,
          confidenceScore: 100, // Top priority for Google Places
          source: 'google',
          type: isPOI ? 'poi' : 'address',
          cep: finalCep
        });
      });
    }

    // Parse Mapbox API
    if (mapboxRes?.features) {
      mapboxRes.features.forEach((f: any) => {
        const isPOI = f.place_type?.includes('poi') || f.id?.startsWith('poi.');
        const contextText = f.context ? f.context.map((c: any) => c.text).join(', ') : f.place_name.replace(`${f.text}, `, '');
        
        let score = 95; // Base high priority
        if (isPOI) score += 3;

        let name = f.text;
        if (f.address) {
          name = `${f.text}, ${f.address}`;
          score += 15; // Exact house number matched by Mapbox!
        } else if (parsedQueryInfo.typedNumber) {
          if (!name.includes(parsedQueryInfo.typedNumber)) {
            name = `${f.text}, ${parsedQueryInfo.typedNumber}`;
            score += 10;
          }
        }

        if (parsedQueryInfo.typedComplement && !name.includes(parsedQueryInfo.typedComplement)) {
          name += ` (${parsedQueryInfo.typedComplement})`;
        }

        const mapboxPc = f.context?.find((c: any) => c.id?.startsWith('postcode'))?.text;
        const formattedLabel = `${name} - ${contextText}${mapboxPc ? ` - CEP ${formatCep(mapboxPc)}` : ''}`;

        addResult({
          lat: f.center[1], // Mapbox uses [lon, lat]
          lon: f.center[0],
          name: name,
          context: contextText,
          label: formattedLabel,
          confidenceScore: score,
          source: 'mapbox',
          type: isPOI ? 'poi' : 'address',
          cep: mapboxPc
        });
      });
    }

    // Parse OpenRouteService Geocoding/Autocomplete
    if (orsRes?.features) {
      orsRes.features.forEach((f: any) => {
        const props = f.properties;
        const details = [props.neighbourhood, props.locality, props.region].filter(Boolean).join(' - ');
        
        let score = props.confidence ? props.confidence * 100 : 85;
        const isPOI = props.layer === 'venue' || props.layer === 'poi';
        if (isPOI) score += 5;

        let name = props.name || props.label.split(',')[0];
        if (props.street && props.housenumber) {
          name = `${props.street}, ${props.housenumber}`;
          score += 20; // Verified housenumber
        } else if (props.housenumber) {
          name = `${name}, ${props.housenumber}`;
          score += 15;
        } else if (parsedQueryInfo.typedNumber) {
          if (props.street) {
            name = `${props.street}, ${parsedQueryInfo.typedNumber}`;
          } else if (!name.includes(parsedQueryInfo.typedNumber)) {
            name = `${name}, ${parsedQueryInfo.typedNumber}`;
          }
          score += 10;
        }

        if (parsedQueryInfo.typedComplement && !name.includes(parsedQueryInfo.typedComplement)) {
          name += ` (${parsedQueryInfo.typedComplement})`;
        }

        const formattedLabel = `${name} - ${details || props.label}${props.postalcode ? ` - CEP ${formatCep(props.postalcode)}` : ''}`;

        addResult({
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          name: name,
          context: (isPOI && props.street ? `${props.street}, ${details}` : details) || props.label,
          label: formattedLabel,
          confidenceScore: Math.min(score, 100),
          source: 'ors',
          type: isPOI ? 'poi' : 'address',
          cep: props.postalcode
        });
      });
    }

    // Parse Nominatim (OSM Geocoder)
    if (Array.isArray(nomRes)) {
      nomRes.forEach((item: any) => {
        const addr = item.address;
        const type = item.type || '';
        const osmClass = item.class || '';
        
        const isPOI = !['highway', 'place', 'boundary', 'house', 'building', 'street', 'administrative'].includes(type) && 
                      !['highway', 'place', 'boundary'].includes(osmClass);
        
        const details = [addr?.suburb || addr?.neighbourhood, addr?.city || addr?.town, addr?.state].filter(Boolean).join(' - ');
        
        let name = item.display_name.split(',')[0];
        let score = 80; // Baseline
        if (item.type === 'house' || item.type === 'building') {
          score = 95;
        }

        if (addr?.road) {
          if (addr.house_number) {
            name = `${addr.road}, ${addr.house_number}`;
            score += 20; // Highly precise house matching
          } else {
            name = addr.road;
            if (parsedQueryInfo.typedNumber) {
              name = `${addr.road}, ${parsedQueryInfo.typedNumber}`;
              score += 10;
            }
          }
        }

        if (parsedQueryInfo.typedComplement && !name.includes(parsedQueryInfo.typedComplement)) {
          name += ` (${parsedQueryInfo.typedComplement})`;
        }
        
        if (isPOI) score += 8;

        const formattedLabel = `${name} - ${details || item.display_name}${addr?.postcode ? ` - CEP ${formatCep(addr.postcode)}` : ''}`;

        addResult({
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          name: name,
          context: (isPOI && addr?.road ? `${addr.road}, ${details}` : details) || item.display_name,
          label: formattedLabel,
          confidenceScore: Math.min(score, 100),
          source: 'nominatim',
          type: isPOI ? 'poi' : 'address',
          cep: addr?.postcode
        });
      });
    }

    // Parse Photon (Fast fuzzy address search server)
    if (phoRes?.features) {
      phoRes.features.forEach((f: any) => {
        const props = f.properties;
        const details = [props.district, props.city, props.state].filter(Boolean).join(' - ');
        const isPOI = !['highway', 'place', 'boundary', 'street'].includes(props.osm_key) && props.name !== props.street;
        
        let score = 70; // Baseline
        if (isPOI) score += 8;

        let name = props.name || props.street || 'Endereço';
        if (props.street && props.housenumber) {
          name = `${props.street}, ${props.housenumber}`;
          score += 15;
        } else if (parsedQueryInfo.typedNumber) {
          if (props.street) {
            name = `${props.street}, ${parsedQueryInfo.typedNumber}`;
          } else if (!name.includes(parsedQueryInfo.typedNumber)) {
            name = `${name}, ${parsedQueryInfo.typedNumber}`;
          }
          score += 10;
        }

        if (parsedQueryInfo.typedComplement && !name.includes(parsedQueryInfo.typedComplement)) {
          name += ` (${parsedQueryInfo.typedComplement})`;
        }

        const formattedLabel = `${name} - ${details}${props.postcode ? ` - CEP ${formatCep(props.postcode)}` : ''}`;

        addResult({
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          name: name,
          context: details,
          label: formattedLabel,
          confidenceScore: score,
          source: 'photon',
          type: isPOI ? 'poi' : 'address',
          cep: props.postcode
        });
      });
    }

    // Parse Open-Meteo Geocoding results
    if (openMeteoRes?.results && Array.isArray(openMeteoRes.results)) {
      openMeteoRes.results.forEach((item: any) => {
        let name = item.name || '';
        if (parsedQueryInfo.typedNumber && !name.includes(parsedQueryInfo.typedNumber)) {
          name = `${name}, ${parsedQueryInfo.typedNumber}`;
        }
        if (parsedQueryInfo.typedComplement && !name.includes(parsedQueryInfo.typedComplement)) {
          name += ` (${parsedQueryInfo.typedComplement})`;
        }

        const details = [item.city && item.city !== item.name ? item.city : null, item.state, item.country].filter(Boolean).join(' - ');
        const postCode = (Array.isArray(item.postcodes) && item.postcodes.length > 0) ? item.postcodes[0] : parsedQueryInfo.typedCep;
        const formattedLabel = `${name} - ${details}${postCode ? ` - CEP ${formatCep(postCode)}` : ''}`;

        let score = 75;
        if (item.population && item.population > 100000) score += 10;
        if (hasProximity && lat && lon) {
          const distKm = geoDistanceMeters(item.latitude, item.longitude, lat, lon) / 1000;
          if (distKm <= 50) score += 15;
        }

        addResult({
          lat: item.latitude,
          lon: item.longitude,
          name: name,
          context: details,
          label: formattedLabel,
          confidenceScore: score,
          source: 'open-meteo',
          type: 'address',
          cep: postCode
        });
      });
    }

    // Dynamic Multi-Factor Scorer and Ranking Algorithm with Fuzzy Search & Geolocation Prioritization
    const queryNorm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const isExplicitLocationInQuery = /\b(sp|sao paulo|rj|rio de janeiro|mg|minas gerais|pr|parana|rs|rio grande do sul|sc|santa catarina|df|distrito federal|ce|ceara|pe|pernambuco|ba|bahia|pa|para|go|goias|mt|mato grosso|ms|mato grosso do sul|es|espirito santo|ac|acre|al|alagoas|ap|amapa|ma|maranhao|pb|paraiba|pi|piaui|rn|rio grande do norte|ro|rondonia|rr|roraima|se|sergipe|to|tocantins|curitiba|recife|fortaleza|salvador|brasilia|goiania|belem|rio branco|macapa|maceio|vitoria|sao luis|joao pessoa|teresina|natal|aracaju|palmas)\b/.test(queryNorm);

    results.forEach(r => {
      let boost = 0;
      const rLabelNorm = r.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const rNameNorm = r.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // 1. Token-level fuzzy search matching
      if (parsedQueryInfo.typedWords.length > 0) {
        const tokenMatch = fuzzyTokenMatch(parsedQueryInfo.typedWords, `${r.name} ${r.label} ${r.context}`);
        boost += tokenMatch.ratio * 35; // Up to 35 points for token coverage
        if (tokenMatch.totalScore > 0) {
          boost += (tokenMatch.totalScore / parsedQueryInfo.typedWords.length) * 10;
        }
      }

      // 2. House number matching boost
      if (parsedQueryInfo.typedNumber) {
        if (rLabelNorm.includes(parsedQueryInfo.typedNumber.toLowerCase()) || rNameNorm.includes(parsedQueryInfo.typedNumber.toLowerCase())) {
          boost += 20;
        }
      }

      // 3. CEP matching boost
      if (parsedQueryInfo.typedCep) {
        const cleanCep = parsedQueryInfo.typedCep.replace('-', '');
        if (rLabelNorm.replace('-', '').includes(cleanCep) || (r.cep && r.cep.replace('-', '') === cleanCep)) {
          boost += 35;
        }
      }

      // 4. Geolocation Proximity Bonus / Penalty
      if (hasProximity && lat && lon) {
        const geoBonus = calculateGeolocationBonus(r.lat, r.lon, lat, lon, isExplicitLocationInQuery);
        boost += geoBonus;
      }

      // 5. ViaCEP Logradouro & Bairro accuracy matching boost
      if (viaCepResolved && resolvedViaCepData) {
        if (resolvedViaCepData.bairro) {
          const normBairro = resolvedViaCepData.bairro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const bairroSim = stringSimilarity(normBairro, rLabelNorm);
          if (bairroSim >= 0.70 || rLabelNorm.includes(normBairro)) {
            boost += 25;
          }
        }
        if (resolvedViaCepData.logradouro) {
          const normLogradouro = resolvedViaCepData.logradouro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const logSim = stringSimilarity(normLogradouro, rLabelNorm);
          if (logSim >= 0.70 || rLabelNorm.includes(normLogradouro)) {
            boost += 30;
          }
        }
      }

      // 6. POI query matching boost
      if (parsedQueryInfo.typedWords.some(w => /hospital|shopping|posto|parque|restaurante|clube|escola|colêgio|hotel|praça|teatro|museu|estação|terminal|aeroporto|loja|supermercado|condomínio|edifício|bemol/i.test(w)) && r.type === 'poi') {
        boost += 15;
      }

      // 7. Demote administrative or coarse results unless query was short
      const isCoarse = /state|country|region|administrative|municipality|state_district/i.test(r.type || '');
      if (parsedQueryInfo.typedWords.length > 2 && isCoarse) {
        boost -= 40;
      }

      r.confidenceScore = Math.max(0, Math.min(100, Math.round(r.confidenceScore + boost)));
    });

    // If ViaCEP / BrasilAPI successfully resolved this Brazilian CEP, let's inject a perfect, high-confidence prediction at the very top of results
    if (viaCepResolved && resolvedViaCepData) {
      let bestLat = (resolvedViaCepData.lat && resolvedViaCepData.lon) ? resolvedViaCepData.lat : 0;
      let bestLon = (resolvedViaCepData.lat && resolvedViaCepData.lon) ? resolvedViaCepData.lon : 0;
      
      if (bestLat === 0 || bestLon === 0) {
        const geoResult = results.find(r => r.lat !== 0 && r.lon !== 0);
        if (geoResult) {
          bestLat = geoResult.lat;
          bestLon = geoResult.lon;
        }
      }
      
      // If no provider returned valid coordinates yet, perform a direct geocode attempt
      if (bestLat === 0 || bestLon === 0) {
        try {
          const directGeo = await preciseGeocode(composedQuery);
          if (directGeo && directGeo.lat !== 0 && directGeo.lon !== 0) {
            bestLat = directGeo.lat;
            bestLon = directGeo.lon;
          }
        } catch (err) {
          console.warn("[Geocode CEP] Direct geocode fallback error:", err);
        }
      }

      // If still 0, fall back to proximity coordinates or Manaus center
      if (bestLat === 0 || bestLon === 0) {
        bestLat = lat || -3.1116;
        bestLon = lon || -60.0242;
      }

      const cepFormatted = formatCep(resolvedViaCepData.cep) || resolvedViaCepData.cep;
      
      // Find a house number in the typed text or parsed query
      let streetNumber = parsedQueryInfo.typedNumber || '';
      if (!streetNumber && cepMatch) {
        const allNumbers = Array.from(text.replace(cepMatch[0], '').matchAll(/\b\d{1,5}\b/g)).map(m => m[0]);
        for (const num of allNumbers) {
          if (resolvedViaCepData.logradouro && !resolvedViaCepData.logradouro.toLowerCase().includes(num)) {
            streetNumber = num;
            break;
          }
        }
        if (!streetNumber && allNumbers.length > 0) {
          streetNumber = allNumbers[0];
        }
      }

      const street = resolvedViaCepData.logradouro || '';
      let streetWithNum = street ? (streetNumber ? `${street}, ${streetNumber}` : street) : '';
      if (parsedQueryInfo.typedComplement && streetWithNum) {
        streetWithNum += ` (${parsedQueryInfo.typedComplement})`;
      }

      const bairro = resolvedViaCepData.bairro || '';
      const city = resolvedViaCepData.localidade || 'Manaus';
      const uf = resolvedViaCepData.uf || 'AM';
      
      const labelParts = [
        streetWithNum || `CEP ${cepFormatted}`,
        bairro,
        `${city} - ${uf}`,
        `CEP ${cepFormatted}`
      ].filter(Boolean);
      
      const exactLabel = labelParts.join(', ');
      
      const exactResult: GeocodeResult = {
        lat: bestLat,
        lon: bestLon,
        name: streetWithNum || `CEP ${cepFormatted}`,
        context: [bairro, `${city} - ${uf}`].filter(Boolean).join(', '),
        label: exactLabel,
        confidenceScore: 999, // Absolute top score
        source: 'viacep',
        type: 'address',
        cep: cepFormatted
      };

      // Remove any other duplicate items with very close coordinates from the list to avoid duplicate listings
      const filteredResults = results.filter(r => {
        if (r.source === 'viacep') return false;
        const latDiff = Math.abs(r.lat - bestLat);
        const lonDiff = Math.abs(r.lon - bestLon);
        return !(latDiff < 0.0005 && lonDiff < 0.0005);
      });

      // Clear and rebuild with ViaCEP exact match at index 0
      results.length = 0;
      results.push(exactResult, ...filteredResults);
    } else if (results.length === 0 && (parsedQueryInfo.typedNumber || parsedQueryInfo.typedWords.length >= 2)) {
      // Emergency fallback if all third party autocomplete APIs returned empty for a typed address with number
      try {
        const fallbackGeo = await preciseGeocode(composedQuery);
        if (fallbackGeo && fallbackGeo.lat !== 0 && fallbackGeo.lon !== 0) {
          addResult(fallbackGeo);
        }
      } catch (err) {
        console.warn("Emergency geocode fallback failed:", err);
      }
    }

    // Sort by confidenceScore falling
    results.sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Multi-factor Deduplication Pass: Remove duplicate addresses & near-identical venue results
    const cleanDeduplicated: GeocodeResult[] = [];
    for (const candidate of results) {
      const candNormName = normalizeForDedup(candidate.name);
      const candNormLabel = normalizeForDedup(candidate.label);

      let isDuplicate = false;
      for (let i = 0; i < cleanDeduplicated.length; i++) {
        const existing = cleanDeduplicated[i];
        const existingNormName = normalizeForDedup(existing.name);
        const existingNormLabel = normalizeForDedup(existing.label);

        // 1. Exact or near-identical normalized label or name match
        const labelSimilarity = candNormLabel === existingNormLabel || 
          (candNormLabel.length > 5 && existingNormLabel.length > 5 && (candNormLabel.includes(existingNormLabel) || existingNormLabel.includes(candNormLabel)));
        const nameSimilarity = candNormName.length > 2 && (candNormName === existingNormName || candNormName.replace(/\s+/g, '') === existingNormName.replace(/\s+/g, ''));

        if (labelSimilarity || nameSimilarity) {
          isDuplicate = true;
          if (candidate.confidenceScore > existing.confidenceScore || 
             (candidate.confidenceScore === existing.confidenceScore && candidate.label.length > existing.label.length)) {
            cleanDeduplicated[i] = candidate;
          }
          break;
        }

        // 2. Spatial proximity check (< 300 meters) with overlapping primary tokens
        if (candidate.lat !== 0 && candidate.lon !== 0 && existing.lat !== 0 && existing.lon !== 0) {
          const distMeters = geoDistanceMeters(candidate.lat, candidate.lon, existing.lat, existing.lon);
          if (distMeters < 300) {
            const nameOverlap = candNormName.includes(existingNormName) || existingNormName.includes(candNormName);
            if (nameOverlap) {
              isDuplicate = true;
              if (candidate.confidenceScore > existing.confidenceScore) {
                cleanDeduplicated[i] = candidate;
              }
              break;
            }
          }
        }
      }

      if (!isDuplicate) {
        cleanDeduplicated.push(candidate);
      }
    }

    // Sort primarily by confidenceScore, with proximity boost as tie-breaker
    cleanDeduplicated.sort((a, b) => {
      if (b.confidenceScore !== a.confidenceScore) {
        return b.confidenceScore - a.confidenceScore;
      }
      if (hasProximity && lat && lon) {
        const distA = geoDistanceMeters(a.lat, a.lon, lat, lon);
        const distB = geoDistanceMeters(b.lat, b.lon, lat, lon);
        return distA - distB;
      }
      return 0;
    });

    const finalResults = cleanDeduplicated.slice(0, 8);
    
    if (finalResults.length > 0) {
      geoCache.set(normalizedText, finalResults);
      // Save to IndexedDB persistent store (cache TTL: 14 days)
      try {
        db.cache.put({
          key: `geo-${normalizedText}`,
          data: finalResults,
          ttl: Date.now() + 1000 * 60 * 60 * 24 * 14
        }).catch(e => console.warn("Dexie put cache failed", e));
      } catch (err) {
        console.warn("Persistent geo cache saving failed:", err);
      }
    }
    
    return finalResults;
  } catch (error) {
    console.error("Geocoding engine failed:", error);
    return [];
  }
}

export async function preciseGeocode(address: string): Promise<GeocodeResult> {
  // Try Google Geocoding API (using Places new Text Search under the hood for stability)
  try {
    const res = await fetch(`/api/places/google-geocode?address=${encodeURIComponent(address)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.places && data.places.length > 0) {
        const item = data.places[0];
        const location = item.location;
        const isPOI = item.types?.some((t: string) => ['establishment', 'point_of_interest', 'premise', 'airport', 'hospital'].includes(t));
        const sanitized = sanitizeDrivableCoordinates(location.latitude, location.longitude, `${item.displayName?.text || ''} ${item.formattedAddress || ''} ${address}`);
        return {
          lat: sanitized.lat,
          lon: sanitized.lon,
          name: item.displayName?.text || address.split(',')[0],
          context: item.formattedAddress || address,
          label: address,
          confidenceScore: 100,
          source: 'google',
          type: isPOI ? 'poi' : 'address',
          cep: item.cep
        };
      }
    }
  } catch (error) {
    console.warn("Google Geocoding failed, falling back to other providers...", error);
  }


  // Fallback to active geocoding providers - Filtra resultados placeholder sem coordenadas reais (0, 0)
  const results = await enhancedAutocomplete(address);
  const validResults = results.filter(r => r.lat !== 0 || r.lon !== 0);
  if (validResults.length > 0) {
    return validResults[0]; // Highest confidence result with real coordinates
  }
  throw new Error(`Não foi possível encontrar as coordenadas para: ${address}`);
}

export interface ReferencePointResult {
  fullLabel: string;
  landmarkName: string;
  streetAddress: string;
  distanceMeters: number;
  lat: number;
  lon: number;
  nearbyRecommendations?: Array<{
    name: string;
    type: string;
    distanceMeters: number;
    address: string;
    fullLabel: string;
    lat: number;
    lon: number;
  }>;
}

export async function getNearbyReferenceRecommendations(lat: number, lon: number): Promise<Array<{
  name: string;
  type: string;
  distanceMeters: number;
  address: string;
  fullLabel: string;
  lat: number;
  lon: number;
}>> {
  const recommendations: Array<{
    name: string;
    type: string;
    distanceMeters: number;
    address: string;
    fullLabel: string;
    lat: number;
    lon: number;
  }> = [];

  // Primary: Fetch nearby commercial points of reference via Google Places API Proxy
  try {
    const googleRes = await fetch(`/api/places/google-nearby?lat=${lat}&lng=${lon}&radius=1000`);
    if (googleRes.ok) {
      const googleData = await googleRes.json();
      if (googleData.places && Array.isArray(googleData.places) && googleData.places.length > 0) {
        for (const p of googleData.places) {
          const itemLat = p.location?.lat || lat;
          const itemLon = p.location?.lng || lon;
          const dist = geoDistanceMeters(lat, lon, itemLat, itemLon);
          const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)}m`;

          recommendations.push({
            name: p.name,
            type: p.type || 'Ponto de Referência Google',
            distanceMeters: dist,
            address: p.address,
            fullLabel: `${p.name} (${p.address ? p.address + ' - ' : ''}a ${distStr})`,
            lat: itemLat,
            lon: itemLon
          });
        }
        if (recommendations.length > 0) {
          return recommendations.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 8);
        }
      }
    }
  } catch (err) {
    console.warn("Google Places nearby search error, using fallback:", err);
  }

  // Secondary Fallback 1: Check local rich offline registry for closest commercial & logistics landmarks
  const nearbyRegistry = RICH_OFFLINE_REGISTRY.map(entry => ({
    ...entry,
    dist: geoDistanceMeters(lat, lon, entry.lat, entry.lon)
  })).sort((a, b) => a.dist - b.dist);

  for (const item of nearbyRegistry.slice(0, 3)) {
    if (item.dist <= 5000) {
      const distStr = item.dist >= 1000 ? `${(item.dist / 1000).toFixed(1)} km` : `${Math.round(item.dist)}m`;
      recommendations.push({
        name: item.name,
        type: 'Ponto de Referência / Hub',
        distanceMeters: item.dist,
        address: item.context,
        fullLabel: `${item.name} (${item.context} - a ${distStr})`,
        lat: item.lat,
        lon: item.lon
      });
    }
  }

  // Secondary Fallback 2: OpenStreetMap Nominatim POI search
  try {
    const poiCategories = ['supermarket', 'convenience', 'bakery', 'pharmacy', 'fuel', 'school'];
    for (const cat of poiCategories.slice(0, 3)) {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cat}&lat=${lat}&lon=${lon}&radius=800&limit=3&addressdetails=1`, {
        headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            const itemLat = parseFloat(item.lat);
            const itemLon = parseFloat(item.lon);
            const dist = geoDistanceMeters(lat, lon, itemLat, itemLon);
            const poiName = item.display_name.split(',')[0];
            const road = item.address?.road || item.address?.suburb || '';
            const suburb = item.address?.suburb || item.address?.neighbourhood || '';
            const city = item.address?.city || item.address?.town || 'Manaus';
            const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)}m`;

            const typeLabel = cat === 'convenience' || cat === 'supermarket' ? 'Mercadinho / Conveniência' :
                             cat === 'fuel' ? 'Posto de Combustível' :
                             cat === 'bakery' ? 'Padaria' :
                             cat === 'pharmacy' ? 'Drogaria' : 'Estabelecimento Local';

            if (dist <= 2500 && !recommendations.some(r => r.name.toLowerCase() === poiName.toLowerCase())) {
              recommendations.push({
                name: poiName,
                type: typeLabel,
                distanceMeters: dist,
                address: `${road}${suburb ? ', ' + suburb : ''}, ${city}`,
                fullLabel: `${poiName} (${road ? road + ', ' : ''}${suburb ? suburb + ' - ' : ''}a ${distStr})`,
                lat: itemLat,
                lon: itemLon
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("POI search error:", err);
  }

  // Sort all recommendations by distance
  return recommendations.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 6);
}

export async function getNearestReferencePoint(lat: number, lon: number): Promise<ReferencePointResult> {
  let closestLandmark: RegistryEntry | null = null;
  let minLandmarkDist = Infinity;

  for (const entry of RICH_OFFLINE_REGISTRY) {
    const dist = geoDistanceMeters(lat, lon, entry.lat, entry.lon);
    if (dist < minLandmarkDist) {
      minLandmarkDist = dist;
      closestLandmark = entry;
    }
  }

  let road = '';
  let number = '';
  let suburb = '';
  let city = 'Manaus';
  let state = 'AM';
  let formattedGoogleAddress = '';

  // Primary Engine: Google Geocoding Reverse Proxy
  try {
    const gRes = await fetch(`/api/places/google-reverse?lat=${lat}&lng=${lon}`);
    if (gRes.ok) {
      const gData = await gRes.json();
      if (gData && !gData.error) {
        road = gData.road || '';
        number = gData.number || '';
        suburb = gData.suburb || '';
        city = gData.city || 'Manaus';
        state = gData.state || 'AM';
        formattedGoogleAddress = gData.formattedAddress || '';
      }
    }
  } catch (err) {
    console.warn("Google Reverse Geocode proxy fetch error, trying fallback:", err);
  }

  // Fallback if Google Reverse failed
  if (!road && !formattedGoogleAddress) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'pt-BR,pt;q=0.9' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          road = data.address.road || data.address.pedestrian || data.address.suburb || '';
          suburb = data.address.suburb || data.address.neighbourhood || data.address.residential || '';
          city = data.address.city || data.address.town || data.address.municipality || 'Manaus';
          state = data.address.state || 'AM';
        }
      }
    } catch (err) {
      console.warn("Reverse geocode fallback fetch error:", err);
    }
  }

  const recommendations = await getNearbyReferenceRecommendations(lat, lon);
  const bestPoi = recommendations.length > 0 ? recommendations[0] : null;

  const landmarkName = bestPoi ? bestPoi.name : (closestLandmark ? closestLandmark.name : 'Ponto de Apoio');
  const streetAddress = road ? `${road}${number ? ', ' + number : ''}${suburb ? ' - ' + suburb : ''}` : (formattedGoogleAddress || 'Sua Posição GPS');

  let fullLabel = '';

  if (bestPoi && bestPoi.distanceMeters <= 1500) {
    // Top recommended nearby commercial landmark via Google Places (e.g. Mercadinho, Posto, Padaria)
    const distFormatted = bestPoi.distanceMeters >= 1000 
      ? `${(bestPoi.distanceMeters / 1000).toFixed(1)} km` 
      : `${Math.round(bestPoi.distanceMeters)}m`;
    if (road) {
      fullLabel = `${road}${number ? ', ' + number : ''}${suburb ? ' - ' + suburb : ''}, ${city} (Ref: ${bestPoi.name} - a ${distFormatted})`;
    } else {
      fullLabel = `${bestPoi.name} - ${bestPoi.address || 'Próximo'} (a ${distFormatted})`;
    }
  } else if (closestLandmark && minLandmarkDist <= 500) {
    // User is right at the landmark
    fullLabel = `${closestLandmark.name} - ${closestLandmark.context}`;
  } else if (closestLandmark && minLandmarkDist <= 3000) {
    // User is within 3km of a known reference point
    const distFormatted = minLandmarkDist >= 1000 ? `${(minLandmarkDist / 1000).toFixed(1)} km` : `${Math.round(minLandmarkDist)}m`;
    if (road) {
      fullLabel = `${road}${number ? ', ' + number : ''}${suburb ? ' - ' + suburb : ''}, ${city} (Próximo a ${closestLandmark.name} - ${distFormatted})`;
    } else {
      fullLabel = `${closestLandmark.name} (Próximo) - ${closestLandmark.context}`;
    }
  } else if (road) {
    fullLabel = `${road}${number ? ', ' + number : ''}${suburb ? ' - ' + suburb : ''}, ${city} - ${state}`;
  } else if (formattedGoogleAddress) {
    fullLabel = formattedGoogleAddress;
  } else {
    fullLabel = `Minha Localização GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  }

  return {
    fullLabel,
    landmarkName,
    streetAddress,
    distanceMeters: bestPoi ? bestPoi.distanceMeters : minLandmarkDist,
    lat,
    lon,
    nearbyRecommendations: recommendations
  };
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const ref = await getNearestReferencePoint(lat, lon);
  return ref.fullLabel;
}
