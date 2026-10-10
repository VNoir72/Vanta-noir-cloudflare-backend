import {Slot} from 'expo-router';
import Constants from 'expo-constants';
import App from '../../App';
import {ThemeProvider} from '../theme';
import Studio from '../../Studio';
export default function Layout(){return <ThemeProvider>{Constants.expoConfig?.extra?.variant==='studio'?<Studio/>:<App/>}<Slot/></ThemeProvider>}
