import {
  visit,
  Kind,
  DocumentNode,
  OperationDefinitionNode,
  NamedTypeNode,
  TypeNode,
  VariableNode,
} from "graphql";
import { IJtd, IJtdRoot, JtdType, IJtdMinRoot } from "@vostro/jtd-types";
import { OKind, objVisit } from "@vostro/object-visit";
import { extractVariables } from "./shared";

export function isJTDArrayType(typedef: IJtd) {
  return !!typedef.elements;
}

export function isJTDScalarType(typeDef: IJtd) {
  switch (typeDef.type) {
    case JtdType.BOOLEAN:
    case JtdType.FLOAT32:
    case JtdType.FLOAT64:
    case JtdType.INT16:
    case JtdType.INT32:
    case JtdType.INT8:
    case JtdType.STRING:
    case JtdType.TIMESTAMP:
    case JtdType.UINT16:
    case JtdType.UINT32:
    case JtdType.UINT8:
    case JtdType.UNKNOWN:
      return true;
  }
  return false;
}

function getJDTTypeFromTypeNode(typeNode: TypeNode, schema: IJtdRoot): IJtd {
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
  if (type.kind === Kind.NON_NULL_TYPE) {
    type = type.type;
    isNonNull = true;
  }
  let typeDef;
  const typeName = (type as NamedTypeNode).name.value;
  switch (typeName) {
    case "Int":
      typeDef = { type: JtdType.INT32 };
      break;
    case "ID":
    case "String":
      typeDef = { type: JtdType.STRING };
      break;
    case "Float":
      typeDef = { type: JtdType.FLOAT32 };
      break;
  }
  if (!typeDef && schema.definitions && schema.definitions[typeName]) {
    typeDef = schema.definitions[typeName];
  }
  if (!typeDef) {
    typeDef = { type: JtdType.UNKNOWN };
  }
  if (isList) {
    typeDef = { elements: typeDef };
  }
  if (isNonNull) {
    typeDef.nullable = false;
  } else {
    typeDef.nullable = true;
  }
  return typeDef;
}

function getFromJDTSchema(
  path: string[],
  schema: IJtdRoot,
  getField = false,
  currentLevel: IJtd | undefined = schema
) {
  let p = path;
  let prevProp;
  let prop;
  for (let x = 0; x < p.length; x++) {
    prop = undefined;
    const argCheck = p[x].match(/\[(.*?)\]/);
    if (argCheck) {
      const arg = argCheck[1];
      if (prevProp?.arguments && prevProp?.arguments[arg]) {
        prop = prevProp.arguments[arg];
      }
    } else {
      const currentPos = p[x];
      if (currentLevel?.properties && currentLevel.properties[currentPos]) {
        prop = currentLevel.properties[currentPos];
      } else if (
        currentLevel?.optionalProperties &&
        currentLevel?.optionalProperties[currentPos]
      ) {
        prop = currentLevel.optionalProperties[currentPos];
      }
    }

    
    if (prop) {
      if (prop.properties || prop.optionalProperties) {
        currentLevel = prop;
      } else if (schema.definitions) {
        if (prop.ref) {
          currentLevel = schema.definitions[prop.ref];
        }
        if (prop.elements?.type) {
          if (isJTDScalarType(prop.elements)) {
            return prop.elements;
          }
          currentLevel = schema.definitions[prop.elements.type];
        }
        if (prop.elements?.ref) {
          currentLevel = schema.definitions[prop.elements.ref];
        }
        if (isJTDScalarType(prop)) {
          return prop;
        }
      }
    } else {
      return undefined;
    }
    prevProp = prop;
  }
  if (prop?.ref && schema.definitions && !getField) {
    return schema.definitions[prop.ref];
  }
  return prop;
}

export function cleanDocument(query: DocumentNode, schema: IJtdRoot) {
  return cleanDocumentWithMeta(query, schema).doc;
}

interface operation {
  name?: string;
  variableTypes: { [key: string]: IJtd };
}

export function cleanDocumentWithMeta(query: DocumentNode, schema: IJtdRoot) {
  let fieldPath = [] as string[];
  let insideArg = false;
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
          fieldPath.push((schema.metadata as any).query);
        } else {
          fieldPath.push((schema.metadata as any).mutation);
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
                o[varDef.variable.name.value] = getJDTTypeFromTypeNode(
                  varDef.type,
                  schema
                );
                return o;
              },
              {} as { [key: string]: IJtd }
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
        const field = getFromJDTSchema(fieldPath, schema, true);
        insideArg = true;
        fieldPath.push(`[${node.name.value}]`);
        if (field?.arguments) {
          if (field.arguments[node.name.value]) {
            const vars = extractVariables(node);
            vars.forEach((varName) => {
              variableDefinitions[varName]++;
            });
            return node;
          }
        }

        insideArg = false;
        fieldPath.pop();
        return null;
      },
      leave: (node, key, parent, path, ancestors) => {
        fieldPath.pop();
        insideArg = false;
        return undefined;
      }
    },
    [Kind.OBJECT_FIELD]: {
      enter: (node, key, parent, path, ancestors) => {
        if (insideArg) {
          fieldPath.push(node.name.value);
          const isValid =
            node.name.value.indexOf("__") === 0 ||
            getFromJDTSchema(fieldPath, schema);
          if (isValid) {
            return node;
          }
          if (node.value.kind === Kind.VARIABLE) {
            variableDefinitions[(node.value as VariableNode).name.value]--;
          }
          fieldPath.pop();
          return null;
        }
      },
      leave: (node, key, parent, path, ancestors) => {
        if (insideArg) {
          fieldPath.pop();
        }
        return undefined;
      }
    },
    [Kind.FIELD]: {
      enter: (node, key, parent, path, ancestors) => {
        fieldPath.push(node.name.value);
        const isValid =
          node.name.value.indexOf("__") === 0 ||
          getFromJDTSchema(fieldPath, schema);
        if (isValid) {
          return node;
        }
        fieldPath.pop();
        return null;
      },
      leave: (node, key, parent, path, ancestors) => {
        fieldPath.pop();
        if (node) {
          const type = getFromJDTSchema(fieldPath, schema);
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

export function cleanObject(obj: any, type: IJtd, schema: IJtdRoot) {
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
        const isValid = getFromJDTSchema(fieldPath, schema, false, type);
        if (isValid) {
          return node;
        }
        fieldPath.pop();
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
          const isValid = getFromJDTSchema(fieldPath, schema, false, type);
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
        const isValid = getFromJDTSchema(fieldPath, schema, false, type);
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
      if (!v[k] && variables[k] !== undefined) {
        const type = op.variableTypes[k];
        if (isJTDArrayType(type)) {
          const el = type.elements || type;
          if (Array.isArray(variables[k])) {
            v[k] = variables[k]
              .map((vr: any) =>
                cleanObject(vr, type.elements as IJtd, rootSchema)
              )
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
  rootSchema: IJtdRoot
) {
  const { doc, meta } = cleanDocumentWithMeta(query, rootSchema);
  let vars: any;
  if (variables) {
    vars = cleanVariables(meta, rootSchema, variables);
  }

  return {
    query: doc,
    variables: vars,
  };
}
