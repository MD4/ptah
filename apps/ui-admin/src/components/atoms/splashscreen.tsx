import * as React from "react";
import type { TransitionStatus } from "react-transition-group";
import { Transition } from "react-transition-group";

const duration = 250;

const transitionStyles: Record<TransitionStatus, React.CSSProperties> = {
  entering: { opacity: 1 },
  entered: { opacity: 1 },
  exiting: { opacity: 0 },
  exited: { opacity: 0, display: "none" },
  unmounted: {},
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    transition: `opacity ${duration}ms ease-in-out`,
    transitionDelay: "300ms",
    opacity: 0,
    position: "fixed",
    left: 0,
    top: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 999999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#11111288",
    backdropFilter: "blur(4px)",
  },
  logo: {
    width: "50%",
  },
};

function Splashscreen({ in: inProp }: { in: boolean }): React.JSX.Element {
  const nodeRef = React.useRef(null);

  const dynamicStyles: Record<
    string,
    (status: TransitionStatus) => React.CSSProperties
  > = {
    container: (state: TransitionStatus) => ({
      ...styles.container,
      ...transitionStyles[state],
    }),
  };

  return (
    <Transition in={inProp} nodeRef={nodeRef} timeout={1000}>
      {(state) => {
        return (
          <div ref={nodeRef} style={dynamicStyles.container(state)}>
            <img
              alt="PTAH logo"
              src="/ptah-logo-white.svg"
              style={styles.logo}
            />
          </div>
        );
      }}
    </Transition>
  );
}

export default Splashscreen;
