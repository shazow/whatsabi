[**@shazow/whatsabi**](../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../globals.md) / [whatsabi](../README.md) / BytecodeIter

# Class: BytecodeIter

## Constructors

### new BytecodeIter()

> **new BytecodeIter**(`bytecode`, `config`?): [`BytecodeIter`](BytecodeIter.md)

#### Parameters

• **bytecode**: `string`

• **config?**

• **config.bufferSize?**: `number`

#### Returns

[`BytecodeIter`](BytecodeIter.md)

#### Defined in

[disasm.ts:35](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L35)

## Properties

### bytecode

> **bytecode**: `Uint8Array`

#### Defined in

[disasm.ts:22](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L22)

***

### nextPos

> **nextPos**: `number`

#### Defined in

[disasm.ts:25](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L25)

***

### nextStep

> **nextStep**: `number`

#### Defined in

[disasm.ts:24](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L24)

***

### posBuffer

> **posBuffer**: `number`[]

#### Defined in

[disasm.ts:32](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L32)

***

### posBufferSize

> **posBufferSize**: `number`

#### Defined in

[disasm.ts:33](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L33)

## Methods

### asPos()

> **asPos**(`posOrRelativeStep`): `number`

#### Parameters

• **posOrRelativeStep**: `number`

#### Returns

`number`

#### Defined in

[disasm.ts:81](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L81)

***

### at()

> **at**(`posOrRelativeStep`): `number`

#### Parameters

• **posOrRelativeStep**: `number`

#### Returns

`number`

#### Defined in

[disasm.ts:95](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L95)

***

### hasMore()

> **hasMore**(): `boolean`

#### Returns

`boolean`

#### Defined in

[disasm.ts:46](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L46)

***

### next()

> **next**(): `number`

#### Returns

`number`

#### Defined in

[disasm.ts:50](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L50)

***

### pos()

> **pos**(): `number`

#### Returns

`number`

#### Defined in

[disasm.ts:74](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L74)

***

### step()

> **step**(): `number`

#### Returns

`number`

#### Defined in

[disasm.ts:68](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L68)

***

### value()

> **value**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Defined in

[disasm.ts:101](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L101)

***

### valueAt()

> **valueAt**(`posOrRelativeStep`): `Uint8Array`

#### Parameters

• **posOrRelativeStep**: `number`

#### Returns

`Uint8Array`

#### Defined in

[disasm.ts:108](https://github.com/shazow/whatsabi/blob/main/src/disasm.ts#L108)
