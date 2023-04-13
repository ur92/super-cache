import {createStorage, CreateStorageOptions, Storage, StorageValue} from "unstorage";

type TransactionOptions = Record<string, any>;

export default class Cache{
    layers: Array<Storage>;

    constructor() {
        this.layers = [];
    }

    private get layersLength(){
        return this.layers.length;
    }

    withLayer(options: CreateStorageOptions){
        const storage = createStorage(options);
        this.layers.push(storage);
        return this;
    }

    // Recursively read cached values
    // or deep down to lower cache layer if there is at least a key is not cached.
    // @param {Array<Promise>} tasks Array of set tasks of the previous job.
    private async traverseGet (index, keys, tasks) {
        const layer = this.layers[index];
        const values = await this.mget(...keys)

        if (++ index >= this.layersLength) {
            return values
        }

        const keyIndexes = []
        const keysOfMissedValues = values.reduce((missed, value, i) => {
            if (this._isNotFound(value)) {
                keyIndexes.push(i)
                missed.push(keys[i])
            }

            return missed
        }, [])

        if (!keysOfMissedValues.length) {
            return values
        }

        const valuesFromLowerLayer = await this.traverseGet(
            index, keysOfMissedValues, tasks)

        const keyValuePairsToSet = []
        valuesFromLowerLayer.forEach((value, i) => {
            if (this.isNotFound(value)) {
                return
            }

            // Update old values
            values[keyIndexes[i]] = value
            const key = keysOfMissedValues[i]
            keyValuePairsToSet.push([key, value])
        })

        if (keyValuePairsToSet.length) {
            // Update the cache of the current layer
            tasks.push(layer.mset(...keyValuePairsToSet))
        }

        return values
    }

    async mget (...keys) {
        if (!keys.length) {
            return []
        }

        const tasks = []
        const values = await this.traverseGet(0, keys, tasks)

        if (tasks.length) {
            await Promise.all(tasks)
        }

        return values
    }

    clear(base: string | undefined, opts: TransactionOptions | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }

    dispose(): Promise<void> {
        return Promise.resolve(undefined);
    }

    get(key: string, opts: TransactionOptions | undefined): Promise<StorageValue> {

        return Promise.resolve(undefined);
    }

    getItemRaw(key: string, opts: TransactionOptions | undefined): Promise<any> {
        return Promise.resolve(undefined);
    }

    getKeys(base: string | undefined, opts: TransactionOptions | undefined): Promise<string[]> {
        return Promise.resolve([]);
    }

    getMeta(key: string, opts: (TransactionOptions & { nativeOnly?: boolean }) | boolean | undefined): MaybePromise<StorageMeta> {
        return undefined;
    }

    getMount(key: string | undefined): { base: string; driver: Driver } {
        return {base: "", driver: undefined};
    }

    getMounts(base: string | undefined, options: { parents?: boolean } | undefined): { base: string; driver: Driver }[] {
        return [];
    }

    hasItem(key: string, opts: TransactionOptions | undefined): Promise<boolean> {
        return Promise.resolve(false);
    }



    removeItem(key: string, opts: (TransactionOptions & { removeMata?: boolean }) | boolean | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }



    setItem(key: string, value: StorageValue, opts: TransactionOptions | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }

    setItemRaw(key: string, value: any, opts: TransactionOptions | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }

    setMeta(key: string, value: StorageMeta, opts: TransactionOptions | undefined): Promise<void> {
        return Promise.resolve(undefined);
    }


    unwatch(): Promise<void> {
        return Promise.resolve(undefined);
    }

    watch(callback: WatchCallback): Promise<Unwatch> {
        return Promise.resolve(undefined);
    }

}