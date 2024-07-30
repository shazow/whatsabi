[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [loaders](../README.md) / FourByteSignatureLookup

# Class: FourByteSignatureLookup

## Implements

- [`SignatureLookup`](../interfaces/SignatureLookup.md)

## Constructors

### new FourByteSignatureLookup()

> **new FourByteSignatureLookup**(): [`FourByteSignatureLookup`](FourByteSignatureLookup.md)

#### Returns

[`FourByteSignatureLookup`](FourByteSignatureLookup.md)

## Methods

### load()

> **load**(`url`): `Promise`\<`string`[]\>

#### Parameters

• **url**: `string`

#### Returns

`Promise`\<`string`[]\>

#### Defined in

[loaders.ts:221](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L221)

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

[loaders.ts:236](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L236)

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

[loaders.ts:231](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L231)
