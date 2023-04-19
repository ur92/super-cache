import {GettableItem, IProvider, StorageValue, TransactionOptions} from "./types";
import {keys} from "object-hash";
import {isUnset} from "./utils";

export default class ValuesProvider implements IProvider {
    private providers: Record<string, IProvider>;

    constructor() {
        this.providers = {};
    }

    add(base: string, getItem: GettableItem<StorageValue>, hasItem?: GettableItem<boolean>) {
        this.checkBaseOverlapping(base);
        if (this.providers[base]) throw new Error(`Base ${base} already exist`);

        const hasPolyfill = async (key, opts?) => {
            return !isUnset(await getItem(key, opts));
        }

        this.providers[base] = {
            getItem,
            hasItem: hasItem ?? hasPolyfill
        };
    }

    async getItem(key: string, opts?: TransactionOptions): Promise<StorageValue> {
        const provider = this.getProviderByKeyMatch(key);
        return await provider?.getItem(key, opts);
    }

    async hasItem(key: string, opts?: TransactionOptions): Promise<boolean> {
        const provider = this.getProviderByKeyMatch(key);
        return await provider?.hasItem(key, opts);
    }

    private getProviderByKeyMatch(key: string): IProvider {
        const matchedBase = Object.keys(this.providers).find(base => this.keyMatchBase(key, base));
        if (matchedBase) {
            return this.providers[matchedBase];
        }
        return null;
    }

    private keyMatchBase(key: string, base: string): boolean {
        return key.startsWith(base);
    }

    private checkBaseOverlapping(newBase: string) {
        let overlappingBases = [];

        Object.keys(this.providers).map(base => {
            if (this.keyMatchBase(base, newBase)) {
                overlappingBases.push([newBase, base])
            }
            if (this.keyMatchBase(newBase, base)) {
                overlappingBases.push([base, newBase])
            }
        })

        if (overlappingBases.length) {
            const issues = overlappingBases.map(([a, b]) => ` - "${a}" is less specific than "${b}"`).join('\n\r');
            throw new Error(`
                Value provider for similar base already exist. 
                All bases should not overlap.
                Issues:
                ${issues}`
            );
        }
    }
}