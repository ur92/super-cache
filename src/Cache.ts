import {createStorage, CreateStorageOptions} from 'unstorage';
import {isUnset, requireStorage} from './utils';
import Layer from './Layer';
import {CreateLayerOptions} from "./types/ILayerOptions";
import {NamespaceContext, NamespaceProvider, StorageValue} from "./types/common";
import Namespace from "./Namespace";


export default class Cache {
    private layers: Array<Layer>;
    private namespace: Namespace;

    constructor() {
        this.layers = [];
        this.namespace = new Namespace();
    }

    pushLayer(layer?: Layer);
    pushLayer(options?: CreateLayerOptions);
    pushLayer(layerOrOptions: Layer | CreateLayerOptions = {}) {
        let layer: Layer;
        if (layerOrOptions instanceof Layer) {
            layer = layerOrOptions;
        } else {
            layer = new Layer(layerOrOptions);
        }
        this.layers.push(layer);
        return this;
    }

    setNamespace<T extends NamespaceContext>(context: T, provider: NamespaceProvider<T>, separator?: string) {
        this.namespace.setProvider(context, provider, separator);
    }

    withProvider() {

    }

    async msync(...keys: string[]): Promise<StorageValue>;
    async msync(keys: string[]): Promise<StorageValue>;
    @requireStorage
    async msync(firstArg: string | string[], ...rest: string[]): Promise<Array<StorageValue>> {
        const keys = Array.isArray(firstArg) ? firstArg : Array(firstArg, ...rest);
        const fullKeys = await this.namespace.addNamespaceToKeys(keys);

        const values = await this.layer(-1).mget(fullKeys);
        const pairs = [];
        values.forEach((value, i) => {
            if (isUnset(value)) {
                return;
            }

            pairs.push([fullKeys[i], value]);
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
        const keys = Array.isArray(firstArg) ? firstArg : Array(firstArg, ...rest);
        const fullKeys = await this.namespace.addNamespaceToKeys(keys);

        if (!fullKeys.length) {
            return [];
        }

        const tasks = [];
        const values = await this.traverseGet(0, fullKeys, tasks);

        if (tasks.length) {
            await Promise.all(tasks);
        }

        return values;
    }

    @requireStorage
    async mset(pairs: Record<string, StorageValue> | Array<[string, StorageValue]>): Promise<void> {
        const fullPairs = await this.namespace.addNamespaceToPairs(pairs)

        let pairsToUpdate;
        if(Array.isArray(fullPairs)){
            pairsToUpdate = fullPairs;
        }
        else{
            pairsToUpdate = Object.entries<StorageValue>(fullPairs);
        }
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
        if(this.noMoreLayers(index)) return [];

        const layer = this.layers[index];
        const values = await layer.mget(keys);

        const missedKeys = this.getMissedKeys(values, keys);

        if (this.isAllKeysFound(missedKeys)) {
            return values;
        }

        const valuesFromHigherLayer = await this.traverseGet(
            ++index,
            missedKeys.keys,
            tasks
        );

        const keyValuePairsToSet = this.mergeHigherLayerValues(valuesFromHigherLayer, values, missedKeys);

        if (keyValuePairsToSet.length) {
            // produce update task of the current layer
            tasks.push(layer.mset(keyValuePairsToSet));
        }

        return values;
    }

    private getMissedKeys(values: Array<StorageValue>, keys: string[]) {
        const indexes: number[] = [];
        const missedKeys = values.reduce<string[]>((missed, value, i) => {
            if (isUnset(value)) {
                indexes.push(i);
                missed.push(keys[i]);
            }
            return missed;
        }, []);
        return {indexes, keys: missedKeys};
    }

    private noMoreLayers(index: number) {
        return index >= this.layersLength;
    }

    private mergeHigherLayerValues(valuesFromLowerLayer: Array<StorageValue>, values: Array<StorageValue>, missedKeys: {indexes: number[], keys: string[]}) {
        const {indexes, keys} = missedKeys;
        const keyValuePairsToSet: Array<[string, StorageValue]> = [];
        valuesFromLowerLayer.forEach((value, i) => {
            if (isUnset(value)) {
                return;
            }
            // Update old values
            values[indexes[i]] = value;
            const key = keys[i];
            keyValuePairsToSet.push([key, value]);
        });
        return keyValuePairsToSet;
    }

    private isAllKeysFound(keysOfMissedValues: {indexes: number[], keys: string[]}) {
        return !keysOfMissedValues.keys.length;
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
