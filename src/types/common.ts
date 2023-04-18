type StorageValue = undefined | null | string | number | boolean | object;
type TransactionOptions = Record<string, any>;
type MaybePromise<T> = T | Promise<T>;
type NamespaceContext = { [key: string]: string };
type NamespaceProvider<T extends { [key: string]: string }> = (context: T) => Promise<string>;
type NamespaceSeparator = string;


export {MaybePromise, TransactionOptions, StorageValue, NamespaceProvider, NamespaceSeparator, NamespaceContext};
