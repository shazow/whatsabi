[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [loaders](../README.md) / MultiSignatureLookup

# Class: MultiSignatureLookup

## Implements

- [`SignatureLookup`](../interfaces/SignatureLookup.md)

## Constructors

### new MultiSignatureLookup()

> **new MultiSignatureLookup**(`lookups`): [`MultiSignatureLookup`](MultiSignatureLookup.md)

#### Parameters

• **lookups**: [`SignatureLookup`](../interfaces/SignatureLookup.md)[]

#### Returns

[`MultiSignatureLookup`](MultiSignatureLookup.md)

#### Defined in

[loaders.ts:194](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L194)

## Properties

### lookups

> **lookups**: [`SignatureLookup`](../interfaces/SignatureLookup.md)[]

#### Defined in

[loaders.ts:192](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L192)

## Methods

### loadEvents()

> **loadEvents**(`hash`): `Promise`\<`string`[]\>

#### Parameters

• **hash**: `string`

#### Returns

`Promise`\<`string`[]\>

#### Implementation of

[`SignatureLookup`](../interfaces/SignatureLookup.md).[`loadEvents`](../interfaces/SignatureLookup.md#loadevents)

#### Defined in

[loaders.ts:208](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L208)

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

[loaders.ts:198](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L198)
