[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [loaders](../README.md) / OpenChainSignatureLookup

# Class: OpenChainSignatureLookup

## Extended by

- [`SamczunSignatureLookup`](SamczunSignatureLookup.md)

## Implements

- [`SignatureLookup`](../interfaces/SignatureLookup.md)

## Constructors

### new OpenChainSignatureLookup()

> **new OpenChainSignatureLookup**(): [`OpenChainSignatureLookup`](OpenChainSignatureLookup.md)

#### Returns

[`OpenChainSignatureLookup`](OpenChainSignatureLookup.md)

## Methods

### load()

> **load**(`url`): `Promise`\<`any`\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<`any`\>

#### Defined in

[loaders.ts:244](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L244)

***

### loadEvents()

> **loadEvents**(`hash`): `Promise`\<`string`[]\>

#### Parameters

• **hash**: `string`

#### Returns

`Promise`\<`string`[]\>

#### Implementation of

[`SignatureLookup`](../interfaces/SignatureLookup.md).[`loadEvents`](../interfaces/SignatureLookup.md#loadevents)

#### Defined in

[loaders.ts:260](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L260)

***

### loadFunctions()

> **loadFunctions**(`selector`): `Promise`\<`string`[]\>

#### Parameters

• **selector**: `string`

#### Returns

`Promise`\<`string`[]\>

#### Implementation of

[`SignatureLookup`](../interfaces/SignatureLookup.md).[`loadFunctions`](../interfaces/SignatureLookup.md#loadfunctions)

#### Defined in

[loaders.ts:255](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L255)
