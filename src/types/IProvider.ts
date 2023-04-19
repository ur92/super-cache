import {StorageValue, TransactionOptions} from "./common";

type GettableItem<T> = (key: string, opts?: TransactionOptions) => Promise<T>;

interface IProvider {
    hasItem: GettableItem<boolean>;
    getItem: GettableItem<StorageValue>;
}

export {IProvider, GettableItem};