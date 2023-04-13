import {default as IStorage, TransactionOptions, StorageValue, WatchCallback, Unwatch} from "./types/IStorage";

export default class Layer {
    private storage: IStorage;

    constructor(storage: IStorage) {
        this.storage = storage;
    }

    async mset(keyValuePairs: Array<[string, StorageValue]>): Promise<void> {
        const tasks = Object.keys(keyValuePairs).map(key => {
            return this.set(key, keyValuePairs[key])
        });
        await Promise.all(tasks);
    }

    async mget(keys: string[]): Promise<Array<StorageValue>> {
        const tasks = keys.map(key => {
            return this.get(key);
        });
        await Promise.all(tasks);
    }

    async clear(base?: string, opts?: TransactionOptions | undefined): Promise<void> {
        return this.storage.clear(base, opts);
    }

    async dispose(): Promise<void> {
        return this.storage.dispose();
    }

    async get(key: string, opts?: TransactionOptions): Promise<StorageValue> {
        return this.storage.getItem(key, opts);
    }

    async getKeys(base: string | undefined, opts?: TransactionOptions): Promise<string[]> {
        return this.storage.getKeys(base);
    }

    async has(key: string, opts?: TransactionOptions): Promise<boolean> {
        return this.storage.hasItem(key, opts);
    }

    async remove(key: string, opts?: (TransactionOptions)): Promise<void> {
        return this.storage.removeItem(key, opts);
    }

    async set(key: string, value: StorageValue, opts?: TransactionOptions): Promise<void> {
        return this.storage.setItem(key, opts);
    }

    async unwatch(): Promise<void> {
        return this.storage.unwatch();
    }

    async watch(callback: WatchCallback): Promise<Unwatch> {
        return this.storage.watch(callback);
    }


}
