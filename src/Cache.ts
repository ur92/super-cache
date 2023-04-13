import {
    createStorage,
    CreateStorageOptions,
} from "unstorage";
import {isUnset} from "./utils";
import Layer from "./Layer";
import IStorage, {StorageValue} from "./types/IStorage";
import {a} from "unstorage/dist/types-bb85dfb7";

type TransactionOptions = Record<string, any>;

export default class Cache {
    layers: Array<Layer>;

    constructor() {
        this.layers = [];
    }

    withLayer(options: CreateStorageOptions){
        const storage = createStorage(options);
        return this.withStorageLayer(storage);
    }

    withStorageLayer(storage: IStorage){
        const layer = new Layer(storage);
        this.layers.push(layer);
        return this;
    }

    async msync (keys: string[]): Promise<Array<StorageValue>> {
        const values = await this.layer(-1).mget(keys);
        const pairs = [];
        values.forEach((value, i) => {
            if (isUnset(value)) {
                return;
            }

            pairs.push([keys[i], value]);
        })

        const tasks = this.layers
            .slice(0, -1)
            .map(layer => layer.mset(pairs));

        await Promise.all(tasks);
        return values;
    }

    async mget (keys: string[]): Promise<StorageValue> {
        if (!keys.length) {
            return [];
        }

        const tasks = [];
        const values = await this.traverseGet(0, keys, tasks);

        if (tasks.length) {
            await Promise.all(tasks);
        }

        return values;
    }

    mset (pairs: Array<[string, StorageValue]>): Promise<void> {
        return this.forEachLayer(layer => layer.mset(pairs));
    }

    sync (key: string): Promise<StorageValue> {
        return this.msync([key]).then(values => values[0]);
    }

    get (key: string): Promise<StorageValue>{
        return this.mget([key]).then(values => values[0]);
    }

    set (key: string, value: StorageValue): Promise<void>{
        return this.forEachLayer(layer => layer.set(key, value));
    }


    private layer (n): Layer {
        return n < 0
            ? this.layers[this.layersLength + n]
            : this.layers[n];
    }

    private forEachLayer (fn: (layer: Layer)=> any): Promise<any> {
        return Promise.all(this.layers.map(fn));
    }

    private get layersLength(){
        return this.layers.length;
    }

    // Recursively read cached values
    // or deep down to lower cache layer if there is at least a key is not cached.
    // @param {Array<Promise>} tasks Array of set tasks of the previous job.
    private async traverseGet (index: number, keys: string[], tasks): Promise<Array<StorageValue>> {
        const layer = this.layers[index];
        const values = await layer.mget(keys);

        if (++ index >= this.layersLength) {
            return values;
        }

        const keyIndexes = []
        const keysOfMissedValues = values.reduce<string[]>((missed, value, i) => {
            if (isUnset(value)) {
                keyIndexes.push(i);
                missed.push(keys[i]);
            }

            return missed;
        }, [])

        if (!keysOfMissedValues.length) {
            return values;
        }

        const valuesFromLowerLayer = await this.traverseGet(index, keysOfMissedValues, tasks);

        const keyValuePairsToSet: Array<[string, StorageValue]> = [];
        valuesFromLowerLayer.forEach((value, i) => {
            if (isUnset(value)) {
                return
            }

            // Update old values
            values[keyIndexes[i]] = value;
            const key = keysOfMissedValues[i];
            keyValuePairsToSet.push([key, value]);
        });

        if (keyValuePairsToSet.length) {
            // Update the cache of the current layer
            tasks.push(layer.mset(keyValuePairsToSet));
        }

        return values;
    }
    



}