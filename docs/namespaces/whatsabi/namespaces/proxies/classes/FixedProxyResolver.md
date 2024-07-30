[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [proxies](../README.md) / FixedProxyResolver

# Class: FixedProxyResolver

## Extends

- [`BaseProxyResolver`](BaseProxyResolver.md)

## Implements

- [`ProxyResolver`](../interfaces/ProxyResolver.md)

## Constructors

### new FixedProxyResolver()

> **new FixedProxyResolver**(`name`, `resolvedAddress`): [`FixedProxyResolver`](FixedProxyResolver.md)

#### Parameters

• **name**: `string`

• **resolvedAddress**: `string`

#### Returns

[`FixedProxyResolver`](FixedProxyResolver.md)

#### Overrides

[`BaseProxyResolver`](BaseProxyResolver.md).[`constructor`](BaseProxyResolver.md#constructors)

#### Defined in

[proxies.ts:226](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L226)

## Properties

### name

> **name**: `string`

#### Inherited from

[`BaseProxyResolver`](BaseProxyResolver.md).[`name`](BaseProxyResolver.md#name)

#### Defined in

[proxies.ts:24](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L24)

***

### resolvedAddress

> `readonly` **resolvedAddress**: `string`

#### Defined in

[proxies.ts:224](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L224)

## Methods

### resolve()

> **resolve**(`provider`, `address`): `Promise`\<`string`\>

#### Parameters

• **provider**: `StorageProvider`

• **address**: `string`

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`ProxyResolver`](../interfaces/ProxyResolver.md).[`resolve`](../interfaces/ProxyResolver.md#resolve)

#### Defined in

[proxies.ts:231](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L231)

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
