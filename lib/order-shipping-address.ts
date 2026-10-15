import {SHIPPING_COUNTRIES} from './shipping-countries';
import {validatedShippingAddress} from './shipping-address';

type OrderAddress={first_name:string;last_name:string;email:string;phone:string;address_line_1:string;address_line_2:string;city:string;state:string;country:string};

/** Reverse only the final postcode line written by addressLineWithPostalCode.
 * Dispatch must use the same structured address/cache as checkout, rather than
 * paying to validate a different string containing "Postal code:" in line 2.
 */
export function checkoutAddressFromOrder(order:OrderAddress){
 const country=SHIPPING_COUNTRIES.find(([code,name])=>code===order.country||name===order.country);
 if(!country)throw Error('Delivery country is not supported.');
 const lines=order.address_line_2.split('\n');
 const postal=lines.at(-1)?.match(/^Postal code: ([\p{L}\p{N} -]{1,32})$/u);
 if(postal)lines.pop();
 return {firstName:order.first_name,lastName:order.last_name,email:order.email,phone:order.phone,addressLine1:order.address_line_1,addressLine2:lines.join('\n'),city:order.city,state:order.state,countryCode:country[0],postalCode:postal?.[1]||''};
}

export function validatedOrderShippingAddress(order:OrderAddress){
 return validatedShippingAddress(checkoutAddressFromOrder(order));
}
