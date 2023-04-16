type Unwatch = () => MaybePromise<void>;
type StorageValue = undefined | null | string | number | boolean | object;
type WatchEvent = 'update' | 'remove';
type WatchCallback = (event: WatchEvent, key: string) => any;

type TransactionOptions = Record<string, any>;
type MaybePromise<T> = T | Promise<T>;

interface IStorage extends IProvider{
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

interface IProvider {
    hasItem: (key: string, opts?: TransactionOptions) => Promise<boolean>;
    getItem: (key: string, opts?: TransactionOptions) => Promise<StorageValue>;
}

export {
    TransactionOptions,
    StorageValue,
    WatchEvent,
    WatchCallback,
    Unwatch,
    MaybePromise,
    IStorage as default,
};
