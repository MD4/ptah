import { theme } from "antd";
import * as React from "react";

const { useToken } = theme;

export default function EdgeGradient(): JSX.Element {
  const { token } = useToken();

  return (
    <svg>
      <defs>
        <linearGradient id="edge-gradient">
          <stop offset="0" stopColor={token.colorPrimary}>
            <animate
              attributeName="offset"
              dur="4s"
              repeatCount="indefinite"
              values="-1.1;1.5"
            />
          </stop>
          <stop offset="0" stopColor={token.colorPrimaryTextHover}>
            <animate
              attributeName="offset"
              dur="4s"
              repeatCount="indefinite"
              values="-0.01;2"
            />
          </stop>
          <stop offset="0" stopColor={token.colorPrimary}>
            <animate
              attributeName="offset"
              dur="4s"
              repeatCount="indefinite"
              values="0;2.01"
            />
          </stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
