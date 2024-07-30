[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [proxies](../README.md) / GnosisSafeProxyResolver

# Class: GnosisSafeProxyResolver

## Extends

- [`BaseProxyResolver`](BaseProxyResolver.md)

## Implements

- [`ProxyResolver`](../interfaces/ProxyResolver.md)

## Constructors

### new GnosisSafeProxyResolver()

> **new GnosisSafeProxyResolver**(`name`?): [`GnosisSafeProxyResolver`](GnosisSafeProxyResolver.md)

#### Parameters

• **name?**: `string`

#### Returns

[`GnosisSafeProxyResolver`](GnosisSafeProxyResolver.md)

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

[proxies.ts:36](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L36)

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
