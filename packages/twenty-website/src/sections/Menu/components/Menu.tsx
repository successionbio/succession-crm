import { LinkButton } from '@/design-system/components';
import { ArrowRightUpIcon, Logo } from '@/icons';
import { NAV_ITEMS } from '@/sections/Menu/constants/nav-items';
import { SOCIAL_LINKS } from '@/sections/Menu/constants/social-links';
import { theme } from '@/theme';
import { Drawer } from '@base-ui/react/drawer';
import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { Separator } from '@base-ui/react/separator';
import { styled } from '@linaria/react';
import Link from 'next/link';
import React from 'react';
import { MenuShell } from './MenuShell';

const LogoContainer = styled.div`
  align-items: center;
  display: flex;
`;

const LogoLink = styled(Link)`
  display: flex;
  text-decoration: none;

  &:focus-visible {
    outline: 1px solid ${theme.colors.highlight[100]};
    outline-offset: 1px;
  }
`;

const NavList = styled(NavigationMenu.List)`
  display: none;
  list-style: none;
  margin: 0;
  padding: 0;

  @media (min-width: ${theme.breakpoints.md}px) {
    align-items: center;
    display: flex;
    gap: ${theme.spacing(8)};
  }
`;

const NavLink = styled(NavigationMenu.Link)`
  color: ${theme.colors.primary.text[100]};
  font-family: ${theme.font.family.mono};
  font-size: ${theme.font.size(3)};
  font-weight: ${theme.font.weight.medium};
  letter-spacing: 0;
  text-decoration: none;
  text-transform: uppercase;

  &:focus-visible {
    outline: 1px solid ${theme.colors.highlight[100]};
    outline-offset: 1px;
  }
`;

const SocialLink = styled.a`
  align-items: center;
  border-radius: ${theme.radius(1)};
  color: ${theme.colors.primary.text[100]};
  display: flex;
  font-size: ${theme.font.size(3)};
  font-weight: ${theme.font.weight.medium};
  gap: ${theme.spacing(2)};
  letter-spacing: 0;
  text-decoration: none;

  &:focus-visible {
    outline: 1px solid ${theme.colors.highlight[100]};
    outline-offset: 1px;
  }
`;

const SocialLinkItem = styled.div`
  display: none;

  @media (min-width: ${theme.breakpoints.md}px) {
    align-items: center;
    display: flex;
    gap: ${theme.spacing(5)};

    &.discord-link {
      display: none;
    }
  }

  @media (min-width: ${theme.breakpoints.lg}px) {
    &.discord-link {
      display: flex;
    }
  }
`;

const SocialContainer = styled.nav`
  display: none;

  @media (min-width: ${theme.breakpoints.md}px) {
    align-items: center;
    display: flex;
    gap: ${theme.spacing(5)};
  }
`;

const CtaContainer = styled.div`
  display: none;

  @media (min-width: ${theme.breakpoints.md}px) {
    align-items: center;
    display: flex;
    gap: ${theme.spacing(2)};
  }
`;

const Divider = styled(Separator)`
  border-left: 1px solid ${theme.colors.primary.border[40]};
  height: 10px;
  width: 0px;
`;

export default function Menu() {
  return (
    <MenuShell>
      <LogoContainer>
        <Drawer.Close
          nativeButton={false}
          render={<LogoLink href="/" aria-label="Home" />}
        >
          <Logo
            size={40}
            fillColor={theme.colors.primary.background[100]}
            backgroundColor={theme.colors.secondary.background[100]}
          />
        </Drawer.Close>
      </LogoContainer>

      <NavigationMenu.Root render={<div />}>
        <NavList>
          {NAV_ITEMS.map((item, i) => (
            <React.Fragment key={item.href}>
              <NavigationMenu.Item>
                <NavLink render={<Link href={item.href} />}>
                  {item.label}
                </NavLink>
              </NavigationMenu.Item>
              {i < NAV_ITEMS.length - 1 && <Divider orientation="vertical" />}
            </React.Fragment>
          ))}
        </NavList>
      </NavigationMenu.Root>

      <SocialContainer aria-label="Social media">
        {SOCIAL_LINKS.filter((item) => item.showInDesktop).map((item, i) => (
          <SocialLinkItem key={item.href} className={item.className}>
            {i > 0 && <Divider orientation="vertical" />}
            <SocialLink
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.ariaLabel}
            >
              <item.icon
                size={14}
                fillColor={theme.colors.secondary.background[100]}
                aria-hidden="true"
              />
              {item.label}
              <ArrowRightUpIcon
                size={8}
                strokeColor={theme.colors.highlight[100]}
                aria-hidden="true"
              />
            </SocialLink>
          </SocialLinkItem>
        ))}
      </SocialContainer>

      <CtaContainer>
        <LinkButton
          color="secondary"
          href="https://app.twenty.com/welcome"
          label="Get started"
          type="anchor"
          variant="contained"
        />
        <LinkButton
          color="secondary"
          href="https://app.twenty.com/welcome"
          label="Get started"
          type="anchor"
          variant="contained"
        />
      </CtaContainer>
    </MenuShell>
  );
}
