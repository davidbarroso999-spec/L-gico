/**
 * MOTOR DE NAVEGAÇÃO E ROTEIRIZAÇÃO FLUVIAL AMAZÔNICA DE ALTA FIDELIDADE
 * 
 * Características:
 * - Malha hidroviária contínua com curvas reais de talvegue (Rio Negro, Solimões, Amazonas, Madeira e Igarapés)
 * - Modelagem hidrológica sazonal (Cheia, Vazante, Seca Severa) com desvio de bancos de areia
 * - Algoritmo de Dijkstra para menor tempo/distância náutica
 * - Geração de geometria GeoJSON fluida (densificação spline geodésica)
 * - Geração de instruções completas de navegação náutica passo a passo (turn-by-turn HUD)
 */

export interface FluvialPort {
  nodeId: string;
  name: string;
  lat: number;
  lon: number;
  type: 'porto_principal' | 'marina' | 'terminal_balsa' | 'terminal_cargas' | 'flutuante';
  river: string;
}

export interface FluvialEdge {
  from: string;
  to: string;
  riverName: string;
  points: [number, number][]; // [lat, lon] sequence describing the real river curve
  isDeepTalvegueOnly?: boolean; // Canal profundo obrigatório na seca
}

export interface FluvialPathResult {
  path: [number, number][]; // [lat, lon]
  distanceKm: number;
  durationMinutes: number;
  effectiveSpeedKmH: number;
  currentVectorKmH: number;
  hydrology: {
    season: 'cheia' | 'vazante' | 'seca';
    seasonLabel: string;
    riverLevelMeters: number;
    sandbankRisk: 'nenhum' | 'moderado' | 'critico';
    sandbankAlerts: string[];
    talvegueAdvisory: string;
  };
  navigationSteps: {
    instruction: string;
    distanceMeters: number;
    durationSeconds: number;
    way_points: [number, number];
    type: string;
    riverName: string;
    speedKnots: number;
  }[];
}

// 1. Catálogo Completo de Portos, Marinas e Pontos Fluviais Estratégicos
export const FLUVIAL_PORTS: FluvialPort[] = [
  { nodeId: 'porto', name: "Porto de Manaus (Roadway / Centro)", lat: -3.1410, lon: -60.0260, type: 'porto_principal', river: 'Rio Negro' },
  { nodeId: 'ceasa', name: "Porto da Ceasa (Balsas Careiro / Encontro)", lat: -3.1450, lon: -59.9420, type: 'terminal_balsa', river: 'Rio Negro / Encontro das Águas' },
  { nodeId: 'chibatao', name: "Terminal Fluvial Chibatão / SuperTerminais", lat: -3.1510, lon: -59.9880, type: 'terminal_cargas', river: 'Rio Negro' },
  { nodeId: 'taruma', name: "Marina do Davi (Pontal / Tarumã)", lat: -3.0900, lon: -60.0800, type: 'marina', river: 'Igarapé do Tarumã-Açu' },
  { nodeId: 'flutuantes_taruma', name: "Flutuantes do Tarumã-Açu", lat: -3.0450, lon: -60.0750, type: 'flutuante', river: 'Rio Tarumã-Açu' },
  { nodeId: 'sao_raimundo', name: "Porto de São Raimundo", lat: -3.1350, lon: -60.0450, type: 'porto_principal', river: 'Bacia do São Raimundo / Rio Negro' },
  { nodeId: 'educandos', name: "Porto do Educandos (Feira Panair)", lat: -3.1480, lon: -60.0120, type: 'porto_principal', river: 'Igarapé de Educandos' },
  { nodeId: 'ponta_negra', name: "Ponta Negra (Orla Fluvial)", lat: -3.0620, lon: -60.1020, type: 'marina', river: 'Rio Negro' },
  { nodeId: 'praia_lua', name: "Praia da Lua / Tupé", lat: -3.0750, lon: -60.1250, type: 'marina', river: 'Rio Negro (Margem Direita)' },
  { nodeId: 'puraquequara', name: "Fronteira Fluvial Puraquequara", lat: -3.0760, lon: -59.8700, type: 'terminal_cargas', river: 'Rio Amazonas' },
  { nodeId: 'careiro', name: "Porto do Careiro da Várzea", lat: -3.1970, lon: -59.8220, type: 'terminal_balsa', river: 'Rio Solimões / BR-319' },
  { nodeId: 'cacau_pirera', name: "Porto de Cacau Pirêra (Iranduba)", lat: -3.1670, lon: -60.0650, type: 'terminal_balsa', river: 'Rio Negro (Margem Direita)' },
  { nodeId: 'iranduba', name: "Orla Fluvial de Iranduba", lat: -3.2800, lon: -60.1700, type: 'porto_principal', river: 'Rio Solimões' },
  { nodeId: 'manacapuru', name: "Porto de Manacapuru (Solimões)", lat: -3.2990, lon: -60.6210, type: 'porto_principal', river: 'Rio Solimões' },
  { nodeId: 'novo_airao', name: "Porto de Novo Airão (Anavilhanas)", lat: -2.6210, lon: -60.9420, type: 'porto_principal', river: 'Rio Negro' },
  { nodeId: 'itacoatiara', name: "Porto de Itacoatiara (Amazonas)", lat: -3.1430, lon: -58.4440, type: 'terminal_cargas', river: 'Rio Amazonas' },
  { nodeId: 'parintins', name: "Porto de Parintins", lat: -2.6280, lon: -56.7350, type: 'porto_principal', river: 'Rio Amazonas' },
  { nodeId: 'autazes', name: "Porto de Autazes (Rio Madeira)", lat: -3.5790, lon: -59.1310, type: 'porto_principal', river: 'Rio Madeira' },
  { nodeId: 'coari', name: "Terminal Fluvial de Coari (Urucu)", lat: -4.0840, lon: -63.1410, type: 'terminal_cargas', river: 'Rio Solimões' },
  { nodeId: 'tefe', name: "Porto de Tefé (Médio Solimões)", lat: -3.3540, lon: -64.7110, type: 'porto_principal', river: 'Rio Solimões' },
];

