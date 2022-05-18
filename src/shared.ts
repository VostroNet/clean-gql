import { Kind } from 'graphql';
export function extractVariables(fields: any) {
  let objValueToProcess: any = [...fields];
  let variableFields = [];
  do {
    const obj = objValueToProcess.pop();
    switch(obj.value.kind) {
      case Kind.OBJECT:
        objValueToProcess = [].concat(objValueToProcess, obj.value.fields);
        break;
      case Kind.VARIABLE:
        variableFields.push(obj.value);
        break;
    }

  } while(objValueToProcess.length > 0);
  return variableFields;
}