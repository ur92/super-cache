import {NamespaceProvider, NamespaceSeparator} from "./types";
import {createStorage, Storage} from "unstorage";


export default class Namespace {
    private separator = ":";
    private provider: NamespaceProvider<any>;
    private cache: Storage;

    constructor() {
        this.provider = null;
        this.cache = createStorage();
    }

    setProvider<T extends Record<string, any>>(provider: NamespaceProvider<T>, separator: NamespaceSeparator){
        this.provider = provider;
        this.separator = separator;
    }

    async withNamespace(keys: string[]): Promise<string[]> {
        if(!this.provider) return keys;

        const namespace = await this.provider.get(this.provider.context);
        return this.addNamespace(keys, namespace, this.separator);
    }

    private addNamespace(keys: string[], namespace:string="", separator:string=":"): string[] {
            return keys.map(key => [namespace,key].join(separator));
    }


}