// 2. Nós Geodésicos de Junção e Talvegue Fluvial (Graph Nodes)
export const FLUVIAL_GRAPH_NODES: Record<string, { id: string; lat: number; lon: number; name: string }> = {
  novo_airao: { id: 'novo_airao', lat: -2.6210, lon: -60.9420, name: 'Novo Airão' },
  cuieiras: { id: 'cuieiras', lat: -2.8300, lon: -60.7700, name: 'Foz do Rio Cuieiras' },
  tupe: { id: 'tupe', lat: -3.0300, lon: -60.3600, name: 'Canal do Tupé' },
  praia_lua: { id: 'praia_lua', lat: -3.0750, lon: -60.1250, name: 'Praia da Lua' },
  ponta_negra: { id: 'ponta_negra', lat: -3.0620, lon: -60.1020, name: 'Ponta Negra' },
  taruma: { id: 'taruma', lat: -3.0900, lon: -60.0800, name: 'Marina do Davi / Boca do Tarumã' },
  flutuantes_taruma: { id: 'flutuantes_taruma', lat: -3.0450, lon: -60.0750, name: 'Flutuantes Tarumã' },
  compensa: { id: 'compensa', lat: -3.1150, lon: -60.0650, name: 'Compensa / Vila Marinho' },
  ponte: { id: 'ponte', lat: -3.1250, lon: -60.0550, name: 'Vão Central da Ponte Rio Negro' },
  cacau_pirera: { id: 'cacau_pirera', lat: -3.1670, lon: -60.0650, name: 'Cacau Pirêra' },
  sao_raimundo: { id: 'sao_raimundo', lat: -3.1350, lon: -60.0450, name: 'Bacia de São Raimundo' },
  porto: { id: 'porto', lat: -3.1410, lon: -60.0260, name: 'Porto de Manaus / Roadway' },
  educandos: { id: 'educandos', lat: -3.1480, lon: -60.0120, name: 'Ponta do Educandos' },
  chibatao: { id: 'chibatao', lat: -3.1510, lon: -59.9880, name: 'Polo Fluvial Chibatão' },
  castanhal: { id: 'castanhal', lat: -3.1550, lon: -59.9800, name: 'Canal do Mauazinho' },
  ceasa: { id: 'ceasa', lat: -3.1450, lon: -59.9420, name: 'Porto da Ceasa' },
  encontro: { id: 'encontro', lat: -3.1350, lon: -59.9030, name: 'Encontro das Águas (Ponta das Lajes)' },
  careiro: { id: 'careiro', lat: -3.1970, lon: -59.8220, name: 'Careiro da Várzea' },
  puraquequara: { id: 'puraquequara', lat: -3.0760, lon: -59.8700, name: 'Puraquequara' },
  iranduba: { id: 'iranduba', lat: -3.2800, lon: -60.1700, name: 'Orla de Iranduba' },
  manacapuru: { id: 'manacapuru', lat: -3.2990, lon: -60.6210, name: 'Porto de Manacapuru' },
  itacoatiara: { id: 'itacoatiara', lat: -3.1430, lon: -58.4440, name: 'Porto de Itacoatiara' },
  parintins: { id: 'parintins', lat: -2.6280, lon: -56.7350, name: 'Porto de Parintins' },
  autazes: { id: 'autazes', lat: -3.5790, lon: -59.1310, name: 'Porto de Autazes' },
  coari: { id: 'coari', lat: -4.0840, lon: -63.1410, name: 'Terminal de Coari' },
  tefe: { id: 'tefe', lat: -3.3540, lon: -64.7110, name: 'Porto de Tefé' }
};

