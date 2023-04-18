import Namespace from "./Namespace";

describe("Namespace", () => {
    let namespace: Namespace;
    let provider, context;

    beforeEach(() => {
        namespace = new Namespace();
        context = {namespace: "myspace"};
        provider = jest.fn(async (ctx:typeof context) => ctx.namespace );
    });

    describe("addNamespaceToPairs", () => {
        it("should return the same key-value pairs if no provider is set", async () => {
            const result = await namespace.addNamespaceToPairs({ key1: "value1", key2: "value2" });
            expect(result).toEqual({ key1: "value1", key2: "value2" });
        });

        it("should add the namespace to the keys of the key-value pairs", async () => {
            namespace.setProvider(context, provider, ":");

            const result = await namespace.addNamespaceToPairs({ key1: "value1", key2: "value2" });
            expect(result).toEqual({ "myspace:key1": "value1", "myspace:key2": "value2" });
        });
    });

    describe("addNamespaceToKeys", () => {
        it("should return the same keys if no provider is set", async () => {
            const result = await namespace.addNamespaceToKeys("key1", "key2");
            expect(result).toEqual(["key1", "key2"]);
        });

        it("should add the namespace to the keys", async () => {
            namespace.setProvider(context, provider, ":");

            const result = await namespace.addNamespaceToKeys("key1", "key2");
            expect(result).toEqual(["myspace:key1", "myspace:key2"]);
        });
    });

    describe("cache", () => {
        it("should cache the namespace after getting it from the provider", async () => {
            namespace.setProvider(context, provider, ":");

            await namespace.addNamespaceToKeys('key1');
            await namespace.addNamespaceToKeys('key1');

            expect(provider).toHaveBeenCalledTimes(1);
        });

        it("should re cache the namespace after context changed", async () => {
            namespace.setProvider(context, provider, ":");

            await namespace.addNamespaceToKeys('key1');
            await namespace.addNamespaceToKeys('key1');
            await namespace.addNamespaceToKeys('key1');
            context.namespace = 'myspice';
            await namespace.addNamespaceToKeys('key1');

            expect(provider).toHaveBeenCalledTimes(2);
            expect(provider).toHaveBeenCalledWith(context);
        });
    });
});