type StorageValue = null | string | number | boolean | object;
type TransactionOptions = Record<string, any>;
type MaybePromise<T> = T | Promise<T>;
type NamespaceContext = { [key: string]: any };
type NamespaceProvider<T extends NamespaceContext> = (context: T) => Promise<string>;
type NamespaceSeparator = string;
type DriverType = 'redis'| 'lru-cache';

export {DriverType, MaybePromise, TransactionOptions, StorageValue, NamespaceProvider, NamespaceSeparator, NamespaceContext};
