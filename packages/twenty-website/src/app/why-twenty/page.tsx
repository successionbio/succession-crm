import { HERO_DATA } from '@/app/why-twenty/constants/hero';
import { Image } from '@/design-system/components';
import { Pages } from '@/enums/pages';
import { Hero } from '@/sections/Hero/components';
import { theme } from '@/theme';

export default function WhyTwentyPage() {
  return (
    <Hero.Root backgroundColor={theme.colors.primary.background[100]}>
      <Hero.Heading segments={HERO_DATA.heading} />
      <Hero.Body page={Pages.WhyTwenty} body={HERO_DATA.body} />
      <Hero.Visual>
        <Image src="/images/why-twenty/hero/background.png" alt="" />
      </Hero.Visual>
    </Hero.Root>
  );
}
