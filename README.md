# Cache Library

The Cache Library is a simple cache implementation that allows you to store and retrieve values with a key-value pair system. The library supports multiple storage layers and providers to enable caching data in different locations such as memory, disk, or cloud storage.

## Installation

To install the Cache library, you can use NPM or Yarn:

```bash
npm install cache-lib
```

```bash
yarn add cache-lib
```

## Usage

To use the Cache library, you first need to import the necessary classes and types:

```js
import Namespace from "./Namespace";
import StorageLayer from './StorageLayer';
import ValuesProvider from "./ValuesProvider";
import {GettableItem} from "./types";
import {CreateLayerOptions} from "./types/ILayerOptions";
import {DriverType, NamespaceContext, NamespaceProvider, StorageValue, TransactionOptions} from "./types/common";
import { isUnset, requireStorage } from './utils';
```

### Creating a Cache Instance

To create a new cache instance, you need to instantiate the `Cache` class:

```js
const cache = new Cache();
```

### Adding Storage Layers

You can add storage layers to the cache by calling the `addStorage` method:

```js
cache.addStorage('memory');
cache.addStorage('local', { prefix: 'myapp' });
```

This adds a memory storage layer and a local storage layer with a prefix of "myapp". You can also pass a custom storage layer instance instead of a string identifier.

### Setting the Namespace

You can set the namespace for the cache by calling the `setNamespace` method:

```js
cache.setNamespace('user', {
    getNamespace: () => 'user1'
});
```

This sets the namespace for the "user" context to "user1".

### Adding Value Providers

You can add value providers to the cache by calling the `addValueProvider` method:

```js
cache.addValueProvider('myprovider', (key) => {
    return myDataProvider.getValue(key);
});
```

This adds a value provider with the base key of "myprovider". The `getValue` method of `myDataProvider` will be called to retrieve the value for the key.

### Getting and Setting Values

You can get and set values in the cache by calling the `get` and `set` methods:

```js
await cache.set('key', 'value');
const value = await cache.get('key');
```

### Removing Values

You can remove values from the cache by calling the `clear` method:

```js
await cache.clear('myprovider');
```

This removes all values with the base key of "myprovider". If no base key is specified, all values in the cache will be removed.

### Synchronizing Values

You can synchronize values in the cache with the storage layers by calling the `sync` method:

```js
await cache.sync('key');
```

This synchronizes the value with the key "key" in all storage layers.

### Batch Operations

The cache library supports batch operations for getting and setting values:

```js
const values = await cache.mget('key1', 'key2', 'key3');
await cache.mset({
    key1: 'value1',
    key2: 'value2',
    key3: 'value3'
});
```

These methods allow you to retrieve and set multiple values at once.

## Conclusion

The Cache Library is a simple and flexible caching solution that can be used in a variety of applications. With support for multiple storage layers and providers, you can choose the best caching strategy for your use case.