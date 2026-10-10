import { z } from 'zod';
import { NIGERIA_STATES } from './commerce-config';
import { shippingCountryName, postalCodeRequired, regionRequired } from './shipping-countries';
export const addressFieldsSchema=z.object({
  email:z.string().trim().email().max(200),firstName:z.string().trim().min(2).max(80),lastName:z.string().trim().min(2).max(80),
  phone:z.string().trim().min(7).max(30),addressLine1:z.string().trim().min(5).max(240),addressLine2:z.string().trim().max(240).default(''),
  city:z.string().trim().min(2).max(100),state:z.string().trim().max(100).default(''),
  countryCode:z.string().refine(v=>Boolean(shippingCountryName(v))).default('NG'),
  postalCode:z.string().trim().max(32).regex(/^[\p{L}\p{N} -]*$/u).default(''),
});
export const addressLookupSchema=addressFieldsSchema.extend({city:z.string().trim().max(100).default('')});
export const checkoutCustomerSchema=addressFieldsSchema.superRefine((value,ctx)=>{
  if(value.countryCode==='NG'&&!NIGERIA_STATES.includes(value.state))ctx.addIssue({code:'custom',path:['state'],message:'Choose a Nigerian state.'});
  if(value.countryCode!=='NG'&&regionRequired(value.countryCode)&&!value.state)ctx.addIssue({code:'custom',path:['state'],message:'Enter your state or province.'});
  if(postalCodeRequired(value.countryCode)&&!value.postalCode)ctx.addIssue({code:'custom',path:['postalCode'],message:'Enter the destination postal code.'});
});
export function addressLineWithPostalCode(customer:{addressLine2:string;postalCode?:string}) {
  return [customer.addressLine2,customer.postalCode?`Postal code: ${customer.postalCode}`:''].filter(Boolean).join('\n');
}
