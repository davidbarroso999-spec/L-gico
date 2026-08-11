import { FLUVIAL_PORTS } from './route-engine';

export const FLUVIAL_ONLY_KEYWORDS = ['careiro', 'manaquiri', 'autazes', 'iranduba', 'cacau pirêra', 'cacau pirera', 'comunidade', 'ribeirinho', 'balsa', 'rio', 'ilha', 'barreirinha', 'borba', 'coari', 'tefé', 'tefe', 'jutaí', 'jutai', 'fonte boa', 'alvarães', 'alvaraes', 'japurá', 'japura', 'maraã', 'maraa', 'uamini', 'codajás', 'codajas'];

export function isFluvialOnly(address: string): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  return FLUVIAL_ONLY_KEYWORDS.some(k => lower.includes(k));
}

export function checkHybridRoute(addresses: string[]): boolean {
  if (addresses.length < 2) return false;
  
  let hasTerrestrial = false;
  let hasFluvial = false;

  for (const addr of addresses) {
    if (isFluvialOnly(addr)) {
      hasFluvial = true;
    } else {
      hasTerrestrial = true;
    }
  }

  return hasTerrestrial && hasFluvial;
}
