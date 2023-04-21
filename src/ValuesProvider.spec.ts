import ValuesProvider from './ValuesProvider';

describe('Values Provider', function () {
    let provider: ValuesProvider;
    beforeEach(function () {
        provider = new ValuesProvider();
        provider.add('token:', async (key) => {
            return 'token-for-' + key;
        });
    });

    it('should handle keys of known base', function () {
        expect(provider.getItem('token:user123')).resolves.toBe(
            'token-for-token:user123'
        );
    });

    it('should not handle keys of unknown base', function () {
        expect(provider.getItem('otherData:user123')).resolves.toBeNull();
    });

    it('should return has item', function () {
        expect(provider.hasItem('token:user123')).resolves.toBeTruthy();
    });

    it('should work with multiple value providers', function () {
        provider.add('user:', async (key) => {
            return 'user-for-' + key;
        });
        expect(provider.getItem('user:user123')).resolves.toBe(
            'user-for-user:user123'
        );
    });

    describe('Base overlapping', function () {
        it('should prevent adding general base to existing specific base', function () {
            const addProvider = () => provider.add('tok', async () => '');
            expect(addProvider).toThrowError();
        });

        it('should prevent adding specific base to existing general base', function () {
            const addProvider = () =>
                provider.add('token:session:', async () => '');
            expect(addProvider).toThrowError();
        });

        it('should prevent adding the same base', function () {
            const addProvider = () => provider.add('token:', async () => '');
            expect(addProvider).toThrowError();
        });
    });
});
