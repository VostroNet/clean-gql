import { generateJDTFromSchema } from "@vostro/graphql-jtd";
import gql from "graphql-tag";
import { cleanRequest } from "../../src";
import demoSchema from "../utils/demo-schema";

test("clean request - query - basic", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const query = gql`query testQuery($arg1: String!, $optional: String, $arg2: [test1input1]!) {
    req: queryTest1(arg1: $arg1, arg2: $arg2) {
      t1i1field1
    }
    optional: queryTest3(version: $optional) {
      t1i1field1
      t1i1field2
    }
  }`;

  const variables = {
    arg1: "Howdy",
    optional: "Like a ghost",
    arg2: [{
      t1i1field2: "Test1"
    }, {
      t1i1field2: "test2",
      optional: "not to be defined",
    }],
  };


  const newRequest = cleanRequest(query, variables, rootSchema);

  expect(newRequest.query).toBeDefined();
  expect(newRequest.variables).toBeDefined();
  expect(newRequest.variables?.optional).not.toBeDefined();
  expect(newRequest.variables?.arg1).toBe("Howdy");
  expect(newRequest.variables?.arg2).toHaveLength(2);
  expect(newRequest.variables?.arg2[0].t1i1field2).toBe("Test1");
  expect(newRequest.variables?.arg2[1].t1i1field2).toBe("test2");
  expect(newRequest.variables?.arg2[1].optional).not.toBeDefined();
});

test("clean request - query - do not filter false from args", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const query = gql`query testQuery($arg2: Boolean) {
    queryTest6(arg1: {
      t2i1f1: $arg2
      t2i1f2: "Check2"
    }) {
      t1rfield1
    }
  }`;

  const variables = {
    arg2: false,
    optional: "defined"
  };


  const newRequest = cleanRequest(query, variables, rootSchema);

  expect(newRequest.query).toBeDefined();
  expect(newRequest.variables).toBeDefined();
  expect(newRequest.variables?.optional).not.toBeDefined();
  expect(newRequest.variables?.arg2).toBeDefined();
  expect(newRequest.variables?.arg2).toBe(false);
});

// test("clean request - query - complex arguments", () => {
//   const rootSchema = generateJDTFromSchema(demoSchema);
//   const query = gql`
//     query testQuery($req: Hand!, $optional: String, $arr: [Hand]!) {
//       req: pocket(req: $req, arr: $arr) {
//         id
//       }
//       optional: pocket(version: $optional) {
//         id
//         version
//       }
//     }
//   `;

//   const variables = {
//     req: {
//       name: "defined",
//       optional: "not to be defined",
//     },
//     optional: "Like a ghost",
//     arr: [{
//       name: "defined",
//       optional: "not to be defined",
//     }, {
//       name: "defined",
//     }],
//   };


//   const newRequest = cleanRequest(query, variables, rootSchema);

//   expect(newRequest.query).toBeDefined();
//   expect(newRequest.variables).toBeDefined();
//   expect(newRequest.variables?.optional).not.toBeDefined();
//   expect(newRequest.variables?.req.name).toBe("defined");
//   expect(newRequest.variables?.req.optional).not.toBeDefined();
//   expect(newRequest.variables?.arr).toHaveLength(2);
//   expect(newRequest.variables?.arr[0].name).toBe("defined");
//   expect(newRequest.variables?.arr[0].optional).not.toBeDefined();
//   expect(newRequest.variables?.arr[1].name).toBe("defined");
// });
