type StorageValue = undefined | null | string | number | boolean | object;
type TransactionOptions = Record<string, any>;
type MaybePromise<T> = T | Promise<T>;
type NamespaceProvider<T extends {[key:string]:any}> = {
     get: (params: T)=> Promise<string>,
     context: T,
};
type NamespaceSeparator = string;


export {MaybePromise, TransactionOptions, StorageValue, NamespaceProvider, NamespaceSeparator};
