import { Container, LinkButton } from '@/design-system/components';
import { ArrowRightUpIcon, Logo, PlusIcon, RectangleFillIcon } from '@/icons';
import { FOOTER_NAV_GROUPS } from '@/sections/Footer/constants/footer-nav-groups';
import { SOCIAL_LINKS } from '@/sections/Footer/constants/social-links';
import { theme } from '@/theme';
import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { Separator as BaseSeparator } from '@base-ui/react/separator';
import { styled } from '@linaria/react';
import Link from 'next/link';
import React from 'react';
import { FooterShape } from './FooterShape';

const FooterRoot = styled.footer`
  background-color: ${theme.colors.secondary.background[100]};
  width: 100%;
`;

const FooterContainer = styled(Container)`
  display: flex;
  flex-direction: column;
  height: 1280px;
  position: relative;
  padding-bottom: ${theme.spacing(4)};
  padding-left: ${theme.spacing(4)};
  padding-right: ${theme.spacing(4)};

  @media (min-width: ${theme.breakpoints.lg}px) {
    padding-bottom: ${theme.spacing(10)};
    padding-left: ${theme.spacing(10)};
    padding-right: ${theme.spacing(10)};
  }
`;

const FooterBackground = styled.div`
  position: absolute;
  z-index: 0;
`;

const FooterContent = styled.div`
  margin-top: auto;
  padding-bottom: ${theme.spacing(12)};
  padding-top: ${theme.spacing(12)};
  padding-left: ${theme.spacing(4)};
  padding-right: ${theme.spacing(4)};
  position: relative;
  z-index: 1;

  @media (min-width: ${theme.breakpoints.md}px) {
    padding-left: ${theme.spacing(20)};
    padding-right: ${theme.spacing(20)};
    padding-top: ${theme.spacing(20)};
  }

  @media (min-width: ${theme.breakpoints.lg}px) {
    padding-left: ${theme.spacing(30)};
    padding-right: ${theme.spacing(30)};
  }
`;

const FooterNav = styled.nav`
  margin-top: ${theme.spacing(10)};
  margin-bottom: ${theme.spacing(10)};

  @media (min-width: ${theme.breakpoints.md}px) {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
  }
`;

const FooterNavDivider = styled.div`
  align-items: center;
  display: flex;
  gap: ${theme.spacing(1.5)};
  width: 100%;

  @media (min-width: ${theme.breakpoints.md}px) {
    flex-direction: column;
    height: 100%;
    width: auto;
    margin-left: ${theme.spacing(7)};
    margin-right: ${theme.spacing(7)};
  }
`;

const FooterNavDividerLine = styled.div`
  background-color: #1c1c1c1a;
  flex: 1 1 0%;
  height: 1px;
  min-height: 1px;
  min-width: 0;

  @media (min-width: ${theme.breakpoints.md}px) {
    height: auto;
    min-height: 0;
    min-width: 1px;
    width: 1px;
  }
`;

const FooterNavGroup = styled.section`
  margin-top: ${theme.spacing(4)};
  margin-bottom: ${theme.spacing(4)};

  @media (min-width: ${theme.breakpoints.md}px) {
    margin-top: 0;
    margin-bottom: ${theme.spacing(7)};
  }
`;

const FooterNavGroupTitle = styled.h4`
  font-size: ${theme.font.size(4)};
  font-weight: ${theme.font.weight.medium};
  margin-bottom: ${theme.spacing(2)};
  line-height: 1.35;
`;

const FooterNavMenuList = styled(NavigationMenu.List)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing(2)};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const FooterNavLinkHoverIcon = styled.span`
  display: inline-flex;
  flex-shrink: 0;
  min-width: 0;
  opacity: 0;
  overflow: hidden;
  transition:
    width 0.3s ease-out,
    opacity 0.3s ease-out;
  width: 0;
`;

const FooterNavLink = styled(NavigationMenu.Link)`
  align-items: center;
  color: ${theme.colors.primary.text[100]};
  display: flex;
  font-size: ${theme.font.size(4)};
  gap: 0;
  text-decoration: none;
  transition: gap 0.3s ease-out;

  &:focus-visible {
    outline: 1px solid ${theme.colors.highlight[100]};
    outline-offset: 1px;
  }

  @media (min-width: ${theme.breakpoints.md}px) {
    &:hover {
      gap: ${theme.spacing(2)};
    }

    &:hover ${FooterNavLinkHoverIcon} {
      opacity: 1;
      width: 14px;
    }
  }
`;

const FooterActions = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing(2)};
  margin-top: ${theme.spacing(8)};

  & > * {
    width: 126px;
  }
