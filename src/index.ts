import { DocumentNode } from "graphql";
import { cleanRequest as cleanRequestJTD } from "./jtd";
import { cleanRequest as cleanRequestJTDMin } from "./jtd-min";
import { IJtdRoot, IJtdMinRoot } from '@vostro/jtd-types';

export function cleanRequest(query: DocumentNode, variables: any | undefined, rootSchema: IJtdRoot | IJtdMinRoot) {
  if((rootSchema as IJtdRoot).metadata) {
    return cleanRequestJTD(query, variables, rootSchema);
  }
  return cleanRequestJTDMin(query, variables, rootSchema);
  
}
