[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [loaders](../README.md) / SamczunSignatureLookup

# Class: SamczunSignatureLookup

## Extends

- [`OpenChainSignatureLookup`](OpenChainSignatureLookup.md)

## Constructors

### new SamczunSignatureLookup()

> **new SamczunSignatureLookup**(): [`SamczunSignatureLookup`](SamczunSignatureLookup.md)

#### Returns

[`SamczunSignatureLookup`](SamczunSignatureLookup.md)

#### Inherited from

[`OpenChainSignatureLookup`](OpenChainSignatureLookup.md).[`constructor`](OpenChainSignatureLookup.md#constructors)

## Methods

### load()

> **load**(`url`): `Promise`\<`any`\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<`any`\>

#### Inherited from

[`OpenChainSignatureLookup`](OpenChainSignatureLookup.md).[`load`](OpenChainSignatureLookup.md#load)

#### Defined in

[loaders.ts:244](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L244)

***

### loadEvents()

> **loadEvents**(`hash`): `Promise`\<`string`[]\>

#### Parameters

• **hash**: `string`

#### Returns

`Promise`\<`string`[]\>

#### Inherited from

[`OpenChainSignatureLookup`](OpenChainSignatureLookup.md).[`loadEvents`](OpenChainSignatureLookup.md#loadevents)

#### Defined in

[loaders.ts:260](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L260)

***

### loadFunctions()

> **loadFunctions**(`selector`): `Promise`\<`string`[]\>

#### Parameters

• **selector**: `string`

#### Returns

`Promise`\<`string`[]\>

#### Inherited from

[`OpenChainSignatureLookup`](OpenChainSignatureLookup.md).[`loadFunctions`](OpenChainSignatureLookup.md#loadfunctions)

#### Defined in

[loaders.ts:255](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L255)
