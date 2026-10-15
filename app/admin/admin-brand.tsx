'use client';
import {useAdminTheme} from './admin-theme';

/** Full original spire and wordmark; never crop it into an avatar. */
export function AdminBrand() {
  const theme=useAdminTheme();
  return <img className="vn-admin-brand-image" src={theme==='dark'?'/images/vanta-spire-on-dark.svg':'/images/vanta-spire-light.svg'} alt="Vanta Noir" width={150} height={31}/>;
}
