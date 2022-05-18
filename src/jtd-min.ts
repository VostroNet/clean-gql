import {
  visit,
  Kind,
  DocumentNode,
  OperationDefinitionNode,
  NamedTypeNode,
  TypeNode,
} from "graphql";
import { IJtdMin, IJtdMinRoot, JtdMinType } from "@vostro/jtd-types";
import { OKind, objVisit } from "@vostro/object-visit";
import { extractVariables } from "./shared";

export function isJTDMinArrayType(typedef: IJtdMin) {
  return !!typedef.el;
}

export function isJTDScalarType(typeDef: IJtdMin) {
  switch (typeDef.t) {
    case JtdMinType.BOOLEAN:
    case JtdMinType.FLOAT32:
    case JtdMinType.FLOAT64:
    case JtdMinType.INT16:
    case JtdMinType.INT32:
    case JtdMinType.INT8:
    case JtdMinType.STRING:
    case JtdMinType.TIMESTAMP:
    case JtdMinType.UINT16:
    case JtdMinType.UINT32:
    case JtdMinType.UINT8:
    case JtdMinType.UNKNOWN:
      return true;
  }
  return false;
}

function getJDTMinTypeFromTypeNode(
  typeNode: TypeNode,
  schema: IJtdMinRoot
): IJtdMin {
  let type = typeNode;
  let isNonNull = false;
  let isList = false;
  if (type.kind === Kind.NON_NULL_TYPE) {
    type = type.type;
    isNonNull = true;
  }
  if (type.kind === Kind.LIST_TYPE) {
    type = type.type;
    isList = true;
  }
  let typeDef;
  const typeName = (type as NamedTypeNode).name.value;
  switch (typeName) {
    case "Int":
      typeDef = { t: JtdMinType.INT32 };
      break;
    case "ID":
    case "String":
      typeDef = { t: JtdMinType.STRING };
      break;
    case "Float":
      typeDef = { t: JtdMinType.FLOAT32 };
      break;
  }
  if (!typeDef && schema.def && schema.def[typeName]) {
    typeDef = schema.def[typeName];
  }
  if (!typeDef) {
    typeDef = { t: JtdMinType.UNKNOWN };
    // logger.err(`no type found for ${typeName}`);
    // throw `no type found for ${typeName}`;
  }
  if (isList) {
    typeDef = { el: typeDef };
  }
  if (isNonNull) {
    typeDef.rq = true;
  }
  return typeDef;
}

function getFromJDTMinSchema(
  path: string[],
  schema: IJtdMinRoot,
  getField = false,
  currentLevel: IJtdMin | undefined = schema
) {
  let p = path;

  let prop;
  for (let x = 0; x < p.length; x++) {
    prop = undefined;
    const currentPos = p[x];
    if (currentLevel?.p && currentLevel?.p[currentPos]) {
      prop = currentLevel?.p[currentPos];
    }
    if (prop) {
      if (prop.p) {
        currentLevel = prop;
      } else if (schema.def) {
        if (prop.ref) {
          currentLevel = schema.def[prop.ref];
        }
        if (prop.el?.t) {
          if (isJTDScalarType(prop.el)) {
            return prop.el;
          }
          currentLevel = schema.def[prop.el.t];
        }
        if (prop.el?.ref) {
          currentLevel = schema.def[prop.el.ref];
        }
        if (isJTDScalarType(prop)) {
          return prop;
        }
      }
    } else {
      return undefined;
    }
  }
  if (prop?.ref && schema.def && !getField) {
    return schema.def[prop.ref];
  }
  return prop;
}

export function cleanDocumentWithJTDMin(
  query: DocumentNode,
  schema: IJtdMinRoot
) {
  return cleanDocumentWithJTDMinMeta(query, schema).doc;
}

interface operation {
  name?: string;
  variableTypes: { [key: string]: IJtdMin };
}

