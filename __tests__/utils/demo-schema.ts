import { buildSchema } from "graphql";
import jsonType from "@vostro/graphql-types/lib/json";
// export default buildSchema(`
// enum Episode {
//   NEWHOPE
//   EMPIRE
//   JEDI
// }
// type Hand {
//   name: String
// }
// type Person {
//   id: ID!
//   name: String!
//   money: Float
//   age: Int
//   fav: Episode
//   hands: [Hand]
// }
// type Query {
//   peter: Person
//   pocket(req: String!, arr: [String]!): Person!
//   pocket2(req: Hand!, arr: [Person]!): Episode!
//   people: [Person]!
//   many: [Person]
// }
// type Mutation {
//   pan: Person
// }
// `);

export default buildSchema(`
scalar GQLTJson
enum testEnum1 {
  option1
  option2
  option3
}
input test1input1obj {
  t1i1complx: String
  t1i2complx: GQLTJson
}
input test1input1 {
  t1i1field1: ID
  t1i1field2: String
  t1i1field3: Int
  t1i1field4: Float
  t1i1field5: testEnum1
  t1i1field6: test1input1obj
}
input test2input1 {
  t2i1f1: Boolean!
  t2i1f2: String!
}
type test1Result {
  t1rfield1: ID!
  t1rfield2: String!
  t1rfield3: Int!
  t1rfield4: Float!
  t1rfield5: testEnum1!
}
type obj1 {
  t1rfield1: ID!
}
type obj2 {
  t1rfield1: ID!
  t1rfield2: obj1!
  t1rfield3: ID!
  t1rfield4: ID!
}
type Query {
  queryTest1(arg1: String!, arg2: [test1input1]): test1Result!
  queryTest2(arg1: testEnum1!, arg2: [test1input1]): test1Result
  queryTest3: test1Result
  queryTest4: obj2
  queryTest5: [obj2!]!
  queryTest6(arg1: test2input1!) : obj1
}
type Mutation {
  mutationTest1(arg1: String!, arg2: [test1input1]): test1Result
}`);