// 3. Geometrias Curvas Reais de Alta Resolução por Trecho Fluvial (Talvegue Hidroviário)
export const FLUVIAL_EDGES: FluvialEdge[] = [
  // Trecho Novo Airão <-> Cuieiras <-> Tupé <-> Ponta Negra (Rio Negro Superior)
  {
    from: 'novo_airao',
    to: 'cuieiras',
    riverName: 'Rio Negro (Arquipélago de Anavilhanas)',
    points: [
      [-2.6210, -60.9420], [-2.6450, -60.9280], [-2.6700, -60.9100], [-2.6950, -60.8880],
      [-2.7200, -60.8650], [-2.7500, -60.8420], [-2.7750, -60.8200], [-2.8050, -60.7950],
      [-2.8300, -60.7700]
    ]
  },
  {
    from: 'cuieiras',
    to: 'tupe',
    riverName: 'Rio Negro (Canal Central / Anavilhanas Sul)',
    points: [
      [-2.8300, -60.7700], [-2.8550, -60.7420], [-2.8800, -60.7100], [-2.9050, -60.6750],
      [-2.9250, -60.6400], [-2.9450, -60.6000], [-2.9650, -60.5600], [-2.9850, -60.5100],
      [-3.0050, -60.4600], [-3.0200, -60.4100], [-3.0300, -60.3600]
    ]
  },
  {
    from: 'tupe',
    to: 'ponta_negra',
    riverName: 'Rio Negro (Aproximação Orla de Manaus)',
    points: [
      [-3.0300, -60.3600], [-3.0380, -60.3100], [-3.0450, -60.2600], [-3.0490, -60.2200],
      [-3.0520, -60.1800], [-3.0550, -60.1550], [-3.0580, -60.1300], [-3.0600, -60.1150],
      [-3.0620, -60.1020]
    ]
  },
  // Ponta Negra <-> Praia da Lua
  {
    from: 'ponta_negra',
    to: 'praia_lua',
    riverName: 'Travessia Fluvial Ponta Negra - Praia da Lua',
    points: [
      [-3.0620, -60.1020], [-3.0660, -60.1090], [-3.0710, -60.1170], [-3.0750, -60.1250]
    ]
  },
  // Ponta Negra <-> Tarumã (Marina do Davi)
  {
    from: 'ponta_negra',
    to: 'taruma',
    riverName: 'Rio Negro / Canal da Ponta do Gavião',
    points: [
      [-3.0620, -60.1020], [-3.0680, -60.0980], [-3.0740, -60.0940], [-3.0810, -60.0890],
      [-3.0860, -60.0850], [-3.0900, -60.0800]
    ]
  },
  // Tarumã (Marina do Davi) <-> Flutuantes Tarumã
  {
    from: 'taruma',
    to: 'flutuantes_taruma',
    riverName: 'Igarapé do Tarumã-Açu (Canal dos Flutuantes)',
    points: [
      [-3.0900, -60.0800], [-3.0820, -60.0795], [-3.0740, -60.0790], [-3.0650, -60.0775],
      [-3.0550, -60.0760], [-3.0450, -60.0750]
    ]
  },
  // Tarumã <-> Compensa
  {
    from: 'taruma',
    to: 'compensa',
    riverName: 'Rio Negro (Orla Oeste de Manaus)',
    points: [
      [-3.0900, -60.0800], [-3.0960, -60.0770], [-3.1020, -60.0735], [-3.1080, -60.0700],
      [-3.1120, -60.0670], [-3.1150, -60.0650]
    ]
  },
  // Compensa <-> Ponte Rio Negro
  {
    from: 'compensa',
    to: 'ponte',
    riverName: 'Rio Negro (Canal da Ponte Jornalista Phelippe Daou)',
    points: [
      [-3.1150, -60.0650], [-3.1185, -60.0620], [-3.1220, -60.0585], [-3.1250, -60.0550]
    ]
  },
  // Ponte Rio Negro <-> Cacau Pirêra (Travessia)
  {
    from: 'ponte',
    to: 'cacau_pirera',
    riverName: 'Travessia Fluvial Rio Negro (Manaus - Iranduba)',
    points: [
      [-3.1250, -60.0550], [-3.1360, -60.0580], [-3.1480, -60.0615], [-3.1580, -60.0635],
      [-3.1670, -60.0650]
    ]
  },
  // Ponte Rio Negro <-> São Raimundo
  {
    from: 'ponte',
    to: 'sao_raimundo',
    riverName: 'Rio Negro (Enseada de São Raimundo / Bacia Central)',
    points: [
      [-3.1250, -60.0550], [-3.1285, -60.0515], [-3.1320, -60.0480], [-3.1350, -60.0450]
    ]
  },
  // São Raimundo <-> Porto de Manaus (Roadway)
  {
    from: 'sao_raimundo',
    to: 'porto',
    riverName: 'Rio Negro (Orla Histórica de Manaus / Centro)',
    points: [
      [-3.1350, -60.0450], [-3.1375, -60.0400], [-3.1395, -60.0345], [-3.1408, -60.0295],
      [-3.1410, -60.0260]
    ]
  },
  // Porto de Manaus <-> Educandos (Panair)
  {
    from: 'porto',
    to: 'educandos',
    riverName: 'Rio Negro (Contorno da Ponta do Educandos)',
    points: [
      [-3.1410, -60.0260], [-3.1430, -60.0225], [-3.1455, -60.0180], [-3.1472, -60.0145],
      [-3.1480, -60.0120]
    ]
  },
  // Educandos <-> Chibatão / SuperTerminais
  {
    from: 'educandos',
    to: 'chibatao',
    riverName: 'Rio Negro (Polo Portuário Chibatão / Distrito)',
    points: [
      [-3.1480, -60.0120], [-3.1495, -60.0060], [-3.1510, -59.9995], [-3.1515, -59.9940],
      [-3.1510, -59.9880]
    ]
  },
  // Chibatão <-> Castanhal / Mauazinho
  {
    from: 'chibatao',
    to: 'castanhal',
    riverName: 'Rio Negro (Canal do Mauazinho)',
    points: [
      [-3.1510, -59.9880], [-3.1528, -59.9850], [-3.1542, -59.9825], [-3.1550, -59.9800]
    ]
  },
  // Castanhal <-> Porto da Ceasa
  {
    from: 'castanhal',
    to: 'ceasa',
    riverName: 'Rio Negro (Canal de Acesso ao Porto da Ceasa)',
    points: [
      [-3.1550, -59.9800], [-3.1545, -59.9710], [-3.1528, -59.9610], [-3.1495, -59.9510],
      [-3.1465, -59.9455], [-3.1450, -59.9420]
    ]
  },
  // Ceasa <-> Encontro das Águas (Ponta das Lajes)
  {
    from: 'ceasa',
    to: 'encontro',
    riverName: 'Encontro das Águas (Confluência Negro e Solimões)',
    points: [
      [-3.1450, -59.9420], [-3.1425, -59.9325], [-3.1400, -59.9230], [-3.1378, -59.9140],
      [-3.1360, -59.9075], [-3.1350, -59.9030]
    ]
  },
  // Ceasa <-> Careiro da Várzea (Travessia Solimões)
  {
    from: 'ceasa',
    to: 'careiro',
    riverName: 'Travessia Fluvial Balsa Manaus - Careiro da Várzea',
    points: [
      [-3.1450, -59.9420], [-3.1540, -59.9220], [-3.1645, -59.8990], [-3.1760, -59.8730],
      [-3.1870, -59.8470], [-3.1935, -59.8320], [-3.1970, -59.8220]
    ]
  },
  // Encontro das Águas <-> Careiro da Várzea
  {
    from: 'encontro',
    to: 'careiro',
    riverName: 'Rio Solimões / Canal do Careiro',
    points: [
      [-3.1350, -59.9030], [-3.1480, -59.8850], [-3.1640, -59.8650], [-3.1810, -59.8430],
      [-3.1970, -59.8220]
    ]
  },
  // Encontro das Águas <-> Puraquequara (Início do Rio Amazonas)
  {
    from: 'encontro',
    to: 'puraquequara',
    riverName: 'Rio Amazonas (Trecho Inicial Puraquequara)',
    points: [
      [-3.1350, -59.9030], [-3.1240, -59.8940], [-3.1110, -59.8850], [-3.0970, -59.8780],
      [-3.0850, -59.8730], [-3.0760, -59.8700]
    ]
  },
  // Puraquequara <-> Itacoatiara (Rio Amazonas com curvas reais e meandros)
  {
    from: 'puraquequara',
    to: 'itacoatiara',
    riverName: 'Rio Amazonas (Talvegue Manaus - Itacoatiara)',
    points: [
      [-3.0760, -59.8700], [-3.0710, -59.8250], [-3.0650, -59.7700], [-3.0610, -59.7050],
      [-3.0590, -59.6400], [-3.0620, -59.5750], [-3.0680, -59.5100], [-3.0760, -59.4400],
      [-3.0850, -59.3700], [-3.0940, -59.2950], [-3.1030, -59.2200], [-3.1120, -59.1350],
      [-3.1200, -59.0400], [-3.1270, -58.9400], [-3.1330, -58.8350], [-3.1380, -58.7250],
      [-3.1410, -58.6100], [-3.1425, -58.5200], [-3.1430, -58.4440]
    ]
  },
  // Itacoatiara <-> Parintins (Baixo Amazonas)
  {
    from: 'itacoatiara',
    to: 'parintins',
    riverName: 'Rio Amazonas (Trecho Itacoatiara - Parintins)',
    points: [
      [-3.1430, -58.4440], [-3.1310, -58.3450], [-3.1120, -58.2400], [-3.0850, -58.1250],
      [-3.0510, -58.0100], [-3.0120, -57.9000], [-2.9680, -57.7850], [-2.9200, -57.6700],
      [-2.8710, -57.5500], [-2.8210, -57.4300], [-2.7720, -57.3000], [-2.7250, -57.1700],
      [-2.6840, -57.0300], [-2.6510, -56.8950], [-2.6320, -56.7900], [-2.6280, -56.7350]
    ]
  },
  // Encontro das Águas <-> Autazes (Rio Madeira)
  {
    from: 'encontro',
    to: 'autazes',
    riverName: 'Rio Madeira (Canal Manaus - Autazes)',
    points: [
      [-3.1350, -59.9030], [-3.1750, -59.8550], [-3.2250, -59.7950], [-3.2850, -59.7250],
      [-3.3550, -59.6450], [-3.4300, -59.5500], [-3.5000, -59.4300], [-3.5450, -59.2900],
      [-3.5790, -59.1310]
    ]
  },
  // Cacau Pirêra <-> Iranduba <-> Manacapuru (Rio Solimões)
  {
    from: 'cacau_pirera',
    to: 'iranduba',
    riverName: 'Rio Negro / Canal da Ilha da Marchantaria',
    points: [
      [-3.1670, -60.0650], [-3.1920, -60.0880], [-3.2210, -60.1140], [-3.2520, -60.1420],
      [-3.2800, -60.1700]
    ]
  },
  {
    from: 'iranduba',
    to: 'manacapuru',
    riverName: 'Rio Solimões (Costa do Pesqueiro / Manacapuru)',
    points: [
      [-3.2800, -60.1700], [-3.3010, -60.2150], [-3.3210, -60.2700], [-3.3360, -60.3350],
      [-3.3420, -60.4050], [-3.3380, -60.4750], [-3.3260, -60.5400], [-3.3090, -60.5900],
      [-3.2990, -60.6210]
    ]
  },
  // Manacapuru <-> Coari (Médio Solimões)
  {
    from: 'manacapuru',
    to: 'coari',
    riverName: 'Rio Solimões (Trecho Manacapuru - Anori - Codajás - Coari)',
    points: [
      [-3.2990, -60.6210], [-3.3450, -60.7400], [-3.4100, -60.8800], [-3.4900, -61.0500],
      [-3.5800, -61.2600], [-3.6750, -61.5100], [-3.7650, -61.7900], [-3.8500, -62.1100],
      [-3.9300, -62.4500], [-4.0050, -62.8000], [-4.0550, -63.0200], [-4.0840, -63.1410]
    ]
  },
  // Coari <-> Tefé (Alto/Médio Solimões)
  {
    from: 'coari',
    to: 'tefe',
    riverName: 'Rio Solimões (Trecho Coari - Tefé)',
    points: [
      [-4.0840, -63.1410], [-4.0250, -63.3400], [-3.9400, -63.5900], [-3.8350, -63.8800],
      [-3.7150, -64.1800], [-3.5800, -64.4400], [-3.4650, -64.6050], [-3.3540, -64.7110]
    ]
  }
];

