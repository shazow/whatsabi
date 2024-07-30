[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [proxies](../README.md) / DiamondProxyResolver

# Class: DiamondProxyResolver

## Extends

- [`BaseProxyResolver`](BaseProxyResolver.md)

## Implements

- [`ProxyResolver`](../interfaces/ProxyResolver.md)

## Constructors

### new DiamondProxyResolver()

> **new DiamondProxyResolver**(`name`?): [`DiamondProxyResolver`](DiamondProxyResolver.md)

#### Parameters

• **name?**: `string`

#### Returns

[`DiamondProxyResolver`](DiamondProxyResolver.md)

#### Inherited from

[`BaseProxyResolver`](BaseProxyResolver.md).[`constructor`](BaseProxyResolver.md#constructors)

#### Defined in

[proxies.ts:26](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L26)

## Properties

### name

> **name**: `string`

#### Inherited from

[`BaseProxyResolver`](BaseProxyResolver.md).[`name`](BaseProxyResolver.md#name)

#### Defined in

[proxies.ts:24](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L24)

## Methods

### facets()

> **facets**(`provider`, `address`): `Promise`\<`Record`\<`string`, `string`[]\>\>

#### Parameters

• **provider**: `StorageProvider`

• **address**: `string`

#### Returns

`Promise`\<`Record`\<`string`, `string`[]\>\>

#### Defined in

[proxies.ts:137](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L137)

***

### resolve()

> **resolve**(`provider`, `address`, `selector`): `Promise`\<`string`\>

#### Parameters

• **provider**: `StorageProvider` & `CallProvider`

• **address**: `string`

• **selector**: `string`

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`ProxyResolver`](../interfaces/ProxyResolver.md).[`resolve`](../interfaces/ProxyResolver.md#resolve)

#### Defined in

[proxies.ts:98](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L98)

***

### selectors()

> **selectors**(`provider`, `address`): `Promise`\<`string`[]\>

#### Parameters

• **provider**: `StorageProvider`

• **address**: `string`

#### Returns

`Promise`\<`string`[]\>

#### Defined in

[proxies.ts:189](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L189)

***

### toString()

> **toString**(): `string`

#### Returns

`string`

#### Implementation of

[`ProxyResolver`](../interfaces/ProxyResolver.md).[`toString`](../interfaces/ProxyResolver.md#tostring)

#### Inherited from

[`BaseProxyResolver`](BaseProxyResolver.md).[`toString`](BaseProxyResolver.md#tostring)

#### Defined in

[proxies.ts:30](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L30)
