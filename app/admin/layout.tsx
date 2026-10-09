import {AdminAppearance} from './admin-theme';
import {adminThemeScript} from '@/lib/admin-theme';
import {adminThemeCSS} from '@/lib/admin-theme-css';
export default function AdminLayout({children}: {children: React.ReactNode}) {
  return <><style dangerouslySetInnerHTML={{__html: adminThemeCSS}}/><script dangerouslySetInnerHTML={{__html: adminThemeScript}}/><AdminAppearance/>{children}</>;
}