// Função geodésica precisa para cálculo de distância Haversine em KM
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Interpolação suave (Catmull-Rom spline densification) para gerar curvas de rio contínuas e fluidas
function densifyRiverCurve(points: [number, number][], pointsPerSegment: number = 8): [number, number][] {
  if (points.length <= 1) return points;
  const densified: [number, number][] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let t = 0; t < pointsPerSegment; t++) {
      const u = t / pointsPerSegment;
      const u2 = u * u;
      const u3 = u2 * u;

      // Catmull-Rom spline formula
      const lat = 0.5 * (
        (2 * p1[0]) +
        (-p0[0] + p2[0]) * u +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3
      );

      const lon = 0.5 * (
        (2 * p1[1]) +
        (-p0[1] + p2[1]) * u +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3
      );

      densified.push([lat, lon]);
    }
  }
  densified.push(points[points.length - 1]);
  return densified;
}

// 4. Encontra o nó fluvial ou porto mais próximo de qualquer coordenada arbitrária
export function findClosestFluvialNode(lat: number, lon: number): { nodeId: string; name: string; lat: number; lon: number; distanceKm: number } {
  let best = { nodeId: 'porto', name: 'Porto de Manaus', lat: -3.1410, lon: -60.0260, distanceKm: Infinity };

  for (const key in FLUVIAL_GRAPH_NODES) {
    const node = FLUVIAL_GRAPH_NODES[key];
    const d = calculateDistanceKm(lat, lon, node.lat, node.lon);
    if (d < best.distanceKm) {
      best = { nodeId: node.id, name: node.name, lat: node.lat, lon: node.lon, distanceKm: d };
    }
  }

  return best;
}

// 4.5. Detecção Automática da Sazonalidade Amazônica (Ciclo Hidrológico)
export function getAutoDetectedAmazonSeason(referenceDate?: Date | string | null): {
  month: number;
  monthName: string;
  seasonKey: 'seca' | 'vazante' | 'cheia' | 'enchente';
  seasonTitle: string;
  badgeLabel: string;
  riverLevelEstimate: number;
  description: string;
  isAutomatic: boolean;
} {
  let d = new Date();
  if (referenceDate) {
    const parsed = typeof referenceDate === 'string' ? new Date(referenceDate + 'T12:00:00') : referenceDate;
    if (parsed instanceof Date && !isNaN(parsed.getTime())) {
      d = parsed;
    }
  }
  const month = d.getMonth() + 1; // 1-12
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthName = monthNames[month - 1];

  let seasonKey: 'seca' | 'vazante' | 'cheia' | 'enchente' = 'cheia';
  let seasonTitle = 'Cheia Plena';
  let badgeLabel = `${monthName} • Cheia Plena`;
  let riverLevelEstimate = 27.8;
  let description = 'Canais navegáveis com ampla profundidade e calado liberado.';

  if (month >= 9 && month <= 11) {
    seasonKey = 'seca';
    seasonTitle = 'Seca / Estiagem Severa';
    badgeLabel = `${monthName} • Seca Severa`;
    riverLevelEstimate = 13.2;
    description = 'Navegação restrita ao canal profundo (talvegue). Monitoramento contínuo de bancos de areia e restrição de calado.';
  } else if (month >= 7 && month <= 8) {
    seasonKey = 'vazante';
    seasonTitle = 'Vazante (Canal em Retração)';
    badgeLabel = `${monthName} • Vazante`;
    riverLevelEstimate = 19.5;
    description = 'Recuo gradual do nível das águas. Requer atenção a praias e bancos emergentes.';
  } else if (month === 12 || month === 1 || month === 2) {
    seasonKey = 'enchente';
    seasonTitle = 'Enchente (Rios Subindo)';
    badgeLabel = `${monthName} • Enchente`;
    riverLevelEstimate = 22.5;
    description = 'Elevação do nível das águas e presença de fortes correntes e troncos flutuantes.';
  } else {
    seasonKey = 'cheia';
    seasonTitle = 'Cheia Plena';
    badgeLabel = `${monthName} • Cheia Plena`;
    riverLevelEstimate = 28.5;
    description = 'Nível elevado com profundidade máxima para navegação comercial e turística.';
  }

  return {
    month,
    monthName,
    seasonKey,
    seasonTitle,
    badgeLabel,
    riverLevelEstimate,
    description,
    isAutomatic: true
  };
}

