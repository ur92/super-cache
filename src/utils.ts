import Cache from './Cache';
const isUnset = (value: any): boolean => {
    return value === undefined || value === null;
};

const requireStorage = (target, propertyName, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args): Promise<any> {
        if ((this as Cache)['layersLength'] === 0) {
            throw new Error(
                'At least one layer should be configured. Use ".withLayer()" to add layers to your cache.'
            );
        }
        return originalMethod.apply(this, args);
    };
    return descriptor;
};

export { isUnset, requireStorage };
