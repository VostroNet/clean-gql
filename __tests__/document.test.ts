import { buildSchema, FieldNode, Kind, OperationDefinitionNode } from "graphql";
import gql from "graphql-tag";
import {generateJDTFromSchema} from "@vostro/graphql-jtd";
import { cleanDocument, cleanObject, cleanDocumentWithMeta } from '../src/index';
import { JtdType } from "@vostro/jtd-types";
import demoSchema from "./utils/demo-schema";


test("clean document - basic test", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const query = gql`query testQuery {
    lll: queryTest1 {
      t1rfield1
    }
    queryTest1 {
      version
    }
  }`;

  const newQuery = cleanDocument(query, rootSchema);
  // logger.log("newQuery",  newQuery);
  expect(newQuery.definitions).toHaveLength(1);
  const operation = newQuery.definitions[0] as OperationDefinitionNode;
  expect(operation.selectionSet.selections).toHaveLength(1);
});



test("clean document - arguments", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const query = gql`query testQuery($arg1: String!, $optional: String, $arg2: [test1input1]!) {
    req: queryTest1(arg1: $arg1, arg2: $arg2) {
      t1rfield1
    }
    optional: queryTest3(version: $optional) {
      t1rfield1
      t1rfield2
    }
  }`;

  const newQuery = cleanDocument(query, rootSchema);
  // logger.log("newQuery",  newQuery);
  expect(newQuery.definitions).toHaveLength(1);
  const operation = newQuery.definitions[0] as OperationDefinitionNode;
  expect(operation.selectionSet.selections).toHaveLength(2);
  expect(operation.variableDefinitions).toHaveLength(2);
  const variableDef1 = (operation.variableDefinitions || [])[0];
  expect(variableDef1?.variable.name.value).toBe("arg1")
  const variableDef2 = (operation.variableDefinitions || [])[1];
  expect(variableDef2?.variable.name.value).toBe("arg2")
  const optionalArgs = operation.selectionSet.selections.find((s) => {
    return s.kind === Kind.FIELD && s.alias?.value === "optional";
  }) as FieldNode;

  expect(optionalArgs.arguments).toHaveLength(0);
});


test("clean document with meta - basic arguments", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const query = gql`query testQuery($arg1: String!, $optional: String, $arg2: [test1input1]!) {
    req: queryTest1(arg1: $arg1, arg2: $arg2) {
      t1rfield1
    }
    optional: queryTest3(version: $optional) {
      t1rfield1
      t1rfield2
    }
  }`;

  const {doc, meta} = cleanDocumentWithMeta(query, rootSchema);
  // logger.log("newQuery",  newQuery);
  expect(doc.definitions).toHaveLength(1);
  const operation = doc.definitions[0] as OperationDefinitionNode;
  expect(operation.selectionSet.selections).toHaveLength(2);
  expect(operation.variableDefinitions).toHaveLength(2);
  const variableDef1 = (operation.variableDefinitions || [])[0];
  expect(variableDef1?.variable.name.value).toBe("arg1")
  const variableDef2 = (operation.variableDefinitions || [])[1];
  expect(variableDef2?.variable.name.value).toBe("arg2")
  const optionalArgs = operation.selectionSet.selections.find((s) => {
    return s.kind === Kind.FIELD && s.alias?.value === "optional";
  }) as FieldNode;

  expect(optionalArgs.arguments).toHaveLength(0);

  expect(meta.operations).toBeDefined();
  expect(meta.operations).toHaveLength(1);
  const op = meta.operations[0];
  expect(op.name).toEqual("testQuery");
  expect(op.variableTypes).toBeDefined();
  const argKeys = Object.keys(op.variableTypes);
  expect(argKeys).toHaveLength(2);
  expect(op.variableTypes.arg1).toBeDefined();
  expect(op.variableTypes.arg1.type === JtdType.STRING);
  expect(op.variableTypes.arg2).toBeDefined();
  expect(op.variableTypes.arg2.nullable).toBe(false);
  expect(op.variableTypes.arg2?.elements).toBeDefined();
  expect(op.variableTypes.arg2?.elements?.type === rootSchema.definitions?.test1input1);

});



// test("clean document with meta - basic arguments", () => {
//   const rootSchema = generateJDTFromSchema(demoSchema);
//   const query = gql`query testQuery($arg1: String!, $optional: String, $arg2: [test1input1]!) {
//     queryTest1(arg1: $arg1, arg2: $arg2) {
//       t1i1field1
//     }
//   }`;

//   const {doc, meta} = cleanDocumentWithMeta(query, rootSchema);

//   expect(meta.operations).toBeDefined();
//   expect(meta.operations).toHaveLength(1);
//   const op = meta.operations[0];
//   expect(op.name).toEqual("testQuery");
//   expect(op.variableTypes).toBeDefined();
//   const argKeys = Object.keys(op.variableTypes);
//   expect(argKeys).toHaveLength(2);
//   expect(op.variableTypes.arg1).toBeDefined();
//   expect(op.variableTypes.req.type === rootSchema.definitions?.Person);
//   expect(op.variableTypes.req.nullable).toBe(false);
//   expect(op.variableTypes.arr).toBeDefined();
//   expect(op.variableTypes.arr.nullable).toBe(false);
//   expect(op.variableTypes.arr?.elements).toBeDefined();
//   expect(op.variableTypes.arg2?.elements?.type === rootSchema.definitions?.test1input1);

// });

