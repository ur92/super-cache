import Cache from "./Cache";
import StorageLayer from "./StorageLayer";
import {StorageValue, TransactionOptions} from "./types/common";

const mockLayer = (data) => ({
    mget: jest.fn(async function (keys: string[]) {
        return keys.map((key) => data[key] ?? null);
    }),
    mset: jest.fn(async function (pairs: Array<[string, any]>) {
        pairs.forEach(([key, value]) => {
            data[key] = value;
        });
    }),
    setItem: jest.fn(async function (key: string, value: StorageValue, opt?: TransactionOptions) {
        data[key] = value;
        return Promise.resolve();
    }),
    clear:jest.fn()
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
            cache.addStorage()
            expect(cache["storageLayers"]).toHaveLength(1);
            expect(cache["storageLayers"][0]).toBeInstanceOf(StorageLayer);
        });

        it("should add a custom layer instance", () => {
            let layer = new StorageLayer();
            cache.addStorage(layer);
            expect(cache["storageLayers"]).toHaveLength(1);
            expect(cache["storageLayers"][0]).toBeInstanceOf(StorageLayer);
            expect(cache["storageLayers"][0]).toEqual(layer);
        });
    });

    describe("msync", () => {
        beforeEach(function () {
            cache.addStorage();
        });
        it("should read keys from last layer and update lower storageLayers", async () => {
            const keys = ["key1", "key2"];
            const values: StorageValue[] = ["value1", "value2"];
            const mgetMock = jest.fn().mockResolvedValue(values);
            const msetMock = jest.fn().mockResolvedValue(null);
            const storageLayers = [
                {mget: jest.fn(), mset: msetMock},
                {mget: mgetMock, mset: jest.fn()},
            ] as unknown as StorageLayer[];

            cache["storageLayers"] = storageLayers;

            const result = await cache.msync(keys);

            expect(storageLayers[0].mget).toHaveBeenCalledTimes(0);
            expect(storageLayers[0].mset).toHaveBeenCalledTimes(1);
            expect(storageLayers[0].mset).toHaveBeenCalledWith([
                ["key1", "value1"],
                ["key2", "value2"],
            ]);

            expect(storageLayers[1].mget).toHaveBeenCalledTimes(1);
            expect(storageLayers[1].mset).toHaveBeenCalledTimes(0);

            expect(result).toEqual(values);
        });

        it("should return an empty array if keys array is empty", async () => {
            const result = await cache.msync([]);
            expect(result).toEqual([]);
        });
    });

    describe('mget', () => {
        beforeEach(function () {
            cache.addStorage();
        });

        it('should return null for unknown keys', async () => {
            const result = await cache.mget('foo');
            expect(result).toEqual([null]);
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
            let storageLayers;
            beforeEach(function () {
                storageLayers = [mockLayer({}), mockLayer({}), mockLayer({})];
                cache["storageLayers"] = storageLayers;
            });
            it('should return values from a the deepest layer ', async () => {
                //set only on third layer
                await storageLayers[2].setItem('foo', 'bar');
                const result = await cache.mget('foo');
                expect(result).toEqual(['bar']);
                expect(storageLayers[0].mget).toHaveBeenCalledWith(['foo']);
                expect(storageLayers[1].mget).toHaveBeenCalledWith(['foo']);
                expect(storageLayers[2].mget).toHaveBeenCalledWith(['foo']);
                //mset
                expect(storageLayers[0].mset).toHaveBeenCalledWith([['foo', 'bar']]);
                expect(storageLayers[1].mset).toHaveBeenCalledWith([['foo', 'bar']]);
                //negative
                expect(storageLayers[2].mset).not.toHaveBeenCalled();
            });

            it('should keep layer priority', async () => {
                // layer 0
                await storageLayers[0].mset([['key0', 'val0']]);
                const result3 = await cache.mget('key0', 'key1', 'key2');
                expect(result3).toEqual(['val0', null, null]);
                // layer 1
                await storageLayers[1].mset([['key0', 'val1'], ['key1', 'val1']]);
                const result2 = await cache.mget('key0', 'key1', 'key2');
                expect(result2).toEqual(['val0', 'val1', null]);
                //highest layer
                await storageLayers[2].mset([['key0', 'val2'], ['key1', 'val2'], ['key2', 'val2']]);
                const result = await cache.mget('key0', 'key1', 'key2');
                expect(result).toEqual(['val0', 'val1', 'val2']);
            });
        });

    });

    describe('mset', () => {
        beforeEach(function () {
            cache["storageLayers"] = [mockLayer({}), mockLayer({})];
        });

        it('should set multiple key-value pairs in all storageLayers', async () => {
            const pairs = {foo: 'hello', bar: 'world'};
            await cache.mset(pairs);
            // mset
            expect(cache['storageLayers'][0].mset).toHaveBeenCalledWith([['foo', 'hello'], ['bar', 'world']]);
            expect(cache['storageLayers'][1].mset).toHaveBeenCalledWith([['foo', 'hello'], ['bar', 'world']]);
            // mget
            expect(await cache['storageLayers'][0].mget(['foo', 'bar'])).toEqual(['hello', 'world']);
            expect(await cache['storageLayers'][1].mget(['foo', 'bar'])).toEqual(['hello', 'world']);
        });
    });

    describe('sync', () => {
        const key = 'foo';
        const value = 'hello';
        beforeEach(function () {
            cache["storageLayers"] = [mockLayer({}), mockLayer({}), mockLayer({[key]: value})];
        });

        it('should return the value for the provided key', async () => {
            // negative
            expect(await cache['storageLayers'][0].mget([key])).toEqual([null]);
            // sync
            const result = await cache.sync(key);
            expect(result).toEqual(value);
            // positive
            expect(await cache['storageLayers'][0].mget([key])).toEqual([value]);

        });
    });

    describe('get', () => {
        beforeEach(function () {
            cache["storageLayers"] = [mockLayer({})];
        });

        it('should return null for unexciting key', function() {
            expect(cache.get('sdf')).resolves.toBeNull();
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
            cache["storageLayers"] = [mockLayer({}), mockLayer({}), mockLayer({})];
        });

        it('should set the value for the provided key in all storageLayers', async () => {
            const key = 'foo';
            const value = 'hello';
            await cache.set(key, value);
            expect(await cache['storageLayers'][2].mget([key])).toEqual([value]);
        });
    });

    describe('clear', () => {
        beforeEach(function () {
            cache["storageLayers"] = [mockLayer({}), mockLayer({})];
        });
        it('should call clear for all layers', async () => {
            await cache.clear('token:');
            expect(cache["storageLayers"][0].clear).toHaveBeenCalledWith('token:', undefined);
            expect(cache["storageLayers"][1].clear).toHaveBeenCalledWith('token:', undefined);
        });
    })
});