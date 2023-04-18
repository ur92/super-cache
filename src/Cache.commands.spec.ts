import Cache from "./Cache";
import Layer from "./Layer";
import {createStorage} from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import {StorageValue, TransactionOptions} from "./types/common";

const mockLayer = (data) => ({
    mget: jest.fn(async function (keys: string[]) {
        return keys.map((key) => data[key] || undefined);
    }),
    mset: jest.fn(async function (pairs: Array<[string, any]>) {
        pairs.forEach(([key, value]) => {
            data[key] = value;
        });
    }),
    set: jest.fn(async function (key: string, value: StorageValue, opt?: TransactionOptions) {
        data[key] = value;
        return Promise.resolve();
    })
} as any);

describe("Cache Commands", () => {
    let cache: Cache;

    beforeEach(() => {
        cache = new Cache();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', function () {
        it('should validate at least one storage before use', function () {
            expect(cache.set('foo', 'boo')).rejects.toThrow();
        });
    });

    describe("withLayer", () => {
        it("should create a new layer by passed options", () => {
            cache.pushLayer({});
            expect(cache["layers"]).toHaveLength(1);
            expect(cache["layers"][0]).toBeInstanceOf(Layer);
        });

        it("should add a custom layer instance", () => {
            let layer = new Layer({});
            cache.pushLayer(layer);
            expect(cache["layers"]).toHaveLength(1);
            expect(cache["layers"][0]).toBeInstanceOf(Layer);
            expect(cache["layers"][0]).toEqual(layer);
        });
    });

    describe("msync", () => {
        beforeEach(function () {
            cache.pushLayer();
        });
        it("should read keys from last layer and update lower layers", async () => {
            const keys = ["key1", "key2"];
            const values: StorageValue[] = ["value1", "value2"];
            const mgetMock = jest.fn().mockResolvedValue(values);
            const msetMock = jest.fn().mockResolvedValue(undefined);
            const layers = [
                {mget: jest.fn(), mset: msetMock},
                {mget: mgetMock, mset: jest.fn()},
            ] as unknown as Layer[];

            cache["layers"] = layers;

            const result = await cache.msync(keys);

            expect(layers[0].mget).toHaveBeenCalledTimes(0);
            expect(layers[0].mset).toHaveBeenCalledTimes(1);
            expect(layers[0].mset).toHaveBeenCalledWith([
                ["key1", "value1"],
                ["key2", "value2"],
            ]);

            expect(layers[1].mget).toHaveBeenCalledTimes(1);
            expect(layers[1].mset).toHaveBeenCalledTimes(0);

            expect(result).toEqual(values);
        });

        it("should return an empty array if keys array is empty", async () => {
            const result = await cache.msync([]);
            expect(result).toEqual([]);
        });
    });

    describe('mget', () => {
        beforeEach(function () {
            cache["layers"] = [mockLayer({})];
        });

        it('should return an empty array when no keys are provided', async () => {
            const result = await cache.mget();
            expect(result).toEqual([]);
        });

        it('should return undefined for unknown keys', async () => {
            const result = await cache.mget('foo');
            expect(result).toEqual([undefined]);
        });

        it('should return an array of values for the provided keys', async () => {
            const key1 = 'foo';
            const key2 = 'bar';
            const value1 = 'hello';
            const value2 = 'world';
            await cache.mset([[key1, value1], [key2, value2]]);
            const result = await cache.mget(key1, key2);
            expect(result).toEqual([value1, value2]);
        });


        it('should return values for a single layer cache', async () => {
            await cache.set('foo', 'bar');
            const result = await cache.mget(['foo']);
            expect(result).toEqual(['bar']);
        });

        describe('multi-layer', function () {
            let layers;
            beforeEach(function () {
                layers = [mockLayer({}), mockLayer({}), mockLayer({})];
                cache["layers"] = layers;
            });
            it('should return values from a the deepest layer ', async () => {
                //set only on third layer
                await layers[2].set('foo', 'bar');
                const result = await cache.mget('foo');
                expect(result).toEqual(['bar']);
                expect(layers[0].mget).toHaveBeenCalledWith(['foo']);
                expect(layers[1].mget).toHaveBeenCalledWith(['foo']);
                expect(layers[2].mget).toHaveBeenCalledWith(['foo']);
                //mset
                expect(layers[0].mset).toHaveBeenCalledWith([['foo', 'bar']]);
                expect(layers[1].mset).toHaveBeenCalledWith([['foo', 'bar']]);
                //negative
                expect(layers[2].mset).not.toHaveBeenCalled();
            });

            it('should keep layer priority', async () => {
                await cache.set('foo', 'bar');
                //base layer
                await layers[0].mset([['key0', 'val0']]);
                const result3 = await cache.mget('key0', 'key1', 'key2');
                expect(result3).toEqual(['val0', undefined, undefined]);
                //second layer
                await layers[1].mset([['key0', 'val1'], ['key1', 'val1']]);
                const result2 = await cache.mget('key0', 'key1', 'key2');
                expect(result2).toEqual(['val0', 'val1', undefined]);
                //deepest layer
                await layers[2].mset([['key0', 'val2'], ['key1', 'val2'], ['key2', 'val2']]);
                const result = await cache.mget('key0', 'key1', 'key2');
                expect(result).toEqual(['val0', 'val1', 'val2']);
            });
        });

    });

    describe('mset', () => {
        beforeEach(function () {
            cache["layers"] = [mockLayer({}), mockLayer({})];
        });

        it('should set multiple key-value pairs in all layers', async () => {
            const pairs = {foo: 'hello', bar: 'world'};
            await cache.mset(pairs);
            // mset
            expect(cache['layers'][0].mset).toHaveBeenCalledWith([['foo', 'hello'], ['bar', 'world']]);
            expect(cache['layers'][1].mset).toHaveBeenCalledWith([['foo', 'hello'], ['bar', 'world']]);
            // mget
            expect(await cache['layers'][0].mget(['foo', 'bar'])).toEqual(['hello', 'world']);
            expect(await cache['layers'][1].mget(['foo', 'bar'])).toEqual(['hello', 'world']);
        });
    });

    describe('sync', () => {
        const key = 'foo';
        const value = 'hello';
        beforeEach(function () {
            cache["layers"] = [mockLayer({}), mockLayer({}), mockLayer({[key]: value})];
        });

        it('should return the value for the provided key', async () => {
            // negative
            expect(await cache['layers'][0].mget([key])).toEqual([undefined]);
            // sync
            const result = await cache.sync(key);
            expect(result).toEqual(value);
            // positive
            expect(await cache['layers'][0].mget([key])).toEqual([value]);

        });
    });

    describe('get', () => {
        beforeEach(function () {
            cache["layers"] = [mockLayer({}), mockLayer({}), mockLayer({})];
        });

        it('should return the value for the provided key', async () => {
            const key = 'foo';
            const value = 'hello';
            await cache.set(key, value);
            const result = await cache.get(key);
            expect(result).toEqual(value);
        });
    });

    describe('set', () => {
        beforeEach(function () {
            cache["layers"] = [mockLayer({}), mockLayer({}), mockLayer({})];
        });

        it('should set the value for the provided key in all layers', async () => {
            const key = 'foo';
            const value = 'hello';
            await cache.set(key, value);
            expect(await cache['layers'][2].mget([key])).toEqual([value]);
        });
    });
});