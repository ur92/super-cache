import {createStorage, Storage} from "unstorage";
import hash from 'object-hash';
import {NamespaceContext, NamespaceProvider, NamespaceSeparator, StorageValue} from "./types";

type RecordLike<K extends keyof any, V> = Record<K, V> | Array<[K, V]>;

export default class Namespace {
    private separator = ":";
    private provider: NamespaceProvider<any>;
    private context: NamespaceContext;
    private cache: Storage;

    constructor() {
        this.provider = null;
        this.context = null;
        this.cache = createStorage();
    }

    setProvider<T extends NamespaceContext>(context: T, provider: NamespaceProvider<T>, separator: NamespaceSeparator) {
        this.provider = provider;
        this.context= context;
        this.separator = separator;
    }

    async addNamespaceToPairs(keyValuePairs: RecordLike<string, StorageValue>): Promise<RecordLike<string, StorageValue>> {
        if (!this.provider) return keyValuePairs;
        let result: RecordLike<string, StorageValue>;
        const namespace = await this.getNamespace();
        if (Array.isArray(keyValuePairs)) {
            result = keyValuePairs.map<[string, StorageValue]>(([key, value]) => {
                const fullKey = this.join(key, namespace, this.separator);
                return [fullKey, value];
            });
        } else {
            result = Object.keys(keyValuePairs)
                .reduce<Record<string, StorageValue>>((curr, key) => {
                    const fullKey = this.join(key, namespace, this.separator);
                    curr[fullKey] = keyValuePairs[key];
                    return curr;
                }, {});
        }
        return result
    }

    async addNamespaceToKeys(...keys: string[]): Promise<string[]>;
    async addNamespaceToKeys(keys: string[]): Promise<string[]>;
    async addNamespaceToKeys(firstArg: string | string[], ...rest: string[]): Promise<string[]> {
        const keys = Array.isArray(firstArg) ? firstArg : Array(firstArg, ...rest);

        if (!this.provider) return keys;

        const namespace = await this.getNamespace();
        return this.join(keys, namespace, this.separator);
    }

    private async getNamespace(): Promise<string> {
        let contextHash = this.hash(this.context);
        let namespace = await this.cache.getItem(contextHash) as string;
        if (!namespace) {
            namespace = await this.provider(this.context);
            await this.cache.setItem(contextHash, namespace);
        }
        return namespace;
    }

    private hash(context: any) {
        return hash.MD5(context);
    }

    private join(keys: string[], namespace: string, separator: string): string[] ;
    private join(key: string, namespace: string, separator: string): string ;
    private join(keys: string | string[], namespace: string = "", separator: string = ":"): string | string[] {
        const joinNamespace = (key: string) => {
            return [namespace, key].join(separator);
        }

        if (Array.isArray(keys)) {
            return keys.map(key => joinNamespace(key));
        } else {
            return joinNamespace(keys);
        }
    }


}