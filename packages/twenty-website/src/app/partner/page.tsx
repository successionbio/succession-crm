import { HERO_DATA } from '@/app/partner/constants/hero';
import { LinkButton } from '@/design-system/components';
import { Pages } from '@/enums/pages';
import { Hero } from '@/sections/Hero/components';
import { theme } from '@/theme';

export default function PartnerPage() {
  return (
    <>
      <Hero.Root backgroundColor={theme.colors.primary.background[100]}>
        <Hero.Heading segments={HERO_DATA.heading} />
        <Hero.Body page={Pages.Partner} body={HERO_DATA.body} />
        <Hero.Cta>
          <LinkButton
            color="secondary"
            href="https://app.twenty.com/welcome"
            label="Become a partner"
            type="anchor"
            variant="outlined"
          />
          <LinkButton
            color="secondary"
            href="https://app.twenty.com/welcome"
            label="Find a partner"
            type="anchor"
            variant="contained"
          />
        </Hero.Cta>
      </Hero.Root>
    </>
  );
}