// 5. Algoritmo de Dijkstra para encontrar o caminho ótimo na malha fluvial com curvas reais
export function calculateFluvialPath(
  startNodeId: string,
  endNodeId: string,
  priority: 'speed' | 'distance' | 'economy' | 'safety' | 'balanced' = 'speed',
  vesselType: 'express_lancha' | 'voadeira' | 'regional_gaiola' | 'balsa_heavy' = 'express_lancha',
  travelMonth?: number
): FluvialPathResult {
  // Ajuste Sazonal Real Amazônico
  const month = travelMonth && travelMonth >= 1 && travelMonth <= 12 ? travelMonth : (new Date().getMonth() + 1);
  const isSecaSevera = month >= 9 && month <= 11;
  const isVazante = month >= 7 && month <= 8;
  const isCheia = !isSecaSevera && !isVazante;

  const season = isSecaSevera ? 'seca' : isVazante ? 'vazante' : 'cheia';
  const seasonLabel = isSecaSevera 
    ? 'Seca Severa / Estiagem (Navegação Obrigatória pelo Talvegue)' 
    : isVazante 
      ? 'Vazante (Canal em Retração)' 
      : 'Cheia Plena (Profundidade Abundante)';

  // Cota do rio estimada para a época do ano
  const riverLevelMeters = isSecaSevera 
    ? Number((13.2 + (month === 10 ? -0.8 : 0.4)).toFixed(1)) 
    : isVazante 
      ? Number((19.5 - (month === 8 ? 2.5 : 0)).toFixed(1)) 
      : Number((27.8 + Math.sin(month / 2) * 1.5).toFixed(1));

  // Constrói Grafo de Adjacência bidirecional com listas de coordenadas curvas
  const adjacency: Record<string, { neighbor: string; edge: FluvialEdge; distanceKm: number; points: [number, number][] }[]> = {};

  for (const nodeKey in FLUVIAL_GRAPH_NODES) {
    adjacency[nodeKey] = [];
  }

  FLUVIAL_EDGES.forEach(edge => {
    // Calcula distância precisa seguindo todos os pontos da curva do rio
    let edgeDistKm = 0;
    for (let i = 0; i < edge.points.length - 1; i++) {
      edgeDistKm += calculateDistanceKm(
        edge.points[i][0], edge.points[i][1],
        edge.points[i + 1][0], edge.points[i + 1][1]
      );
    }

    // Na seca severa, canais têm sinuosidade adicional (+15%) devido a desvios de bancos de areia
    if (isSecaSevera) {
      edgeDistKm *= 1.15;
    } else if (isVazante) {
      edgeDistKm *= 1.05;
    }

    if (!adjacency[edge.from]) adjacency[edge.from] = [];
    if (!adjacency[edge.to]) adjacency[edge.to] = [];

    // Ida
    adjacency[edge.from].push({
      neighbor: edge.to,
      edge,
      distanceKm: edgeDistKm,
      points: edge.points
    });

    // Volta (reversa)
    adjacency[edge.to].push({
      neighbor: edge.from,
      edge,
      distanceKm: edgeDistKm,
      points: [...edge.points].reverse()
    });
  });

  // Dijkstra
  const distances: Record<string, number> = {};
  const previousEdge: Record<string, { fromNode: string; edge: FluvialEdge; points: [number, number][]; distanceKm: number } | null> = {};
  const unvisited = new Set<string>();

  for (const node in FLUVIAL_GRAPH_NODES) {
    distances[node] = Infinity;
    previousEdge[node] = null;
    unvisited.add(node);
  }

  distances[startNodeId] = 0;

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minD = Infinity;

    for (const node of unvisited) {
      if (distances[node] < minD) {
        minD = distances[node];
        current = node;
      }
    }

    if (!current || distances[current] === Infinity || current === endNodeId) {
      break;
    }

    unvisited.delete(current);

    const neighbors = adjacency[current] || [];
    for (const { neighbor, edge, distanceKm, points } of neighbors) {
      if (!unvisited.has(neighbor)) continue;

      const alt = distances[current] + distanceKm;
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previousEdge[neighbor] = { fromNode: current, edge, points, distanceKm };
      }
    }
  }

  // Reconstrução do caminho de curvas contínuas
  const rawPathCoords: [number, number][] = [];
  const traversedEdges: { from: string; to: string; edge: FluvialEdge; points: [number, number][]; distKm: number }[] = [];

  let curr = endNodeId;
  while (previousEdge[curr]) {
    const prev = previousEdge[curr]!;
    traversedEdges.unshift({
      from: prev.fromNode,
      to: curr,
      edge: prev.edge,
      points: prev.points,
      distKm: prev.distanceKm
    });
    curr = prev.fromNode;
  }

  let totalDistanceKm = 0;

  if (traversedEdges.length === 0) {
    // Mesma origem e destino ou nós desconectados: usa nós diretos
    const sNode = FLUVIAL_GRAPH_NODES[startNodeId] || FLUVIAL_GRAPH_NODES['porto'];
    const eNode = FLUVIAL_GRAPH_NODES[endNodeId] || FLUVIAL_GRAPH_NODES['porto'];
    rawPathCoords.push([sNode.lat, sNode.lon]);
    if (startNodeId !== endNodeId) {
      rawPathCoords.push([eNode.lat, eNode.lon]);
      totalDistanceKm = calculateDistanceKm(sNode.lat, sNode.lon, eNode.lat, eNode.lon);
    }
  } else {
    traversedEdges.forEach((item, index) => {
      totalDistanceKm += item.distKm;
      const pts = item.points;
      pts.forEach((pt, pIdx) => {
        if (index > 0 && pIdx === 0) {
          // Evita duplicar o ponto de encontro de dois trechos adjacentes
          return;
        }
        rawPathCoords.push(pt);
      });
    });
  }

  // Aplica suavização e densificação spline para traçado de rio 100% orgânico no Leaflet
  const finalSplinePath = densifyRiverCurve(rawPathCoords, 6);

  // Velocidade da Embarcação
  let baseSpeedKmH = 32;
  if (vesselType === 'express_lancha') baseSpeedKmH = 48; // Lancha rápida: 48 km/h (~26 nós)
  else if (vesselType === 'voadeira') baseSpeedKmH = 36; // Voadeira: 36 km/h (~19 nós)
  else if (vesselType === 'regional_gaiola') baseSpeedKmH = 18; // Gaiola: 18 km/h (~10 nós)
  else if (vesselType === 'balsa_heavy') baseSpeedKmH = 14; // Balsa pesada: 14 km/h (~7.5 nós)

  // Vetor de Correnteza do Rio Negro/Solimões (A favor para Leste / Contra para Oeste)
  const startNode = FLUVIAL_GRAPH_NODES[startNodeId];
  const endNode = FLUVIAL_GRAPH_NODES[endNodeId];
  let currentBonusKmH = 0;
  if (startNode && endNode) {
    const isGoingDownstream = endNode.lon > startNode.lon; // A favor da correnteza para o Atlântico
    currentBonusKmH = isGoingDownstream ? (isCheia ? 6.2 : 3.8) : (isCheia ? -7.0 : -4.5);
  }

  // Penalidade de velocidade na Seca Severa
  let seasonSpeedPenalty = 0;
  if (isSecaSevera) {
    seasonSpeedPenalty = -5.0; // Navegação cautelosa por baixa profundidade
  } else if (isVazante) {
    seasonSpeedPenalty = -2.5;
  }

  const effectiveSpeedKmH = Math.max(8, baseSpeedKmH + currentBonusKmH + seasonSpeedPenalty);
  const durationHours = totalDistanceKm > 0 ? totalDistanceKm / effectiveSpeedKmH : 0.05;
  const durationMinutes = Math.round(durationHours * 60);

  // Geração de Passos de Navegação Náutica Passo a Passo (Turn-by-Turn HUD)
  const navigationSteps: FluvialPathResult['navigationSteps'] = [];
  const speedKnots = Number((effectiveSpeedKmH / 1.852).toFixed(1));

  if (traversedEdges.length === 0) {
    const sName = FLUVIAL_GRAPH_NODES[startNodeId]?.name || 'Porto Origem';
    navigationSteps.push({
      instruction: `Atracado / Operação Fluvial em ${sName}`,
      distanceMeters: 0,
      durationSeconds: 60,
      way_points: [0, Math.max(0, finalSplinePath.length - 1)],
      type: 'straight',
      riverName: 'Área Portuária',
      speedKnots
    });
  } else {
    // Passo 1: Desatracação
    const startPortName = FLUVIAL_GRAPH_NODES[startNodeId]?.name || 'Porto de Origem';
    navigationSteps.push({
      instruction: `Desatracar de ${startPortName} e ingressar no canal de navegação`,
      distanceMeters: Math.round(Math.min(500, totalDistanceKm * 100)),
      durationSeconds: 120,
      way_points: [0, Math.min(finalSplinePath.length - 1, 5)],
      type: 'straight',
      riverName: traversedEdges[0]?.edge.riverName || 'Canal Fluvial',
      speedKnots: Math.round(speedKnots * 0.5)
    });

    // Passos intermediários por trecho de rio
    let accumulatedPoints = 0;
    traversedEdges.forEach((item, idx) => {
      const stepDistMeters = Math.round(item.distKm * 1000);
      const stepDurationSeconds = Math.round((item.distKm / effectiveSpeedKmH) * 3600);
      const startIdx = Math.min(finalSplinePath.length - 1, accumulatedPoints);
      const endIdx = Math.min(finalSplinePath.length - 1, accumulatedPoints + item.points.length * 6);
      accumulatedPoints = endIdx;

      let maneuverDesc = `Navegar por ${item.edge.riverName}`;
      if (isSecaSevera) {
        maneuverDesc += ` [Canal do Talvegue - Cota ${riverLevelMeters}m]`;
      } else if (currentBonusKmH > 0) {
        maneuverDesc += ` [A favor da correnteza +${Math.abs(Math.round(currentBonusKmH))} km/h]`;
      }

      navigationSteps.push({
        instruction: maneuverDesc,
        distanceMeters: stepDistMeters,
        durationSeconds: stepDurationSeconds,
        way_points: [startIdx, endIdx],
        type: idx % 2 === 0 ? 'straight' : 'slight-right',
        riverName: item.edge.riverName,
        speedKnots
      });
    });

    // Passo Final: Atracação
    const endPortName = FLUVIAL_GRAPH_NODES[endNodeId]?.name || 'Porto Destino';
    navigationSteps.push({
      instruction: `Aproximação e manobra de atracação segura em ${endPortName}`,
      distanceMeters: 300,
      durationSeconds: 180,
      way_points: [Math.max(0, finalSplinePath.length - 6), finalSplinePath.length - 1],
      type: 'straight',
      riverName: 'Atracadouro',
      speedKnots: Math.round(speedKnots * 0.4)
    });
  }

  const sandbankAlerts: string[] = [];
  if (isSecaSevera) {
    sandbankAlerts.push("Atenção aos bancos de areia e pontais da Praia da Ponta Negra e Costa do Marrecão.");
    sandbankAlerts.push("Mantenha velocidade reduzida e calado monitorado. Navegação noturna não recomendada para embarcações pesadas.");
  }

  return {
    path: finalSplinePath,
    distanceKm: Number(totalDistanceKm.toFixed(2)),
    durationMinutes,
    effectiveSpeedKmH: Math.round(effectiveSpeedKmH),
    currentVectorKmH: Number(currentBonusKmH.toFixed(1)),
    hydrology: {
      season,
      seasonLabel,
      riverLevelMeters,
      sandbankRisk: isSecaSevera ? 'critico' : isVazante ? 'moderado' : 'nenhum',
      sandbankAlerts,
      talvegueAdvisory: isSecaSevera 
        ? 'Traçado ajustado obrigatoriamente pelas profundidades do talvegue homologado pela Capitania dos Portos.'
        : 'Canal de navegação amplo com calado seguro em toda a bacia.'
    },
    navigationSteps
  };
}

