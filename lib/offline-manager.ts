export class OfflineManager {
  private static readonly CACHE_NAME = 'jaraq-offline-cache-v1';

  static async saveCache(key: string, data: any) {
    if (typeof window === 'undefined') return;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = new Response(JSON.stringify(data));
      await cache.put(`/${key}`, response);
    } catch (e) {
      console.warn('Cache save limits reached or disabled', e);
    }
  }

  static async loadCache(key: string) {
    if (typeof window === 'undefined') return null;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = await cache.match(`/${key}`);
      if (response) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Cache loading failed', e);
    }
    return null;
  }

  static async cacheRoute(routeId: string, routeData: any) {
    await this.saveCache(`route-${routeId}`, routeData);
  }

  static async getOfflineRoute(routeId: string) {
    return await this.loadCache(`route-${routeId}`);
  }
}
