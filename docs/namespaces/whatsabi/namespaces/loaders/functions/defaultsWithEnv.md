[**@shazow/whatsabi**](../../../../../README.md) • **Docs**

***

[@shazow/whatsabi](../../../../../globals.md) / [whatsabi](../../../README.md) / [loaders](../README.md) / defaultsWithEnv

# Function: defaultsWithEnv()

> **defaultsWithEnv**(`env`): `Record`\<`string`, [`ABILoader`](../interfaces/ABILoader.md) \| [`SignatureLookup`](../interfaces/SignatureLookup.md)\>

Return params to use with whatsabi.autoload(...)

## Parameters

• **env**: `LoaderEnv`

## Returns

`Record`\<`string`, [`ABILoader`](../interfaces/ABILoader.md) \| [`SignatureLookup`](../interfaces/SignatureLookup.md)\>

## Examples

```ts
whatsabi.autoload(address, {provider, ...defaultsWithEnv(process.env)})
```

```ts
whatsabi.autoload(address, {
  provider,
  ...defaultsWithEnv({
    SOURCIFY_CHAIN_ID: 42161,
    ETHERSCAN_BASE_URL: "https://api.arbiscan.io/api",
    ETHERSCAN_API_KEY: "MYSECRETAPIKEY",
  }),
})
```

## Defined in

[loaders.ts:302](https://github.com/shazow/whatsabi/blob/main/src/loaders.ts#L302)
