import {isUnset, requireStorage} from './utils';
import StorageLayer from './StorageLayer';
import {CreateLayerOptions} from "./types/ILayerOptions";
import {DriverType, NamespaceContext, NamespaceProvider, StorageValue, TransactionOptions} from "./types/common";
import Namespace from "./Namespace";
import ValuesProvider from "./ValuesProvider";
import {GettableItem, IMStorage, IProvider, IStorage} from "./types";


export default class Cache {
    private storageLayers: Array<StorageLayer>;
    private namespace: Namespace;
    private valuesProvider: ValuesProvider;

    constructor() {
        this.storageLayers = [];
        this.valuesProvider = new ValuesProvider();
        this.namespace = new Namespace();
    }

    addStorage(driver?: DriverType, options?: CreateLayerOptions);
    addStorage(storage?: StorageLayer);
    addStorage(driverOrStorage: DriverType | StorageLayer, options: CreateLayerOptions = {}) {
        let storageLayer: StorageLayer;
        if (!driverOrStorage) {
            storageLayer = new StorageLayer();
        } else {
            if (typeof driverOrStorage === 'string') {
                storageLayer = new StorageLayer(driverOrStorage, options);
            } else {
                storageLayer = driverOrStorage;
            }
        }
        this.storageLayers.push(storageLayer);
        return this;
    }

    setNamespace<T extends NamespaceContext>(context: T, provider: NamespaceProvider<T>, separator?: string) {
        this.namespace.setProvider(context, provider, separator);
    }

    addValueProvider(base: string, getItem: GettableItem<StorageValue>, hasItem?: GettableItem<boolean>) {
        this.valuesProvider.add(base, getItem, hasItem);
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

        const tasks = this.storageLayers
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
        if (Array.isArray(fullPairs)) {
            pairsToUpdate = fullPairs;
        } else {
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
        return this.forEachLayer(async (layer) => await layer.setItem(key, value));
    }

    @requireStorage
    async clear(base?: string, opts?: TransactionOptions): Promise<void> {
        const [fullBase] = await this.namespace.addNamespaceToKeys(base);
        return this.forEachLayer(async (layer) => await layer.clear(fullBase, opts));
    }

    @requireStorage
    private async traverseGet(
        index: number,
        keys: string[],
        tasks
    ): Promise<Array<StorageValue>> {
        if (this.noMoreLayers(index)){
            return this.valuesProvider.getItems(keys);
        }

        const layer = this.storageLayers[index];
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

    private mergeHigherLayerValues(valuesFromLowerLayer: Array<StorageValue>, values: Array<StorageValue>, missedKeys: { indexes: number[], keys: string[] }) {
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

    private isAllKeysFound(keysOfMissedValues: { indexes: number[], keys: string[] }) {
        return !keysOfMissedValues.keys.length;
    }

    private get layersLength() {
        return this?.storageLayers?.length ?? 0;
    }

    private layer(n): StorageLayer {
        return n < 0 ? this.storageLayers[this.layersLength + n] : this.storageLayers[n];
    }

    private async forEachLayer(fn: (layer: StorageLayer) => any): Promise<any> {
        return await Promise.all(this.storageLayers.map(fn));
    }
}
