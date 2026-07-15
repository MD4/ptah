import { fixture as fixtureDomain } from "@ptah-app/lib-domains";
import * as models from "@ptah-app/lib-models";
import { Button, Form, Input, InputNumber, Modal, Select } from "antd";
import { createSchemaFieldRule } from "antd-zod";
import * as React from "react";

import { suggestNextStartChannel } from "../../../domain/fixture.domain";
import FixtureProfilePreview from "../../atoms/fixture-profile-preview";

type FixtureFormValues = {
  profileId: string;
  name: string;
  startChannel: number;
};

const profileOptions = models.FIXTURE_PROFILES.map((profile) => ({
  label: `${profile.name} (${profile.channels.length}ch)`,
  value: profile.id,
}));

const rule = createSchemaFieldRule(models.showFixture);

export default function ShowFixtureModal({
  open,
  fixture,
  existingFixtures,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  /** Present = edit mode. */
  fixture?: models.ShowFixture;
  existingFixtures: models.ShowFixtures;
  onCancel: () => void;
  onSubmit: (fixture: models.ShowFixture) => void;
}) {
  const [form] = Form.useForm<FixtureFormValues>();

  const otherFixtures = React.useMemo(
    () => existingFixtures.filter(({ id }) => id !== fixture?.id),
    [existingFixtures, fixture?.id],
  );

  const profileId = Form.useWatch("profileId", form);
  const profile = models.getFixtureProfile(profileId ?? "");
  const channelCount = profile?.channels.length ?? 1;
  const maxStartChannel = 512 - channelCount + 1;

  React.useEffect(() => {
    if (!open) {
      return;
    }

    form.resetFields();

    if (fixture) {
      form.setFieldsValue(fixture);
    } else {
      const defaultProfile = models.FIXTURE_PROFILES[1]; // rgb

      form.setFieldsValue({
        profileId: defaultProfile.id,
        startChannel:
          suggestNextStartChannel(
            otherFixtures,
            defaultProfile.channels.length,
          ) ?? 1,
      });
    }
  }, [open, fixture, form, otherFixtures]);

  const onProfileChange = React.useCallback(
    (newProfileId: string) => {
      if (fixture || form.isFieldTouched("startChannel")) {
        return;
      }

      const newChannelCount =
        models.getFixtureProfile(newProfileId)?.channels.length ?? 1;
      const suggestion = suggestNextStartChannel(
        otherFixtures,
        newChannelCount,
      );

      if (suggestion !== undefined) {
        form.setFieldsValue({ startChannel: suggestion });
      }
    },
    [fixture, form, otherFixtures],
  );

  const onNextFreeClick = React.useCallback(() => {
    const suggestion = suggestNextStartChannel(otherFixtures, channelCount);

    if (suggestion !== undefined) {
      form.setFieldsValue({ startChannel: suggestion });
    }
  }, [channelCount, form, otherFixtures]);

  const onOk = React.useCallback(async () => {
    const values = await form.validateFields();

    onSubmit(
      fixture
        ? { ...fixture, ...values }
        : fixtureDomain.createShowFixture(
            values.name,
            values.profileId,
            values.startChannel,
          ),
    );
  }, [fixture, form, onSubmit]);

  const overlapRule = React.useMemo(
    () => ({
      warningOnly: true,
      validator: async (_: unknown, startChannel: number | undefined) => {
        if (startChannel === undefined) {
          return;
        }

        const candidate: models.ShowFixture = {
          id: fixture?.id ?? "candidate",
          name: "candidate",
          profileId: profileId ?? "",
          startChannel,
        };

        if (
          fixtureDomain.findFixtureOverlaps([...otherFixtures, candidate])
            .length > 0
        ) {
          throw new Error("Overlaps another fixture (last write wins)");
        }
      },
    }),
    [fixture?.id, otherFixtures, profileId],
  );

  return (
    <Modal
      okText={fixture ? "Save" : "Add"}
      onCancel={onCancel}
      onOk={onOk}
      open={open}
      title={fixture ? "EDIT FIXTURE" : "ADD FIXTURE"}
    >
      <Form form={form} layout="vertical" name="fixture">
        <Form.Item label="Profile" name="profileId" rules={[rule]}>
          <Select
            onChange={onProfileChange}
            options={profileOptions}
            placeholder="Pick a fixture profile"
          />
        </Form.Item>

        <Form.Item>
          <FixtureProfilePreview profile={profile} />
        </Form.Item>

        <Form.Item label="Name" name="name" rules={[rule]}>
          <Input placeholder="par-left, strobe-back, ..." />
        </Form.Item>

        <Form.Item
          extra={
            fixture && profile
              ? "Changing the profile removes wires to capabilities that no longer exist."
              : undefined
          }
          label="Start channel"
          name="startChannel"
          rules={[rule, overlapRule]}
        >
          <InputNumber
            addonAfter={
              <Button onClick={onNextFreeClick} size="small" type="link">
                next free
              </Button>
            }
            max={maxStartChannel}
            min={1}
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
