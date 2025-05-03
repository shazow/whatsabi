import { expect, test, describe } from 'vitest';

import { selectorsFromBytecode, selectorsFromABI } from '../index';

// many_functions test vyper code borrowed from here: https://github.com/vyperlang/vyper/blob/219b49c9e1f10611340502ed958b4c10d21b78aa/tests/unit/compiler/test_bytecode_runtime.py#L16
// compiled with:
// $ vyper -O codesize -f "bytecode_runtime" many-funcs.vyper
// $ vyper -O gas -f "bytecode_runtime" many-funcs.vyper

describe.skip('vyper selectors from bytecode', () => {
  // Implementation notes:
  // https://github.com/vyperlang/vyper/blob/master/vyper/codegen/module.py
  // https://github.com/vyperlang/vyper/pull/3496

  const selectors = [
    '0x05f1e05f', // foo2()
    '0xd28958b8', // foo3()
    '0xd38955e8', // foo1()
    '0xe425acd1', // foo4()
    '0xfa22b1ed', // foo5()
  ];

  test('vyper many functions sparse', () => {
    const code = "0x5f3560e01c60026003821660011b61007a01601e395f51565b63d38955e8811861002a573461007657005b63d28958b88118610072573461007657005b6305f1e05f8118610072573461007657005b63e425acd18118610060573461007657005b63fa22b1ed8118610072573461007657005b5f5ffd5b5f80fd0018004e0072003c";

    const r = selectorsFromBytecode(code);
    r.sort();

    expect(r).toEqual(selectors);
  });

  test('vyper many functions dense', () => {
    const code = "0x5f3560e01c600561006d601b395f51600760078260ff16848460181c0260181c06028260081c61ffff1601601939505f51818160181c14600336111615610065578060fe16361034826001160217610069578060081c61ffff16565b005b005b005b005b005b5f5ffd5b5f80fd001600720505f1e05f005d05d28958b8005f05fa22b1ed006305d38955e8005b05e425acd1006105";

    const r = selectorsFromBytecode(code);
    r.sort();

    expect(r).toEqual(selectors);
  });
});
