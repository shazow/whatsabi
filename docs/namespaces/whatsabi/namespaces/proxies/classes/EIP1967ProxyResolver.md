[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [proxies](../README.md) / EIP1967ProxyResolver

# Class: EIP1967ProxyResolver

## Extends

- [`BaseProxyResolver`](BaseProxyResolver.md)

## Implements

- [`ProxyResolver`](../interfaces/ProxyResolver.md)

## Constructors

### new EIP1967ProxyResolver()

> **new EIP1967ProxyResolver**(`name`?): [`EIP1967ProxyResolver`](EIP1967ProxyResolver.md)

#### Parameters

• **name?**: `string`

#### Returns

[`EIP1967ProxyResolver`](EIP1967ProxyResolver.md)

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

• **provider**: `StorageProvider` & `CallProvider`

• **address**: `string`

#### Returns

`Promise`\<`string`\>

#### Implementation of

[`ProxyResolver`](../interfaces/ProxyResolver.md).[`resolve`](../interfaces/ProxyResolver.md#resolve)

#### Defined in

[proxies.ts:59](https://github.com/shazow/whatsabi/blob/main/src/proxies.ts#L59)

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
