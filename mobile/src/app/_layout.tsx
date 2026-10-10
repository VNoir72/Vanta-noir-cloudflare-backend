import {Slot} from 'expo-router';
import Constants from 'expo-constants';
import App from '../../App';
import Studio from '../../Studio';
export default function Layout(){return <>{Constants.expoConfig?.extra?.variant==='studio'?<Studio/>:<App/>}<Slot/></>}
