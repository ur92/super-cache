import {IProvider} from "./IProvider";
import {MaybePromise, TransactionOptions, StorageValue} from "./common";

type Unwatch = () => MaybePromise<void>;
type WatchEvent = 'update' | 'remove';
type WatchCallback = (event: WatchEvent, key: string) => any;

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

export {
    WatchEvent,
    WatchCallback,
    Unwatch,
    IStorage as default,
};
