import { createStorage, CreateStorageOptions } from 'unstorage';
import { isUnset, requireStorage } from './utils';
import Layer from './Layer';
import IStorage, { StorageValue } from './types/IStorage';
import {CreateLayerOptions} from "./types/ILayerOptions";

type TransactionOptions = Record<string, any>;

export default class Cache {
    private layers: Array<Layer>;

    constructor() {
        this.layers = [];
    }

    withLayer(options?: CreateLayerOptions) {
        const storage = createStorage(options);
        return this.withStorageLayer(storage);
    }

    private withStorageLayer(storage: IStorage) {
        const layer = new Layer(storage);
        this.layers.push(layer);
        return this;
    }

    @requireStorage
    async msync(keys: string[]): Promise<Array<StorageValue>> {
        const values = await this.layer(-1).mget(keys);
        const pairs = [];
        values.forEach((value, i) => {
            if (isUnset(value)) {
                return;
            }

            pairs.push([keys[i], value]);
        });

        const tasks = this.layers
            .slice(0, -1)
            .map((layer) => layer.mset(pairs));

        await Promise.all(tasks);
        return values;
    }

    async mget(...keys: string[]): Promise<StorageValue>;
    async mget(keys: string[]): Promise<StorageValue>;
    @requireStorage
    async mget(firstArg: string | string[], ...rest: string[]): Promise<Array<StorageValue>> {
        const keysToFetch = Array.isArray(firstArg)? firstArg: Array(firstArg,...rest);
        if (!keysToFetch.length) {
            return [];
        }

        const tasks = [];
        const values = await this.traverseGet(0, keysToFetch, tasks);

        if (tasks.length) {
            await Promise.all(tasks);
        }

        return values;
    }

    @requireStorage
    async mset(pairs: Record<string, StorageValue>  | Array<[string, StorageValue]>): Promise<void>{
        const pairsToUpdate = Array.isArray(pairs)? pairs: Object.entries<StorageValue>(pairs);
        return await this.forEachLayer((layer) => layer.mset(pairsToUpdate));
    }

    @requireStorage
    async sync(key: string): Promise<StorageValue> {
        return this.msync([key]).then(values => values[0]);
    }

    @requireStorage
    async get(key: string): Promise<StorageValue> {
        return await this.mget([key]).then(values => values[0]);
    }

    @requireStorage
    async set(key: string, value: StorageValue): Promise<void> {
        return this.forEachLayer(async (layer) => await layer.set(key, value));
    }

    @requireStorage
    private async traverseGet(
        index: number,
        keys: string[],
        tasks
    ): Promise<Array<StorageValue>> {
        const layer = this.layers[index];
        const values = await layer.mget(keys);

        if (++index >= this.layersLength) {
            return values;
        }

        const keyIndexes = [];
        const keysOfMissedValues = values.reduce<string[]>(
            (missed, value, i) => {
                if (isUnset(value)) {
                    keyIndexes.push(i);
                    missed.push(keys[i]);
                }

                return missed;
            },
            []
        );

        if (!keysOfMissedValues.length) {
            return values;
        }

        const valuesFromLowerLayer = await this.traverseGet(
            index,
            keysOfMissedValues,
            tasks
        );

        const keyValuePairsToSet: Array<[string, StorageValue]> = [];
        valuesFromLowerLayer.forEach((value, i) => {
            if (isUnset(value)) {
                return;
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

    private get layersLength() {
        return this?.layers?.length ?? 0;
    }

    private layer(n): Layer {
        return n < 0 ? this.layers[this.layersLength + n] : this.layers[n];
    }

    private async forEachLayer(fn: (layer: Layer) => any): Promise<any> {
        return await Promise.all(this.layers.map(fn));
    }
}
