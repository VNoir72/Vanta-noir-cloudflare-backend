import { z } from 'zod';
import { NIGERIA_STATES } from './commerce-config';
import { shippingCountryName, postalCodeRequired } from './shipping-countries';
export const checkoutCustomerSchema=z.object({
  email:z.string().trim().email().max(200),firstName:z.string().trim().min(2).max(80),lastName:z.string().trim().min(2).max(80),
  phone:z.string().trim().min(7).max(30),addressLine1:z.string().trim().min(5).max(240),addressLine2:z.string().trim().max(240).default(''),
  city:z.string().trim().min(2).max(100),state:z.string().trim().max(100).default(''),
  countryCode:z.string().refine(v=>Boolean(shippingCountryName(v))).default('NG'),
  postalCode:z.string().trim().max(32).regex(/^[\p{L}\p{N} -]*$/u).default(''),
}).superRefine((value,ctx)=>{
  if(value.countryCode==='NG'&&!NIGERIA_STATES.includes(value.state))ctx.addIssue({code:'custom',path:['state'],message:'Choose a Nigerian state.'});
  if(postalCodeRequired(value.countryCode)&&!value.postalCode)ctx.addIssue({code:'custom',path:['postalCode'],message:'Enter the destination postal code.'});
});
export function addressLineWithPostalCode(customer:{addressLine2:string;postalCode?:string}) {
  return [customer.addressLine2,customer.postalCode?`Postal code: ${customer.postalCode}`:''].filter(Boolean).join('\n');
}
