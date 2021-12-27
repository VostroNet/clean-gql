import { generateJDTFromSchema } from '@vostro/graphql-jtd';
import demoSchema from './utils/demo-schema';
import { cleanObject } from '../src/index';

test("clean object - basic", () => {
    const rootSchema = generateJDTFromSchema(demoSchema);
    const obj = {
      id: "1",
      name: "test",
      optional: true,
    };
    const personType = rootSchema.definitions?.Person || {};
    const newObj = cleanObject(obj, personType, rootSchema);
    expect(newObj.optional).not.toBeDefined();
  });
  