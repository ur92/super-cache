import {StorageValue, TransactionOptions} from "./common";

export interface IProvider {
    hasItem: (key: string, opts?: TransactionOptions) => Promise<boolean>;
    getItem: (key: string, opts?: TransactionOptions) => Promise<StorageValue>;
}