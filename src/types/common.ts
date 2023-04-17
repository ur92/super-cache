type StorageValue = undefined | null | string | number | boolean | object;
type TransactionOptions = Record<string, any>;
type MaybePromise<T> = T | Promise<T>;
// type NamespaceProvider =

export {MaybePromise, TransactionOptions, StorageValue};
