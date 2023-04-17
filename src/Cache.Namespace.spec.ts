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

describe("Cache", () => {
    let cache: Cache;

    beforeEach(() => {
        cache = new Cache();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('mget', () => {

    });

});