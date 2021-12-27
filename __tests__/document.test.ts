import { buildSchema, FieldNode, Kind, OperationDefinitionNode } from "graphql";
import gql from "graphql-tag";
import {generateJDTFromSchema} from "@vostro/graphql-jtd";
import { cleanDocument, cleanObject, cleanDocumentWithMeta } from '../src/index';
import { JtdType } from "@vostro/jtd-types";
import demoSchema from "./utils/demo-schema";


test("clean document - basic test", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const query = gql`query testQuery {
    lll: pocket {
      id
    }
    pocket {
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
  const query = gql`query testQuery($req: String!, $optional: String, $arr: [String]!) {
    req: pocket(req: $req, arr: $arr) {
      id
    }
    optional: pocket(version: $optional) {
      id
      version
    }
  }`;

  const newQuery = cleanDocument(query, rootSchema);
  // logger.log("newQuery",  newQuery);
  expect(newQuery.definitions).toHaveLength(1);
  const operation = newQuery.definitions[0] as OperationDefinitionNode;
  expect(operation.selectionSet.selections).toHaveLength(2);
  expect(operation.variableDefinitions).toHaveLength(2);
  const variableDef = (operation.variableDefinitions || [])[0];
  expect(variableDef?.variable.name.value).toBe("req")
  const pocketArgs = operation.selectionSet.selections.find((s) => {
    return s.kind === Kind.FIELD && s.alias?.value === "optional";
  }) as FieldNode;

  expect(pocketArgs.arguments).toHaveLength(0);
});


test("clean document with meta - basic arguments", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const query = gql`query testQuery($req: String!, $optional: String, $arr: [String]!) {
    req: pocket(req: $req, arr: $arr) {
      id
    }
    optional: pocket(version: $optional) {
      id
      version
    }
  }`;

  const {doc, meta} = cleanDocumentWithMeta(query, rootSchema);
  // logger.log("newQuery",  newQuery);
  expect(doc.definitions).toHaveLength(1);
  const operation = doc.definitions[0] as OperationDefinitionNode;
  expect(operation.selectionSet.selections).toHaveLength(2);
  expect(operation.variableDefinitions).toHaveLength(2);
  const variableDef = (operation.variableDefinitions || [])[0];
  expect(variableDef?.variable.name.value).toBe("req")
  const pocketArgs = operation.selectionSet.selections.find((s) => {
    return s.kind === Kind.FIELD && s.alias?.value === "optional";
  }) as FieldNode;

  expect(pocketArgs.arguments).toHaveLength(0);


  expect(meta.operations).toBeDefined();
  expect(meta.operations).toHaveLength(1);
  const op = meta.operations[0];
  expect(op.name).toEqual("testQuery");
  expect(op.variableTypes).toBeDefined();
  const argKeys = Object.keys(op.variableTypes);
  expect(argKeys).toHaveLength(2);
  expect(op.variableTypes.req).toBeDefined();
  expect(op.variableTypes.req.type === JtdType.STRING);
  expect(op.variableTypes.arr).toBeDefined();
  expect(op.variableTypes.arr.nullable).toBe(false);
  expect(op.variableTypes.arr?.elements).toBeDefined();
  expect(op.variableTypes.arr?.elements?.type === JtdType.STRING);

});



test("clean document with meta - basic arguments", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const query = gql`query testQuery($req: Hand!, $arr: [Person]!) {
    pocket2(req: $req, arr: $arr) {
      id
      version
    }
  }`;

  const {doc, meta} = cleanDocumentWithMeta(query, rootSchema);

  expect(meta.operations).toBeDefined();
  expect(meta.operations).toHaveLength(1);
  const op = meta.operations[0];
  expect(op.name).toEqual("testQuery");
  expect(op.variableTypes).toBeDefined();
  const argKeys = Object.keys(op.variableTypes);
  expect(argKeys).toHaveLength(2);
  expect(op.variableTypes.req).toBeDefined();
  expect(op.variableTypes.req.type === rootSchema.definitions?.Person);
  expect(op.variableTypes.req.nullable).toBe(false);
  expect(op.variableTypes.arr).toBeDefined();
  expect(op.variableTypes.arr.nullable).toBe(false);
  expect(op.variableTypes.arr?.elements).toBeDefined();
  expect(op.variableTypes.arr?.elements?.type === rootSchema.definitions?.Person);

});

