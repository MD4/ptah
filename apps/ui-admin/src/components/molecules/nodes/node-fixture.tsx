import { DeleteFilled, EditFilled, WarningOutlined } from "@ant-design/icons";
import * as models from "@ptah-app/lib-models";
import type { Node, NodeProps } from "@xyflow/react";
import { useReactFlow } from "@xyflow/react";
import { Button, Flex, Popconfirm, Tooltip, Typography, theme } from "antd";
import * as React from "react";

import { capabilityToHandleId } from "../../../domain/fixture.domain";
import HandleCapability from "../handles/handle-capability";
import { useDefaultNodeStyle } from "./node.style";

export type NodeFixtureData = {
  fixture: models.ShowFixture;
  /** undefined when the profileId is unknown (corrupt or newer data). */
  profile?: models.FixtureProfile;
  capabilities: models.FixtureProfileCapability[];
  overlapping?: boolean;
  interactive?: boolean;
  onEdit?: (fixture: models.ShowFixture) => void;
};

const { useToken } = theme;

export default function NodeFixture({
  data: { fixture, profile, capabilities, overlapping, interactive, onEdit },
  selected,
}: NodeProps<Node<NodeFixtureData>>) {
  const reactFlow = useReactFlow();
  const defaultStyles = useDefaultNodeStyle("output", selected);
  const { token } = useToken();

  const compact = capabilities.length === 1;
  const channelCount = profile?.channels.length ?? 0;

  const styles = React.useMemo(
    () =>
      ({
        ...defaultStyles,
        container: {
          ...defaultStyles.container,
          width: 240,
          ...(compact
            ? { paddingTop: token.sizeXXS, paddingBottom: token.sizeXXS }
            : {}),
        },
        name: {
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
        warning: {
          color: token.colorWarning,
        },
      }) satisfies Record<string, React.CSSProperties>,
    [compact, defaultStyles, token.colorWarning, token.sizeXXS],
  );

  const getCapabilityChannels = React.useCallback(
    (capability: models.ShowPatchCapability): number[] =>
      profile
        ? (models
            .resolveCapabilityChannelIndexes(profile, capability)
            ?.map((index) => fixture.startChannel + index) ?? [])
        : [],
    [fixture.startChannel, profile],
  );

  const onDeleteConfirm = React.useCallback(() => {
    void reactFlow.deleteElements({
      nodes: [{ id: `fixture-${fixture.id}` }],
    });
  }, [fixture.id, reactFlow]);

  const onEditClick = React.useCallback(() => {
    onEdit?.(fixture);
  }, [fixture, onEdit]);

  // Rendered in-flow at the end of the header row (never overlaps the chip).
  const actions =
    selected && interactive ? (
      <Flex gap={token.sizeXXS}>
        <Button
          icon={<EditFilled />}
          onClick={onEditClick}
          size="small"
          type="text"
        />
        <Popconfirm
          description="Wires to this fixture will be removed."
          onConfirm={onDeleteConfirm}
          title="Delete fixture?"
        >
          <Button icon={<DeleteFilled />} size="small" type="text" />
        </Popconfirm>
      </Flex>
    ) : null;

  const addressChip = actions ? null : (
    <Typography.Text code>
      @{" "}
      {channelCount > 1
        ? `${fixture.startChannel}–${fixture.startChannel + channelCount - 1}`
        : fixture.startChannel}
    </Typography.Text>
  );

  const overlapBadge = overlapping ? (
    <Tooltip title="Address overlaps another fixture">
      <WarningOutlined style={styles.warning} />
    </Tooltip>
  ) : null;

  return (
    <Flex gap={compact ? 0 : "small"} style={styles.container} vertical>
      {compact && capabilities[0] ? (
        <Flex align="center" gap="small">
          <div style={{ flex: 1, minWidth: 0 }}>
            <HandleCapability
              channels={getCapabilityChannels(capabilities[0].capability)}
              id={capabilityToHandleId(capabilities[0].capability)}
              kind={
                capabilities[0].capability.type === "color" ? "color" : "scalar"
              }
              label={fixture.name}
            />
          </div>
          {overlapBadge}
          {addressChip}
          {actions}
        </Flex>
      ) : (
        <>
          <Flex align="center" gap="small">
            <Typography.Text style={styles.name}>
              {fixture.name}
            </Typography.Text>
            {overlapBadge}
            {addressChip}
            {actions}
          </Flex>
          <Typography.Text type="secondary">
            {profile?.name ?? (
              <>
                Unknown profile <WarningOutlined style={styles.warning} />
              </>
            )}
          </Typography.Text>

          {capabilities.map(({ capability, label }) => (
            <HandleCapability
              channels={getCapabilityChannels(capability)}
              id={capabilityToHandleId(capability)}
              key={capabilityToHandleId(capability)}
              kind={capability.type === "color" ? "color" : "scalar"}
              label={label}
            />
          ))}
        </>
      )}
    </Flex>
  );
}
