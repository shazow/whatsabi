[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [loaders](../README.md) / SourcifyABILoader

# Class: SourcifyABILoader

## Implements

- [`ABILoader`](../interfaces/ABILoader.md)

## Constructors

### new SourcifyABILoader()

> **new SourcifyABILoader**(`config`?): [`SourcifyABILoader`](SourcifyABILoader.md)

#### Parameters

• **config?**

• **config.chainId?**: `number`

#### Returns

[`SourcifyABILoader`](SourcifyABILoader.md)

#### Defined in

[loaders.ts:120](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L120)

## Properties

### chainId?

> `optional` **chainId**: `number`

#### Defined in

[loaders.ts:118](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L118)

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

[loaders.ts:124](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L124)

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

[loaders.ts:163](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L163)
