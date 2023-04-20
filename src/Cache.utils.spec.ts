import Cache from "./Cache";
import StorageLayer from "./StorageLayer";

describe("Cache Utils", () => {
    let cache: Cache;

    beforeEach(() => {
        cache = new Cache();

    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Namespace', () => {
        const mget = jest.fn((...keys: string[]) => ['value']);
        const mset = jest.fn();
        const msync = jest.fn();
        const context = {tenantId: 'hello'};

        beforeEach(function () {
            cache['storageLayers'] = [{
                mget,
                msync,
                mset
            }] as unknown as StorageLayer[];
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
            cache['storageLayers'].push({
                mget,
                msync,
                mset
            } as unknown as StorageLayer);
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

    describe('Value Provider', function () {
        beforeEach(function () {
            cache.addStorage();
            cache.addValueProvider('token:', async(key)=>'token-for-'+key)
        });

        it('should provide value if value not in cache', async function () {
            const val = await cache.get('token:bini');
            expect(val).toBe('token-for-token:bini');
        });

        it('should store the provided token in the storage layer', async function () {
            await cache.get('token:bini');
            expect(await cache['storageLayers'][0].getItem('token:bini')).toBe('token-for-token:bini');
        });

        it('should not provide value when no match provider', async function() {
            const val = await cache.get('users:bini');
            expect(val).toBeNull();
        });
    });

});