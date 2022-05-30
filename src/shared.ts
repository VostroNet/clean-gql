import { Kind } from 'graphql';
export function extractVariables(node: any) {
  let objValueToProcess: any = [node];
  let variableFields = [];
  do {
    const popped = objValueToProcess.pop();
    const obj = popped.value?.kind ? popped.value : popped;
    switch(obj.kind) {
      case Kind.OBJECT:
        objValueToProcess = [].concat(objValueToProcess, obj.fields);
        break;
      case Kind.VARIABLE:
        variableFields.push(obj.name.value);
        break;
      case Kind.LIST:
        objValueToProcess = [].concat(objValueToProcess, ...obj.values);
        break;
      case Kind.ARGUMENT:
        objValueToProcess.push(obj.value);
        break;
      case Kind.VARIABLE:
        variableFields.push(obj.name.value);
        break;
    }


  } while(objValueToProcess.length > 0);
  return variableFields;
}