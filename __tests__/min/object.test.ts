import { generateJDTMinFromSchema } from '@vostro/graphql-jtd';
import demoSchema from '../utils/demo-schema';
import { cleanObject } from '../../src/jtd-min';

test("clean object - basic", () => {
  const rootSchema = generateJDTMinFromSchema(demoSchema);
  const obj = {
    t1i1field1: "1",
    t1i1field2: "test",
    optional: true,
  };
  const testType = rootSchema.def?.test1Result || {};
  const newObj = cleanObject(obj, testType, rootSchema);
  expect(newObj.optional).not.toBeDefined();
});



test("clean object - complex", () => {
  const rootSchema = generateJDTMinFromSchema(demoSchema);
  const obj = {
    t1rfield1: "1",
    t1rfield2: {
      t1rfield1: "test",
      optional: true,
    },
    optional: true,
  };
  const testType = rootSchema.def?.obj2|| {};
  const newObj = cleanObject(obj, testType, rootSchema);
  expect(newObj.optional).not.toBeDefined();
  expect(newObj?.t1rfield2?.t1rfield1).toBeDefined();
});

test("clean object - custom scalar", () => {
  const rootSchema = generateJDTMinFromSchema(demoSchema);
  const obj = {
    t1i1complx: "Hello",
    t1i2complx: {
      "allow": "anything",
    },
    optional: true,
  };
  const testType = rootSchema.def?.test1input1obj || {};
  const newObj = cleanObject(obj, testType, rootSchema);
  expect(newObj.optional).not.toBeDefined();
  expect(newObj?.t1i1complx).toBeDefined();
  expect(newObj?.t1i2complx).toBeDefined();
  expect(newObj?.t1i2complx?.allow).toBeDefined();
  expect(newObj?.t1i2complx?.allow).toBe("anything");
});

