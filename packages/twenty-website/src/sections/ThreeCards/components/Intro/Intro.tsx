import { theme } from "@/theme";
import { styled } from "@linaria/react";
import type { ReactNode } from "react";

const StyledIntro = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  row-gap: ${theme.spacing(6)};

  &[data-align="center"] {
    margin-left: auto;
    margin-right: auto;
    justify-items: center;
    text-align: center;
  }

  @media (min-width: ${theme.breakpoints.md}px) {
    max-width: 921px;

    &[data-align="center"] {
      max-width: 900px;
    }
  }
`;

type IntroProps = {
  align: "left" | "center";
  children: ReactNode;
};

export function Intro({ align, children }: IntroProps) {
  return <StyledIntro data-align={align}>{children}</StyledIntro>;
}
