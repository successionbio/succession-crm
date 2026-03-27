import { HERO_DATA } from '@/app/product/constants/hero';
import { LinkButton } from '@/design-system/components';
import { Pages } from '@/enums/pages';
import { Hero } from '@/sections/Hero/components';
import { theme } from '@/theme';

export default function ProductPage() {
  return (
    <>
      <Hero.Root backgroundColor={theme.colors.primary.background[100]}>
        <Hero.Heading segments={HERO_DATA.heading} />
        <Hero.Body page={Pages.Product} body={HERO_DATA.body} />
        <Hero.Cta>
          <LinkButton
            color="secondary"
            href="https://app.twenty.com/welcome"
            label="Get started"
            type="anchor"
            variant="contained"
          />
        </Hero.Cta>
      </Hero.Root>
    </>
  );
}
