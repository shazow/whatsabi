[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [loaders](../README.md) / MultiABILoader

# Class: MultiABILoader

## Implements

- [`ABILoader`](../interfaces/ABILoader.md)

## Constructors

### new MultiABILoader()

> **new MultiABILoader**(`loaders`): [`MultiABILoader`](MultiABILoader.md)

#### Parameters

• **loaders**: [`ABILoader`](../interfaces/ABILoader.md)[]

#### Returns

[`MultiABILoader`](MultiABILoader.md)

#### Defined in

[loaders.ts:32](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L32)

## Properties

### loaders

> **loaders**: [`ABILoader`](../interfaces/ABILoader.md)[]

#### Defined in

[loaders.ts:30](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L30)

## Methods

### getContract()

> **getContract**(`address`): `Promise`\<[`ContractResult`](../type-aliases/ContractResult.md)\>

#### Parameters

• **address**: `string`

#### Returns

`Promise`\<[`ContractResult`](../type-aliases/ContractResult.md)\>

#### Implementation of

[`ABILoader`](../interfaces/ABILoader.md).[`getContract`](../interfaces/ABILoader.md#getcontract)

#### Defined in

[loaders.ts:36](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L36)

***

### loadABI()

> **loadABI**(`address`): `Promise`\<`any`[]\>

#### Parameters

• **address**: `string`

#### Returns

`Promise`\<`any`[]\>

#### Implementation of

[`ABILoader`](../interfaces/ABILoader.md).[`loadABI`](../interfaces/ABILoader.md#loadabi)

#### Defined in

[loaders.ts:49](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L49)