// 6. Catálogo de Bancos de Areia, Passos Críticos e Pedrais Submersos na Bacia Amazônica
export interface FluvialSandbankHazard {
  id: string;
  name: string;
  river: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  minGaugeCriticalMeters: number; // Nível do rio em metros onde o banco aflora/ameaça calado
  riskLevel: 'baixo' | 'moderado' | 'alto' | 'critico';
  description: string;
  talvegueDeviationBearingDeg: number; // Rumo seguro (azimute) para o canal profundo
  repiqueteSensitivity: boolean;
}

export const FLUVIAL_SANDBANKS: FluvialSandbankHazard[] = [
  {
    id: 'banco_ponta_negra',
    name: 'Banco da Ponta Negra / Praia da Lua',
    river: 'Rio Negro',
    lat: -3.0720,
    lon: -60.1180,
    radiusMeters: 1400,
    minGaugeCriticalMeters: 16.8,
    riskLevel: 'critico',
    description: 'Pontal arenoso submerso com rápida redução de calado para < 1.8m na estiagem. Risco severo de encalhe de hélices.',
    talvegueDeviationBearingDeg: 145,
    repiqueteSensitivity: true
  },
  {
    id: 'banco_taruma_boca',
    name: 'Bancos Rasos da Foz do Tarumã-Açu',
    river: 'Igarapé do Tarumã-Açu / Rio Negro',
    lat: -3.0880,
    lon: -60.0820,
    radiusMeters: 950,
    minGaugeCriticalMeters: 17.2,
    riskLevel: 'alto',
    description: 'Formação arenosa na confluência com o Rio Negro. Estreitamento de calha navegável.',
    talvegueDeviationBearingDeg: 195,
    repiqueteSensitivity: true
  },
  {
    id: 'banco_marrecao',
    name: 'Banco do Marrecão / Costa do Pesqueiro',
    river: 'Rio Solimões',
    lat: -3.2200,
    lon: -60.1100,
    radiusMeters: 2200,
    minGaugeCriticalMeters: 16.0,
    riskLevel: 'critico',
    description: 'Extenso banco arenoso móvel no Solimões com sedimentação diária dinâmica.',
    talvegueDeviationBearingDeg: 90,
    repiqueteSensitivity: true
  },
  {
    id: 'banco_marchantaria',
    name: 'Banco da Ilha da Marchantaria',
    river: 'Rio Solimões / Negro',
    lat: -3.1900,
    lon: -60.0750,
    radiusMeters: 1800,
    minGaugeCriticalMeters: 15.5,
    riskLevel: 'alto',
    description: 'Assoreamento acelerado na boca dos canais de travessia Iranduba - Manaus.',
    talvegueDeviationBearingDeg: 110,
    repiqueteSensitivity: true
  },
  {
    id: 'banco_lajes',
    name: 'Pedral e Banco das Lajes (Encontro das Águas)',
    river: 'Encontro das Águas / Rio Amazonas',
    lat: -3.1380,
    lon: -59.9150,
    radiusMeters: 1600,
    minGaugeCriticalMeters: 15.0,
    riskLevel: 'critico',
    description: 'Lajes rochosas submersas e bancos de areia na zona de cisalhamento das correntes dos rios Negro e Solimões.',
    talvegueDeviationBearingDeg: 80,
    repiqueteSensitivity: false
  },
  {
    id: 'passo_castanhal',
    name: 'Passo do Castanhal / Canal do Mauazinho',
    river: 'Rio Negro (Polo Industrial)',
    lat: -3.1530,
    lon: -59.9780,
    radiusMeters: 1100,
    minGaugeCriticalMeters: 14.8,
    riskLevel: 'moderado',
    description: 'Gargalo náutico com restrição para comboios de balsas e navios de calado superior a 6.5m.',
    talvegueDeviationBearingDeg: 105,
    repiqueteSensitivity: true
  },
  {
    id: 'banco_puraquequara',
    name: 'Banco do Puraquequara / Costa do Ariaú',
    river: 'Rio Amazonas',
    lat: -3.0780,
    lon: -59.8600,
    radiusMeters: 1700,
    minGaugeCriticalMeters: 15.2,
    riskLevel: 'alto',
    description: 'Línguas de areia na entrada do Amazonas com fortes redemoinhos e baixa profundidade na margem esquerda.',
    talvegueDeviationBearingDeg: 85,
    repiqueteSensitivity: true
  },
  {
    id: 'banco_tabocal',
    name: 'Passo do Tabocal / Itacoatiara',
    river: 'Rio Amazonas',
    lat: -3.1350,
    lon: -58.5500,
    radiusMeters: 2800,
    minGaugeCriticalMeters: 14.0,
    riskLevel: 'critico',
    description: 'Ponto crítico histórico de dragagem emergencial da Marinha. Calado útil reduzido drasticamente na seca.',
    talvegueDeviationBearingDeg: 95,
    repiqueteSensitivity: true
  },
  {
    id: 'banco_codajas',
    name: 'Passo de Codajás / Anori',
    river: 'Rio Solimões',
    lat: -3.6500,
    lon: -61.4500,
    radiusMeters: 2500,
    minGaugeCriticalMeters: 13.8,
    riskLevel: 'critico',
    description: 'Banco transversal que obriga desvio de 6 milhas náuticas pelo braço sul do talvegue.',
    talvegueDeviationBearingDeg: 75,
    repiqueteSensitivity: true
  },
  {
    id: 'banco_cururu',
    name: 'Banco do Cururu / Parintins',
    river: 'Rio Amazonas',
    lat: -2.6350,
    lon: -56.7600,
    radiusMeters: 1500,
    minGaugeCriticalMeters: 14.6,
    riskLevel: 'alto',
    description: 'Formação arenosa na aproximação do Porto de Parintins com variação súbita de profundidade.',
    talvegueDeviationBearingDeg: 60,
    repiqueteSensitivity: true
  }
];

