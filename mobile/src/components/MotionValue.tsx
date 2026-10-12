import React from 'react';
import {Text} from '../theme';
import {Entrance} from './Motion';
export function MotionValue({value}:{value:string}){return <Entrance transitionKey={value}><Text style={{fontSize:17,fontWeight:'700',fontVariant:['tabular-nums']}}>{value}</Text></Entrance>}
