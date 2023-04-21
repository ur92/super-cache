import StorageLayer from './StorageLayer';
import { IStorage } from './types/IStorage';
import { StorageValue, TransactionOptions } from './types/common';

describe('Layer', () => {
    let storage: IStorage;
    let layer: StorageLayer;

    beforeEach(() => {
        storage = {
            clear: jest.fn(),
            dispose: jest.fn(),
            getItem: jest.fn(),
            getKeys: jest.fn(),
            hasItem: jest.fn(),
            removeItem: jest.fn(),
            setItem: jest.fn(),
            unwatch: jest.fn(),
            watch: jest.fn(),
        };
        layer = new StorageLayer(storage);
    });

    describe('mset', () => {
        it('calls set for each key value pair', async () => {
            const keyValuePairs: Array<[string, StorageValue]> = [
                ['key1', 'value1'],
                ['key2', 'value2'],
                ['key3', 'value3'],
            ];

            await layer.mset(keyValuePairs);

            expect(storage.setItem).toHaveBeenCalledTimes(3);
            expect(storage.setItem).toHaveBeenCalledWith(
                'key1',
                'value1',
                undefined
            );
            expect(storage.setItem).toHaveBeenCalledWith(
                'key2',
                'value2',
                undefined
            );
            expect(storage.setItem).toHaveBeenCalledWith(
                'key3',
                'value3',
                undefined
            );
        });
    });

    describe('mget', () => {
        it('calls get for each key', async () => {
            const keys = ['key1', 'key2', 'key3'];

            (storage.getItem as jest.Mock).mockImplementation((key: string) => {
                switch (key) {
                    case 'key1':
                        return 'value1';
                    case 'key2':
                        return 'value2';
                    case 'key3':
                        return 'value3';
                    default:
                        throw new Error(`Unknown key: ${key}`);
                }
            });

            const values = await layer.mget(keys);

            expect(storage.getItem).toHaveBeenCalledTimes(3);
            expect(storage.getItem).toHaveBeenCalledWith('key1', undefined);
            expect(storage.getItem).toHaveBeenCalledWith('key2', undefined);
            expect(storage.getItem).toHaveBeenCalledWith('key3', undefined);

            expect(values).toEqual(['value1', 'value2', 'value3']);
        });
    });

    describe('get', () => {
        it('calls storage.getItem', async () => {
            await layer.getItem('key');

            expect(storage.getItem).toHaveBeenCalledTimes(1);
            expect(storage.getItem).toHaveBeenCalledWith('key', undefined);
        });

        it('passes opts to storage.getItem', async () => {
            const opts: TransactionOptions = { someOption: 'value' };

            await layer.getItem('key', opts);

            expect(storage.getItem).toHaveBeenCalledTimes(1);
            expect(storage.getItem).toHaveBeenCalledWith('key', opts);
        });
    });

    describe('clear', () => {
        it('calls storage.clear', async () => {
            await layer.clear();

            expect(storage.clear).toHaveBeenCalledTimes(1);
            expect(storage.clear).toHaveBeenCalledWith(undefined, undefined);
        });

        it('passes base and opts to storage.clear', async () => {
            const base = 'base';
            const opts: TransactionOptions = { someOption: 'value' };

            await layer.clear(base, opts);

            expect(storage.clear).toHaveBeenCalledTimes(1);
            expect(storage.clear).toHaveBeenCalledWith(base, opts);
        });
    });

    describe('dispose', () => {
        it('calls storage.dispose', async () => {
            await layer.dispose();

            expect(storage.dispose).toHaveBeenCalledTimes(1);
        });
    });

    describe('getKeys', () => {
        it('calls storage.getKeys', async () => {
            await layer.getKeys();

            expect(storage.getKeys).toHaveBeenCalledTimes(1);
        });

        it('calls storage.getKeys with base', async () => {
            await layer.getKeys('zaloop-XXX', { sync: true });

            expect(storage.getKeys).toHaveBeenCalledTimes(1);
            expect(storage.getKeys).toHaveBeenCalledWith('zaloop-XXX', {
                sync: true,
            });
        });
    });

    describe('getKeys', () => {
        it('calls storage.getKeys', async () => {
            await layer.getKeys();

            expect(storage.getKeys).toHaveBeenCalledTimes(1);
        });

        it('calls storage.getKeys with base', async () => {
            await layer.getKeys('zaloop-XXX', { sync: true });

            expect(storage.getKeys).toHaveBeenCalledTimes(1);
            expect(storage.getKeys).toHaveBeenCalledWith('zaloop-XXX', {
                sync: true,
            });
        });
    });

    describe('has', () => {
        it('should call storage.hasItem with the correct key and options', async () => {
            await layer.hasItem('test', { timeout: 1000 });

            expect(storage.hasItem).toHaveBeenCalledWith('test', {
                timeout: 1000,
            });
        });

        it('should return the result of storage.hasItem', async () => {
            (storage.hasItem as jest.Mock).mockResolvedValue(true);

            const result = await layer.hasItem('test');

            expect(result).toBe(true);
        });
    });

    describe('remove', () => {
        it('should call storage.removeItem with the correct key and options', async () => {
            await layer.removeItem('test', { timeout: 1000 });

            expect(storage.removeItem).toHaveBeenCalledWith('test', {
                timeout: 1000,
            });
        });
    });

    describe('set', () => {
        it('should call storage.setItem with the correct key, value, and options', async () => {
            const value: StorageValue = { data: 'test' };

            await layer.setItem('test', value, { timeout: 1000 });

            expect(storage.setItem).toHaveBeenCalledWith('test', value, {
                timeout: 1000,
            });
        });
    });

    describe('unwatch', () => {
        it('should call storage.unwatch', async () => {
            await layer.unwatch();

            expect(storage.unwatch).toHaveBeenCalled();
        });
    });

    describe('watch', () => {
        it('should call storage.watch with the correct callback', async () => {
            const callback = jest.fn();

            await layer.watch(callback);

            expect(storage.watch).toHaveBeenCalledWith(callback);
        });

        it('should return the result of storage.watch', async () => {
            const unwatch = jest.fn();
            (storage.watch as jest.Mock).mockResolvedValue(unwatch);

            const callback = jest.fn();
            const result = await layer.watch(callback);

            expect(result).toBe(unwatch);
        });
    });
});
