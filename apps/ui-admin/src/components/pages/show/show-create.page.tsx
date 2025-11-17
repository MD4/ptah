import { CaretLeftOutlined, CaretRightOutlined } from "@ant-design/icons";
import * as models from "@ptah-app/lib-models";
import type { InputRef } from "antd";
import { Button, Flex, Form, Input, notification, theme } from "antd";
import Title from "antd/es/typography/Title";
import { createSchemaFieldRule } from "antd-zod";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { useShowCreate } from "../../../repositories/show.repository";
import FullCenteredLayout from "../../layouts/full-centered.layout";

const { useToken } = theme;

const styles = {
  form: { width: 400, maxWidth: "90vw" },
} satisfies Record<string, React.CSSProperties>;

export default function ShowCreatePage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [{ error }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });
  const mutation = useShowCreate(
    ({ name }) => {
      navigate(`/show/${name}`);
    },
    (err) => {
      error({ message: "Something went wrong", description: err.message });
    },
  );

  const inputName = React.useRef<InputRef>(null);
  const onFinish = React.useCallback(
    (values: models.ShowCreate) => {
      mutation.mutate(values);
    },
    [mutation],
  );

  const rule = createSchemaFieldRule(models.showCreate);

  React.useEffect(() => {
    inputName.current?.focus();
  }, []);

  return (
    <FullCenteredLayout>
      {contextHolder}
      <Flex justify="center">
        <Title style={{ color: token.colorPrimary }}>CREATE SHOW</Title>
      </Flex>
      <Form
        autoComplete="off"
        initialValues={{ remember: true }}
        name="basic"
        onFinish={onFinish}
        style={styles.form}
        wrapperCol={{ offset: 2, span: 20 }}
      >
        <Form.Item name="name" rules={[rule]}>
          <Input
            autoComplete="false"
            placeholder="Show name (ie: show-01-01-2023)"
            ref={inputName}
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Flex gap="large" justify="space-around">
            <Link to="/show">
              <Button type="text">
                <CaretLeftOutlined />
                <span>Back</span>
              </Button>
            </Link>
            <Button
              htmlType="submit"
              loading={mutation.isPending}
              type="primary"
            >
              <span>Create</span>
              <CaretRightOutlined />
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </FullCenteredLayout>
  );
}
