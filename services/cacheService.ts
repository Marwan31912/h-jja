
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'AladdinOfflineCache';
const DB_VERSION = 2;

export class CacheService {
  private static db: Promise<IDBPDatabase>;

  private static getDB() {
    if (!this.db) {
      this.db = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const collections = [
            'books', 'invoices', 'purchaseHistory', 'financialLedger',
            'suppliers', 'customers', 'debtRecords', 'categories',
            'subCategories', 'publishers', 'users', 'lockedPages',
            'settings_config', 'schoolBookSeries', 'schoolBookGrades'
          ];
          collections.forEach(col => {
            if (!db.objectStoreNames.contains(col)) {
              db.createObjectStore(col);
            }
          });
        },
      });
    }
    return this.db;
  }

  static async saveCollection(name: string, data: any[]) {
    try {
      const db = await this.getDB();
      const tx = db.transaction(name, 'readwrite');
      const store = tx.objectStore(name);
      await store.clear();
      // We store the whole array as a single entry under key 'data' 
      // or we can store each item. Storing as single entry is easier for "snapshot" style.
      await store.put(data, 'snapshot');
      await tx.done;
    } catch (e) {
      console.error(`Failed to save collection ${name} to cache:`, e);
    }
  }

  static async loadCollection(name: string): Promise<any[] | null> {
    try {
      const dbPromise = this.getDB();
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 3000)
      );
      
      const db = await Promise.race([dbPromise, timeoutPromise]);
      if (!db) {
        console.warn(`Load collection ${name} timed out opening DB`);
        return null;
      }

      const data = await db.get(name, 'snapshot');
      return data || null;
    } catch (e) {
      console.error(`Failed to load collection ${name} from cache:`, e);
      return null;
    }
  }
}
