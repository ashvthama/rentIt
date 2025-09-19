import React from 'react'
import HeroSection from './herosection';
import FeatureSection from './featuresection';
import DiscoverSection from './DiscoverSection';
import CallToActionSection from './CallToActionSection';
import FooterSection from './FooterSection';
const Landing = () => {
  return (
    <div>
      <HeroSection/>
      <FeatureSection/>
      <DiscoverSection/>
      <CallToActionSection/>
      <FooterSection/>
    </div>
  )
}
export default Landing;
