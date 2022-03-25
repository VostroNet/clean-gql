import { generateJDTFromSchema } from '@vostro/graphql-jtd';
import demoSchema from '../utils/demo-schema';
import { cleanObject } from '../../src/jtd';

test("clean object - basic", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const obj = {
    t1i1field1: "1",
    t1i1field2: "test",
    optional: true,
  };
  const testType = rootSchema.definitions?.test1Result || {};
  const newObj = cleanObject(obj, testType, rootSchema);
  expect(newObj.optional).not.toBeDefined();
});



test("clean object - complex", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const obj = {
    t1rfield1: "1",
    t1rfield2: {
      t1rfield1: "test",
      optional: true,
    },
    optional: true,
  };
  const testType = rootSchema.definitions?.obj2|| {};
  const newObj = cleanObject(obj, testType, rootSchema);
  expect(newObj.optional).not.toBeDefined();
  expect(newObj?.t1rfield2?.t1rfield1).toBeDefined();
});