export function cleanDocumentWithJTDMinMeta(
  query: DocumentNode,
  schema: IJtdMinRoot
) {
  let fieldPath = [] as string[];
  let variableDefinitions = {} as any;
  let operations = [] as operation[];
  // let currentOperation;
  const newSchema = visit(query, {
    [Kind.OPERATION_DEFINITION]: {
      enter: (def, key, parent, path, ancestors) => {
        if (def.variableDefinitions) {
          def.variableDefinitions.forEach((vd) => {
            variableDefinitions[vd.variable.name.value] = 0;
          });
        }
        if (def.operation === "query") {
          fieldPath.push((schema.md as any).query);
        } else {
          fieldPath.push((schema.md as any).mutation);
        }
      },
      leave: (def) => {
        fieldPath.pop();
        if (def.variableDefinitions) {
          const val = {
            ...def,
            variableDefinitions: def.variableDefinitions.filter((vd) => {
              return variableDefinitions[vd.variable.name.value] > 0;
            }),
          } as OperationDefinitionNode;
          operations.push({
            name: val.name?.value,
            variableTypes: (val.variableDefinitions || []).reduce(
              (o, varDef) => {
                o[varDef.variable.name.value] = getJDTMinTypeFromTypeNode(
                  varDef.type,
                  schema
                );
                return o;
              },
              {} as { [key: string]: IJtdMin }
            ),
          });
          variableDefinitions = {}; //Reset for the next def
          return val;
        }
        return undefined;
      },
    },
    [Kind.ARGUMENT]: {
      enter: (node, key, parent, path, ancestors) => {
        const field = getFromJDTMinSchema(fieldPath, schema, true);
        // console.log("arg", {node, key, parent, fieldPath, path, ancestors, field});

        if (field?.args) {
          if (field.args[node.name.value]) {
            switch (node.value.kind) {
              case Kind.OBJECT:
                const vars = extractVariables(node.value.fields);
                vars.forEach((varObj) => {
                  variableDefinitions[varObj.name.value]++;
                });
                break;
              case Kind.VARIABLE:
                variableDefinitions[node.value.name.value]++;
                break;
              default:
                variableDefinitions[node.name.value]++;
                break;
            }
            return node;
          }
        }
        return null;
      },
    },
    [Kind.FIELD]: {
      enter: (node, key, parent, path, ancestors) => {
        fieldPath.push(node.name.value);
        const isValid =
          node.name.value.indexOf("__") === 0 ||
          getFromJDTMinSchema(fieldPath, schema);
        if (isValid) {
          return node;
        }
        fieldPath.pop();
        return null;
      },
      leave: (node, key, parent, path, ancestors) => {
        fieldPath.pop();
        if (node) {
          const type = getFromJDTMinSchema(fieldPath, schema);
          if (type && !isJTDScalarType(type)) {
            if (node.selectionSet?.selections.length === 0) {
              return null;
            }
          }
        }
        return undefined;
      },
    },
  });

  return { doc: newSchema, meta: { operations } };
}

export function cleanObject(obj: any, type: IJtdMin, schema: IJtdMinRoot) {
  let fieldPath = [] as string[];
  if (isJTDScalarType(type)) {
    return obj;
  }
  if ((type as any).enum) {
    if ((type as any).enum.indexOf(obj) > -1) {
      return obj;
    }
    return undefined;
  }
  const newSchema = objVisit(obj, {
    [OKind.FIELD]: {
      enter: (node, key, parent, path, ancestors) => {
        fieldPath.push(`${key}`);
        const prop = getFromJDTMinSchema(fieldPath, schema, false, type);
        if (prop) {
          return node;
        }
        return undefined;
      },
      leave: (node, key, parent, path, ancestors) => {
        fieldPath.pop();
        return node;
      },
    },
    [OKind.OBJECT]: {
      enter: (node, key, parent, path, ancestors) => {
        if (key && isNaN(key as any)) {
          fieldPath.push(`${key}`);
          const isValid = getFromJDTMinSchema(fieldPath, schema, false, type);
          if (isValid) {
            return node;
          }
          return undefined;
        }
        return node;
      },
      leave: (node, key, parent, path, ancestors) => {
        if (key && isNaN(key as any)) {
          fieldPath.pop();
        }
        return node;
      },
    },
    [OKind.ARRAY]: {
      enter: (node, key, parent, path, ancestors) => {
        fieldPath.push(`${key}`);
        const isValid = getFromJDTMinSchema(fieldPath, schema, false, type);
        if (isValid) {
          return node;
        }
        return undefined;
      },
      leave: (node, key, parent, path, ancestors) => {
        fieldPath.pop();
        return node;
      },
    },
  });
  return newSchema;
}

export function cleanVariables(
  meta: { operations: operation[] },
  rootSchema: IJtdMinRoot,
  variables: any
) {
  return meta.operations.reduce((v, op) => {
    Object.keys(op.variableTypes).forEach((k) => {
      if (!v[k] && variables[k]) {
        const type = op.variableTypes[k];
        if (isJTDMinArrayType(type)) {
          const el = type.el || type;
          if (Array.isArray(variables[k])) {
            v[k] = variables[k]
              .map((vr: any) => cleanObject(vr, el as IJtdMin, rootSchema))
              .filter((vr: any) => vr !== undefined);
          } else {
            v[k] = cleanObject(variables[k], el, rootSchema);
          }
        } else {
          v[k] = cleanObject(variables[k], type, rootSchema);
        }
      }
    });
    return v;
  }, {} as any);
}

export function cleanRequest(
  query: DocumentNode,
  variables: any | undefined,
  rootSchema: IJtdMinRoot
) {
  const { doc, meta } = cleanDocumentWithJTDMinMeta(query, rootSchema);
  let vars: any;
  if (variables) {
    vars = cleanVariables(meta, rootSchema, variables);
  }
  return {
    query: doc,
    variables: vars,
  };
}
