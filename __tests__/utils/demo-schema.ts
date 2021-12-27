import { buildSchema } from "graphql";

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

export default buildSchema(`enum testEnum1 {
  option1
  option2
  option3
}
input test1input1 {
  t1i1field1: ID
  t1i1field2: String
  t1i1field3: Int
  t1i1field4: Float
  t1i1field5: testEnum1
}
type test1Result {
  t1rfield1: ID!
  t1rfield2: String!
  t1rfield3: Int!
  t1rfield4: Float!
  t1rfield5: testEnum1!
}
type Query {
  queryTest1(arg1: String!, arg2: [test1input1]): test1Result!
  queryTest2(arg1: testEnum1!, arg2: [test1input1]): test1Result
  queryTest3: test1Result
}
type Mutation {
  mutationTest1(arg1: String!, arg2: [test1input1]): test1Result
}`);