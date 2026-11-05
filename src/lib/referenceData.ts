import { apiClient } from 'app';
import { ContentType } from '@/apiclient/http-client';

export interface BoardPosition {
  id:number; created_at:string; position_name:string; position_level:number; description?:string;
  position_code?:string; is_active?:boolean; minimum_investment_shares?:number;
}

export function positionPayload(form: {title:string;hierarchy_level:number;description:string;position_code:string;is_active:boolean;minimum_investment_shares:number}, create:boolean) {
  return {position_name:form.title.trim(), position_level:form.hierarchy_level,
    description:form.description, is_active:form.is_active,
    minimum_investment_shares:form.minimum_investment_shares,
    ...(create ? {position_code:form.position_code.trim()} : {})};
}

// Keep new calls outside the generated client; reuse its authentication and safe-read retry policy.
export async function referenceRequest(path:string, body?:unknown) {
  let response:Response;
  try {
    response = await apiClient.request({path:`/reference-data/${path}`, method:body ? 'POST':'GET',
      ...(body ? {body, type:ContentType.Json} : {})});
  } catch (e) {
    if (e instanceof Response) response=e;
    else throw e;
  }
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Reference setup failed. Check readiness before retrying.');
  return result;
}
