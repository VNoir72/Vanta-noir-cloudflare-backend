import React from 'react';import{createRoot}from'react-dom/client';
import {App,routePage} from '../../portable/app';import products from '../../portable/catalog-snapshot.json';
import '../../app/globals.css';import '../../app/discovery.css';import '../../app/commerce.css';import '../../app/checkout-experience.css';import '../../app/approved-storefront.css';import '../../app/liquid-glass.css';import '../../app/campaign-2026.css';import '../../app/brand-materials.css';import '../../app/brand-palette.css';
void routePage('/',products as any).then(page=>createRoot(document.getElementById('root')!).render(<App>{page}</App>));
