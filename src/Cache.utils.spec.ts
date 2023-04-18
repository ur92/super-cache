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

describe("Cache Utils", () => {
    let cache: Cache;

    beforeEach(() => {
        cache = new Cache();

    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Namespace', () => {
        let mget = jest.fn((...keys: string[]) => ['value']);
        let mset = jest.fn();
        let msync = jest.fn();
        let context = {tenantId: 'hello'};

        beforeEach(function () {
            cache['layers'] = [{
                mget,
                msync,
                mset
            }] as unknown as Layer[];
            cache.setNamespace(context, context => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(context.tenantId);
                    });
                });
            },'*')
        });

        it('should add namespace to mget keys', async function () {
            await cache.mget('world');
            expect(mget).toHaveBeenCalledWith(['hello*world']);
        });

        it('should add namespace to msync keys', async function () {
            cache['layers'].push({
                mget,
                msync,
                mset
            } as unknown as Layer);
            await cache.msync('world');
            expect(mget).toHaveBeenCalledWith(['hello*world']);
            expect(mset).toHaveBeenCalledWith([['hello*world', 'value']]);
        });

        it('should add namespace to mset keys', async function () {
            await cache.mset({hey: 'ho'});
            expect(mset).toHaveBeenCalledWith([['hello*hey', 'ho']]);
        });

        it('should add dynamic namespace', async function () {
            context.tenantId = 'goodbye';
            await cache.mget('world');
            expect(mget).toHaveBeenCalledWith(['goodbye*world'])
        });
    });

});