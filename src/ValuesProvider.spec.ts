import ValuesProvider from "./ValuesProvider";

describe('Values Provider', function () {
    let provider: ValuesProvider;
    beforeEach(function () {
        provider = new ValuesProvider();
        provider.add('token:', async (key) =>{
            return 'token-for-'+key;
        })
    });

    it('should handle the key', function () {
        expect(provider.getItem('token:user123')).resolves.toBe('token-for-token:user123');
    });

    it('should not handle the key from unknown base', function () {
        expect(provider.getItem('otherData:user123')).resolves.toBeUndefined();
    });
});