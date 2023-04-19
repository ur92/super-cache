import {
    IStorage,
    IMStorage,
    WatchCallback,
    Unwatch,
} from './types/IStorage';
import {DriverType, StorageValue, TransactionOptions} from "./types/common";
import {createStorage} from "unstorage";
import {CreateLayerOptions} from "./types";

export default class StorageLayer implements IMStorage {
    private storage: IStorage;

    constructor(driver?: DriverType, options?: CreateLayerOptions);
    constructor(storage?: IStorage);
    constructor(driverOrStorage: DriverType | IStorage, options: CreateLayerOptions = {}) {
        let storage;
        if (!driverOrStorage) {
            storage = createStorage();
        } else {
            if (typeof driverOrStorage === 'string') {
                storage = createStorage(options)
            } else {
                storage = driverOrStorage;
            }
        }
        this.storage = storage;
    }

    async mset(keyValuePairs: Array<[string, StorageValue]>, options?: TransactionOptions): Promise<void> {
        const tasks = keyValuePairs.map(([key, value]) => {
            return this.setItem(key, value, options);
        });
        await Promise.all(tasks);
    }

    async mget(keys: string[], options?: TransactionOptions): Promise<Array<StorageValue>> {
        const tasks = keys.map((key) => {
            return this.getItem(key, options);
        });
        return await Promise.all(tasks);
    }

    async clear(
        base?: string,
        opts?: TransactionOptions | undefined
    ): Promise<void> {
        return this.storage.clear(base, opts);
    }

    async dispose(): Promise<void> {
        return this.storage.dispose();
    }

    async getItem(key: string, opts?: TransactionOptions): Promise<StorageValue> {
        return this.storage.getItem(key, opts);
    }

    async getKeys(
        base?: string,
        opts?: TransactionOptions
    ): Promise<string[]> {
        return this.storage.getKeys(base, opts);
    }

    async hasItem(key: string, opts?: TransactionOptions): Promise<boolean> {
        return this.storage.hasItem(key, opts);
    }

    async removeItem(key: string, opts?: TransactionOptions): Promise<void> {
        return this.storage.removeItem(key, opts);
    }

    async setItem(
        key: string,
        value: StorageValue,
        opts?: TransactionOptions
    ): Promise<void> {
        return this.storage.setItem(key, value, opts);
    }

    async unwatch(): Promise<void> {
        return this.storage.unwatch();
    }

    async watch(callback: WatchCallback): Promise<Unwatch> {
        return this.storage.watch(callback);
    }
}
