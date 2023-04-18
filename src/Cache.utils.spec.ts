import Cache from "./Cache";
import Layer from "./Layer";

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