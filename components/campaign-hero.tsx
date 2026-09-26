import StoreImage from './store-image';
import { ArrowRight } from 'lucide-react';
import { heroSchema, type HeroSettings } from '@/lib/storefront-design';
export function CampaignHero({value}:{value?:HeroSettings}) {
  const hero=value??heroSchema.parse({});
  return <section className="dn-hero" aria-label="Current campaign" data-artwork={!hero.showText}>
    <picture>{hero.mobileImage&&<source media="(max-width: 700px)" srcSet={hero.mobileImage}/>}<StoreImage src={hero.image} alt={hero.alt} sizes="(max-width: 700px) 100vw, 75vw" priority style={{objectPosition:hero.focus}}/></picture>
    {hero.showText?<div className="dn-hero-content">
      {hero.kicker&&<span className="dn-hero-kicker"><span className="dn-dot"/> {hero.kicker}</span>}
      {hero.title&&<h1 style={{whiteSpace:'pre-line'}}>{hero.title}</h1>}
      {hero.body&&<p style={{whiteSpace:'pre-line'}}>{hero.body}</p>}
      <a className="dn-lime" href={hero.buttonLink}>{hero.buttonText} <ArrowRight size={17}/></a>
    </div>:<a className="dn-hero-art-link" href={hero.buttonLink} aria-label={hero.buttonText}/>}
  </section>;
}