`;

const FooterBottom = styled.div`
  display: grid;
  font-size: ${theme.font.size(3)};
  gap: ${theme.spacing(6)};
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
`;

const FooterCopyright = styled.div`
  color: ${theme.colors.primary.text[100]};
  font-family: ${theme.font.family.mono};
  grid-column: 1;
  grid-row: 2;
  justify-self: start;
  text-transform: uppercase;

  @media (min-width: ${theme.breakpoints.md}px) {
    grid-row: 1;
  }
`;

const FooterSocial = styled.nav`
  align-items: center;
  display: flex;
  gap: ${theme.spacing(6)};
  grid-column: 1 / -1;
  grid-row: 1;

  @media (min-width: ${theme.breakpoints.md}px) {
    grid-column: 2;
    justify-self: end;
  }
`;

const FooterCredit = styled.div`
  color: ${theme.colors.primary.text[100]};
  font-family: ${theme.font.family.mono};
  grid-column: 2;
  grid-row: 2;
  justify-self: end;
  text-transform: uppercase;

  @media (min-width: ${theme.breakpoints.md}px) {
    grid-column: 1 / -1;
  }
`;

const FooterSocialDivider = styled(BaseSeparator)`
  background-color: ${theme.colors.primary.border[40]};
  border: none;
  height: 10px;
  width: 1px;
`;

const FooterSocialItem = styled.a`
  align-items: center;
  color: ${theme.colors.primary.text[100]};
  display: flex;
  font-size: ${theme.font.size(3)};
  font-weight: ${theme.font.weight.medium};
  gap: ${theme.spacing(3)};
  line-height: 14px;
  text-decoration: none;

  &:focus-visible {
    outline: 1px solid ${theme.colors.highlight[100]};
    outline-offset: 1px;
  }
`;

export default function Footer() {
  return (
    <FooterRoot>
      <FooterContainer>
        <FooterBackground aria-hidden />

        <FooterContent>
          <FooterShape fillColor={theme.colors.primary.background[100]} />
          <Logo
            size={40}
            fillColor={theme.colors.primary.background[100]}
            backgroundColor={theme.colors.secondary.background[100]}
          />

          <NavigationMenu.Root render={<FooterNav />}>
            {FOOTER_NAV_GROUPS.map((group, index) => (
              <React.Fragment key={group.id}>
                {index > 0 && (
                  <FooterNavDivider role="separator">
                    <PlusIcon
                      size={12}
                      strokeColor={theme.colors.highlight[100]}
                      aria-hidden
                    />
                    <FooterNavDividerLine aria-hidden />
                    <PlusIcon
                      size={12}
                      strokeColor={theme.colors.highlight[100]}
                      aria-hidden
                    />
                  </FooterNavDivider>
                )}
                <FooterNavGroup aria-labelledby={group.id}>
                  <FooterNavGroupTitle id={group.id}>
                    {group.title}
                  </FooterNavGroupTitle>
                  <FooterNavMenuList>
                    {group.links.map((link) => (
                      <NavigationMenu.Item key={link.href + link.label}>
                        <FooterNavLink
                          render={
                            link.external ? (
                              <a
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            ) : (
                              <Link href={link.href} />
                            )
                          }
                        >
                          <FooterNavLinkHoverIcon aria-hidden>
                            <RectangleFillIcon
                              size={14}
                              fillColor={theme.colors.secondary.background[100]}
                            />
                          </FooterNavLinkHoverIcon>
                          {link.label}
                        </FooterNavLink>
                      </NavigationMenu.Item>
                    ))}
                  </FooterNavMenuList>
                  {group.showActions && (
                    <FooterActions>
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
                    </FooterActions>
                  )}
                </FooterNavGroup>
              </React.Fragment>
            ))}
          </NavigationMenu.Root>

          <FooterBottom>
            <FooterCopyright>© 2026 – Twenty</FooterCopyright>
            <FooterSocial aria-label="Social media">
              {SOCIAL_LINKS.filter((item) => item.showInDrawer).map(
                (item, i) => (
                  <React.Fragment key={item.href}>
                    {i > 0 && <FooterSocialDivider orientation="vertical" />}
                    <FooterSocialItem
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={item.ariaLabel}
                    >
                      <item.icon
                        size={14}
                        fillColor={theme.colors.secondary.background[100]}
                        aria-hidden
                      />
                      {item.label}
                      {item.label != null && (
                        <ArrowRightUpIcon
                          size={8}
                          strokeColor={theme.colors.highlight[100]}
                          aria-hidden
                        />
                      )}
                    </FooterSocialItem>
                  </React.Fragment>
                ),
              )}
            </FooterSocial>
            <FooterCredit>Design by Ardent.</FooterCredit>
          </FooterBottom>
        </FooterContent>
      </FooterContainer>
    </FooterRoot>
  );
}
