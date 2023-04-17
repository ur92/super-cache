import {
    default as IStorage,
    WatchCallback,
    Unwatch,
} from './types/IStorage';
import {StorageValue, TransactionOptions} from "./types/common";
import {createStorage} from "unstorage";
import {CreateLayerOptions} from "./types";

export default class Layer {
    private storage: IStorage;

    constructor(options: CreateLayerOptions = {}, storage?: IStorage){
        if (!storage){
            storage = createStorage(options);
        }

        this.storage = storage;
    }

    async mset(keyValuePairs: Array<[string, StorageValue]>, options?: TransactionOptions): Promise<void> {
        const tasks = keyValuePairs.map(([key, value]) => {
            return this.set(key, value, options);
        });
        await Promise.all(tasks);
    }

    async mget(keys: string[], options?: TransactionOptions): Promise<Array<StorageValue>> {
        const tasks = keys.map((key) => {
            return this.get(key, options);
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

    async get(key: string, opts?: TransactionOptions): Promise<StorageValue> {
        return this.storage.getItem(key, opts);
    }

    async getKeys(
        base?: string,
        opts?: TransactionOptions
    ): Promise<string[]> {
        return this.storage.getKeys(base, opts);
    }

    async has(key: string, opts?: TransactionOptions): Promise<boolean> {
        return this.storage.hasItem(key, opts);
    }

    async remove(key: string, opts?: TransactionOptions): Promise<void> {
        return this.storage.removeItem(key, opts);
    }

    async set(
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
