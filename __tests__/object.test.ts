import { generateJDTFromSchema } from '@vostro/graphql-jtd';
import demoSchema from './utils/demo-schema';
import { cleanObject } from '../src/index';

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
  