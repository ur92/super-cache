import { IProvider } from './IProvider';
import { MaybePromise, StorageValue, TransactionOptions } from './common';

type Unwatch = () => MaybePromise<void>;
type WatchEvent = 'update' | 'remove';
type WatchCallback = (event: WatchEvent, key: string) => any;

interface IStorage extends IProvider {
    setItem: (
        key: string,
        value: StorageValue,
        opts?: TransactionOptions
    ) => Promise<void>;
    removeItem: (key: string, opts?) => Promise<void>;
    getKeys: (base?: string, opts?: TransactionOptions) => Promise<string[]>;
    clear: (base?: string, opts?: TransactionOptions) => Promise<void>;
    dispose: () => Promise<void>;
    watch: (callback: WatchCallback) => Promise<Unwatch>;
    unwatch: () => Promise<void>;
}

interface IMStorage extends IStorage {
    mset(
        keyValuePairs: Array<[string, StorageValue]>,
        options?: TransactionOptions
    ): Promise<void>;
    mget(
        keys: string[],
        options?: TransactionOptions
    ): Promise<Array<StorageValue>>;
}

export { WatchEvent, WatchCallback, Unwatch, IStorage, IMStorage };