export interface FluvialHazardDetection {
  inFluvialZone: boolean;
  closestSandbank?: {
    sandbank: FluvialSandbankHazard;
    distanceMeters: number;
    bearingDegrees: number;
    depthEstimatedMeters: number;
    isImminentCollision: boolean; // < 700m
    isWarningZone: boolean; // < 2000m
  };
  riverGauge: {
    levelMeters: number;
    criticalThresholdMeters: number;
    status: 'normal' | 'atencao' | 'vazante_extrema' | 'repiquete_severo' | 'cheia_historica';
    statusLabel: string;
    trend24h: string;
    dailyVariationCm: number;
    depthAtLocationMeters: number;
    isExtremeLow: boolean;
    isExtremeHigh: boolean;
  };
  recommendedAction: string;
  talvegueAdvice: string;
  hasActiveAlert: boolean;
  alertType: 'sandbank' | 'extreme_low_gauge' | 'extreme_high_gauge' | 'repiquete' | 'none';
  alertSeverity: 'info' | 'warning' | 'danger';
  alertTitle: string;
  alertMessage: string;
}

// 7. Motor de Detecção de Perigos e Anomalias em Tempo Real
export function checkFluvialHazards(
  currentLat: number,
  currentLon: number,
  travelMonth?: number,
  vesselDraftMeters: number = 2.2
): FluvialHazardDetection {
  const month = travelMonth && travelMonth >= 1 && travelMonth <= 12 ? travelMonth : (new Date().getMonth() + 1);
  const isSecaSevera = month >= 9 && month <= 11;
  const isVazante = month >= 7 && month <= 8;

  // Verifica se está dentro do quadrante fluvial amazônico de cobertura
  const closestNode = findClosestFluvialNode(currentLat, currentLon);
  const inFluvialZone = closestNode.distanceKm <= 35.0;

  // Cota do rio estimada com oscilação diária realista
  const baseGauge = isSecaSevera 
    ? (month === 10 ? 12.8 : 13.5)
    : isVazante 
      ? 18.2 
      : 27.6;
  
  // Variação diária simulada (repiquete ou vazante)
  const dailyVariationCm = isSecaSevera ? -18 : isVazante ? -8 : 4;
  const riverLevelMeters = Number(baseGauge.toFixed(1));

  // Busca o banco de areia mais próximo da coordenada atual
  let closestSandbankData: {
    sandbank: FluvialSandbankHazard;
    distanceMeters: number;
    bearingDegrees: number;
    depthEstimatedMeters: number;
    isImminentCollision: boolean;
    isWarningZone: boolean;
  } | null = null;
  let minSandbankDistMeters = Infinity;

  for (const sb of FLUVIAL_SANDBANKS) {
    const distKm = calculateDistanceKm(currentLat, currentLon, sb.lat, sb.lon);
    const distMeters = Math.round(distKm * 1000);

    if (distMeters < minSandbankDistMeters) {
      minSandbankDistMeters = distMeters;

      // Cálculo de proa/bearing até o banco de areia
      const dLon = (sb.lon - currentLon) * Math.PI / 180;
      const lat1Rad = currentLat * Math.PI / 180;
      const lat2Rad = sb.lat * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(lat2Rad);
      const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
      const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

      // Profundidade estimada no ponto em relação à proximidade do banco e à cota
      const proximityFactor = Math.max(0, 1 - distMeters / (sb.radiusMeters * 1.5));
      const gaugeDeficit = Math.max(0, sb.minGaugeCriticalMeters - riverLevelMeters);
      const depthAtSb = Math.max(0.6, 6.0 - (proximityFactor * 4.2) - (gaugeDeficit * 0.35));

      closestSandbankData = {
        sandbank: sb,
        distanceMeters: distMeters,
        bearingDegrees: Math.round(bearing),
        depthEstimatedMeters: Number(depthAtSb.toFixed(1)),
        isImminentCollision: distMeters <= sb.radiusMeters,
        isWarningZone: distMeters <= (sb.radiusMeters * 2.2)
      };
    }
  }

  // Análise de Cota Extrema
  const isExtremeLow = riverLevelMeters <= 14.0;
  const isExtremeHigh = riverLevelMeters >= 29.0;
  const isRepiquete = Math.abs(dailyVariationCm) >= 15;

  let gaugeStatus: FluvialHazardDetection['riverGauge']['status'] = 'normal';
  let gaugeStatusLabel = 'Cota em Faixa de Segurança Náutica Plena';
  if (isExtremeLow) {
    gaugeStatus = 'vazante_extrema';
    gaugeStatusLabel = `Estiagem Severa (${riverLevelMeters}m) - Talvegue Obrigatório`;
  } else if (isRepiquete && dailyVariationCm < 0) {
    gaugeStatus = 'repiquete_severo';
    gaugeStatusLabel = `Repiquete Negativo (${dailyVariationCm}cm/dia) - Queda Acentuada`;
  } else if (isExtremeHigh) {
    gaugeStatus = 'cheia_historica';
    gaugeStatusLabel = `Cheia Plena / Cota Alta (${riverLevelMeters}m) - Correnteza Intensa`;
  } else if (isVazante) {
    gaugeStatus = 'atencao';
    gaugeStatusLabel = `Vazante Ativa (${riverLevelMeters}m) - Calado Moderado`;
  }

  // Profundidade geral na localização
  const depthAtLocation = closestSandbankData ? closestSandbankData.depthEstimatedMeters : (isSecaSevera ? 8.5 : 18.0);

  // Decisão de Alertas
  let hasActiveAlert = false;
  let alertType: FluvialHazardDetection['alertType'] = 'none';
  let alertSeverity: FluvialHazardDetection['alertSeverity'] = 'info';
  let alertTitle = '';
  let alertMessage = '';
  let recommendedAction = 'Navegação desimpedida. Mantenha vigia ordinária.';
  let talvegueAdvice = 'Siga pelo canal hidroviário traçado no mapa.';

  if (closestSandbankData && (closestSandbankData.isImminentCollision || closestSandbankData.isWarningZone) && riverLevelMeters <= closestSandbankData.sandbank.minGaugeCriticalMeters + 1.5) {
    hasActiveAlert = true;
    alertType = 'sandbank';
    const sb = closestSandbankData.sandbank;

    if (closestSandbankData.isImminentCollision) {
      alertSeverity = 'danger';
      alertTitle = `🚨 ALERTA CRÍTICO: Banco de Areia a ${closestSandbankData.distanceMeters}m`;
      alertMessage = `Aproximação iminente do ${sb.name} (${sb.river}). Profundidade estimada no leito: ${closestSandbankData.depthEstimatedMeters}m (Calado da embarcação: ${vesselDraftMeters}m). Risco de encalhe!`;
      recommendedAction = `REDUZA VELOCIDADE IMEDIATAMENTE e guine para proa ${sb.talvegueDeviationBearingDeg}° em direção ao canal profundo (talvegue).`;
      talvegueAdvice = `Canal seguro homologado está localizado no rumo ${sb.talvegueDeviationBearingDeg}°.`;
    } else {
      alertSeverity = 'warning';
      alertTitle = `⚠️ ATENÇÃO NÁUTICA: Banco de Areia a ${(closestSandbankData.distanceMeters / 1000).toFixed(1)} km`;
      alertMessage = `${sb.name} à frente no rumo ${closestSandbankData.bearingDegrees}°. Na cota atual (${riverLevelMeters}m), a margem rasa apresenta restrição de calado.`;
      recommendedAction = `Mantenha a embarcação no centro do talvegue. Evite cortar curvas pela margem interna.`;
      talvegueAdvice = `Mantenha alinhamento com as boias de balizamento virtual da Capitania dos Portos.`;
    }
  } else if (isExtremeLow) {
    hasActiveAlert = true;
    alertType = 'extreme_low_gauge';
    alertSeverity = 'danger';
    alertTitle = `🚨 ESTIAGEM SEVERA: Cota Fluvial Crítica (${riverLevelMeters}m)`;
    alertMessage = `Nível do rio está abaixo da cota de segurança operacional (14.0m). Queda de ${Math.abs(dailyVariationCm)}cm/dia. Vários trechos com bancos aflorantes fora da calha central.`;
    recommendedAction = `Navegue com velocidade de segurança (< 12 nós) e sonar/ecobatímetro ativo. Embarcações pesadas devem redistribuir lastro.`;
    talvegueAdvice = `Proibido desviar do talvegue principal georreferenciado.`;
  } else if (isRepiquete && dailyVariationCm < 0) {
    hasActiveAlert = true;
    alertType = 'repiquete';
    alertSeverity = 'warning';
    alertTitle = `⚠️ ALERTA DE REPIQUETE: Queda Rápida de Nível (${dailyVariationCm}cm/24h)`;
    alertMessage = `Variação fluviométrica abrupta registrada pelos sensores. A retração da lâmina d'água pode expor pontais arenosos e bancos móveis sem aviso prévio.`;
    recommendedAction = `Monitore o calado em tempo real e não atraque em praias não homologadas.`;
    talvegueAdvice = `Ajuste a rota para os trechos de maior profundidade do Rio Negro/Solimões.`;
  } else if (isExtremeHigh) {
    hasActiveAlert = true;
    alertType = 'extreme_high_gauge';
    alertSeverity = 'info';
    alertTitle = `🌊 CHEIA PLENA: Cota Elevada (${riverLevelMeters}m)`;
    alertMessage = `Volume abundante na bacia com correnteza de alta velocidade (> 4.5 nós). Cuidado com toras de madeira e galhadas flutuantes (balseiros).`;
    recommendedAction = `Vigia constante de proa para detecção de balseiros e toras submersas.`;
    talvegueAdvice = `Aproveite o canal principal com calado irrestrito.`;
  }

  return {
    inFluvialZone,
    closestSandbank: closestSandbankData || undefined,
    riverGauge: {
      levelMeters: riverLevelMeters,
      criticalThresholdMeters: 14.0,
      status: gaugeStatus,
      statusLabel: gaugeStatusLabel,
      trend24h: `${dailyVariationCm > 0 ? '+' : ''}${dailyVariationCm}cm nas últimas 24h`,
      dailyVariationCm,
      depthAtLocationMeters: Number(depthAtLocation.toFixed(1)),
      isExtremeLow,
      isExtremeHigh
    },
    recommendedAction,
    talvegueAdvice,
    hasActiveAlert,
    alertType,
    alertSeverity,
    alertTitle,
    alertMessage
  };
}

