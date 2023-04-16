import Cache from "./Cache";
import Layer from "./Layer";
import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import { StorageValue } from "./types/IStorage";

// Mocking the `unstorage` stuff
jest.mock("unstorage");
jest.mock("unstorage/drivers/memory");
const mockedCreateStorage = createStorage as jest.MockedFunction<typeof createStorage>;

describe("Cache", () => {
    let cache: Cache;

    beforeEach(() => {
        cache = new Cache();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', function () {
        it('should validate at least one storage before use', function () {
            const newCache = new Cache();
            expect(newCache.set('foo', 'boo')).rejects.toThrow();
        });
    });

    describe("withLayer", () => {
        it("should create a new layer with default options", () => {
            mockedCreateStorage.mockReturnValueOnce({} as any);
            cache.withLayer();
            expect(mockedCreateStorage).toHaveBeenCalledTimes(1);
            expect(mockedCreateStorage).toHaveBeenCalledWith(undefined);
            expect(cache["layers"]).toHaveLength(1);
            expect(cache["layers"][0]).toBeInstanceOf(Layer);
        });

        it("should create a new layer with custom options", () => {
            const options = {driver: memoryDriver()};
            mockedCreateStorage.mockReturnValueOnce({} as any);
            cache.withLayer(options);
            expect(mockedCreateStorage).toHaveBeenCalledTimes(1);
            expect(mockedCreateStorage).toHaveBeenCalledWith(options);
            expect(cache["layers"]).toHaveLength(1);
            expect(cache["layers"][0]).toBeInstanceOf(Layer);
        });
    });

    describe("msync", () => {
        it("should call mget and mset on all layers except the last one", async () => {
            const keys = ["key1", "key2"];
            const values: StorageValue[] = ["value1", "value2"];
            const mgetMock = jest.fn().mockResolvedValue(values);
            const msetMock = jest.fn().mockResolvedValue(undefined);
            const layers = [
                {mget: jest.fn().mockResolvedValue(values)},
                {mget: mgetMock, mset: msetMock},
            ] as unknown as Layer[];

            cache["layers"] = layers;

            const result = await cache.msync(keys);

            expect(layers[0].mset).toHaveBeenCalledTimes(1);
            expect(layers[0].mset).toHaveBeenCalledWith([
                ["key1", "value1"],
                ["key2", "value2"],
            ]);

            expect(mgetMock).toHaveBeenCalledTimes(1);
            expect(msetMock).toHaveBeenCalledTimes(1);

            expect(result).toEqual(values);
        });

        it("should return an empty array if keys array is empty", async () => {
            const result = await cache.msync([]);
            expect(result).toEqual([]);
        });

        describe('mget', () => {
            it('should return an empty array when no keys are provided', async () => {
                const result = await cache.mget();
                expect(result).toEqual([]);
            });

            it('should return an array of values for the provided keys', async () => {
                const key1 = 'foo';
                const key2 = 'bar';
                const value1 = 'hello';
                const value2 = 'world';
                await cache.set(key1, value1);
                await cache.set(key2, value2);
                const result = await cache.mget(key1, key2);
                expect(result).toEqual([value1, value2]);
            });
            it('should return an empty array when no keys are provided', async () => {
                const cache = new Cache();
                const result = await cache.mget();
                expect(result).toEqual([]);
            });

            it('should return values for a single layer cache', async () => {
                const cache = new Cache().withLayer();
                await cache.set('foo', 'bar');
                const result = await cache.mget('foo');
                expect(result).toEqual(['bar']);
            });

            it('should return values for a multiple layer cache', async () => {
                const cache = new Cache()
                    .withLayer()
                    .withLayer()
                    .withLayer();
                await cache.set('foo', 'bar');
                const result = await cache.mget('foo');
                expect(result).toEqual(['bar', 'bar', 'bar']);
            });

            it('should return undefined for unknown keys', async () => {
                const cache = new Cache().withLayer();
                const result = await cache.mget('foo');
                expect(result).toEqual([undefined]);
            });

            it('should fetch values from lower layers', async () => {
                const cache = new Cache()
                    .withLayer()
                    .withLayer()
                    .withLayer();
                await cache.set('foo', 'bar');
                await cache['layers'][1].set('foo', 'baz');
                const result = await cache.mget('foo');
                expect(result).toEqual(['bar', 'baz', 'bar']);
            });
        });

        describe('mset', () => {
            it('should set multiple key-value pairs in all layers', async () => {
                const pairs = { foo: 'hello', bar: 'world' };
                await cache.mset(pairs);
                expect(await cache.get('foo')).toEqual('hello');
                expect(await cache.get('bar')).toEqual('world');
            });
        });

        describe('sync', () => {
            it('should return the value for the provided key', async () => {
                const key = 'foo';
                const value = 'hello';
                await cache.set(key, value);
                const result = await cache.sync(key);
                expect(result).toEqual(value);
            });
        });

        describe('get', () => {
            it('should return the value for the provided key', async () => {
                const key = 'foo';
                const value = 'hello';
                await cache.set(key, value);
                const result = await cache.get(key);
                expect(result).toEqual(value);
            });
        });

        describe('set', () => {
            it('should set the value for the provided key in all layers', async () => {
                const key = 'foo';
                const value = 'hello';
                await cache.set(key, value);
                expect(await cache.get(key)).toEqual(value);
            });
        });
    });
});