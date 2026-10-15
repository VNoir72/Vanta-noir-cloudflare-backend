import {reportScreenFailure} from '../monitoring';
import React from 'react';
import {Pressable,View,Text} from 'react-native';
export class AppRecovery extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 componentDidCatch(){reportScreenFailure();}
 static getDerivedStateFromError(){return {failed:true};}
 render(){if(!this.state.failed)return this.props.children;return <View style={{flex:1,justifyContent:'center',padding:24,gap:16,backgroundColor:'#f5f6f3'}}><Text accessibilityRole="header" style={{fontSize:24,color:'#172019',fontWeight:'700'}}>Let’s get you back.</Text><Text style={{fontSize:16,color:'#172019'}}>This screen could not load. Your saved bag is kept. If a payment was underway, check Orders before paying again.</Text><Pressable accessibilityRole="button" onPress={()=>this.setState({failed:false})} style={{minHeight:48,padding:14,borderRadius:28,backgroundColor:'#172019'}}><Text style={{textAlign:'center',color:'#ffffff',fontWeight:'700'}}>Try again</Text></Pressable></View>;}
}
