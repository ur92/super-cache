import {GettableItem, IProvider, StorageValue, TransactionOptions} from "./types";
import Cache from "./Cache";

export default class ValuesProvider implements IProvider {
    private providers: Record<string, IProvider>;

    constructor() {
        this.providers = {};
    }

    add(base: string, getItem: GettableItem<StorageValue>, hasItem?: GettableItem<boolean>) {
        this.checkBaseOverlapping(base);
        if (this.providers[base]) throw new Error()
        this.providers[base] = {getItem, hasItem};
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
        const matchedBase = Object.keys(this.providers).find(base=> this.keyMatchBase(key, base));
        if(matchedBase){
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
                overlappingBases.push([base, newBase])
            }
            if (this.keyMatchBase(newBase, base)) {
                overlappingBases.push([newBase, base])
            }
        })

        if (overlappingBases.length) {
            const issues = overlappingBases.map(([a, b]) => `${a} overlapping ${b}`).join('\n\r');
            throw new Error(`
                Value provider for similar base already exist. 
                All bases should not overlap.\n\r
                Issues:\n\r${issues}`
            );
        }
    }
}