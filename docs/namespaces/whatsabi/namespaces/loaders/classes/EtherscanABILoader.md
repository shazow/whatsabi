[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [loaders](../README.md) / EtherscanABILoader

# Class: EtherscanABILoader

## Implements

- [`ABILoader`](../interfaces/ABILoader.md)

## Constructors

### new EtherscanABILoader()

> **new EtherscanABILoader**(`config`?): [`EtherscanABILoader`](EtherscanABILoader.md)

#### Parameters

• **config?**

• **config.apiKey?**: `string`

• **config.baseURL?**: `string`

#### Returns

[`EtherscanABILoader`](EtherscanABILoader.md)

#### Defined in

[loaders.ts:64](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L64)

## Properties

### apiKey?

> `optional` **apiKey**: `string`

#### Defined in

[loaders.ts:61](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L61)

***

### baseURL

> **baseURL**: `string`

#### Defined in

[loaders.ts:62](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L62)

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

[loaders.ts:70](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L70)

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

[loaders.ts:93](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L93)
