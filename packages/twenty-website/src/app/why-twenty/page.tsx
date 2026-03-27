import { HERO_DATA } from '@/app/why-twenty/constants/hero';
import { Pages } from '@/enums/pages';
import { Hero } from '@/sections/Hero/components';
import { theme } from '@/theme';

export default function WhyTwentyPage() {
  <>
    <Hero.Root backgroundColor={theme.colors.primary.background[100]}>
      <Hero.Heading segments={HERO_DATA.heading} />
      <Hero.Body page={Pages.WhyTwenty} body={HERO_DATA.body} />
    </Hero.Root>
  </>;
}
