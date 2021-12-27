import { generateJDTFromSchema } from "@vostro/graphql-jtd";
import gql from "graphql-tag";
import { cleanRequest } from "../src";
import demoSchema from "./utils/demo-schema";

test("clean request - query - basic", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const query = gql`
    query testQuery($req: String!, $optional: String, $arr: [String]!) {
      req: pocket(req: $req, arr: $arr) {
        id
      }
      optional: pocket(version: $optional) {
        id
        version
      }
    }
  `;

  const variables = {
    req: "Howdy",
    optional: "Like a ghost",
    arr: ["Test1", "test2"],
  };


  const newRequest = cleanRequest(query, variables, rootSchema);

  expect(newRequest.query).toBeDefined();
  expect(newRequest.variables).toBeDefined();
  expect(newRequest.variables?.optional).not.toBeDefined();
  expect(newRequest.variables?.req).toBe("Howdy");
  expect(newRequest.variables?.arr).toHaveLength(2);
  expect(newRequest.variables?.arr[0]).toBe("Test1");
  expect(newRequest.variables?.arr[1]).toBe("test2");
});



test("clean request - query - complex arguments", () => {
  const rootSchema = generateJDTFromSchema(demoSchema);
  const query = gql`
    query testQuery($req: Hand!, $optional: String, $arr: [Hand]!) {
      req: pocket(req: $req, arr: $arr) {
        id
      }
      optional: pocket(version: $optional) {
        id
        version
      }
    }
  `;

  const variables = {
    req: {
      name: "defined",
      optional: "not to be defined",
    },
    optional: "Like a ghost",
    arr: [{
      name: "defined",
      optional: "not to be defined",
    }, {
      name: "defined",
    }],
  };


  const newRequest = cleanRequest(query, variables, rootSchema);

  expect(newRequest.query).toBeDefined();
  expect(newRequest.variables).toBeDefined();
  expect(newRequest.variables?.optional).not.toBeDefined();
  expect(newRequest.variables?.req.name).toBe("defined");
  expect(newRequest.variables?.req.optional).not.toBeDefined();
  expect(newRequest.variables?.arr).toHaveLength(2);
  expect(newRequest.variables?.arr[0].name).toBe("defined");
  expect(newRequest.variables?.arr[0].optional).not.toBeDefined();
  expect(newRequest.variables?.arr[1].name).toBe("defined");
});
