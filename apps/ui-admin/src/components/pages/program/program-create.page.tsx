import * as models from "@ptah/lib-models";
import Title from "antd/es/typography/Title";
import { createSchemaFieldRule } from "antd-zod";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { CaretLeftOutlined, CaretRightOutlined } from "@ant-design/icons";
import type { InputRef } from "antd";
import { Form, Input, Button, Flex, theme, notification } from "antd";

import { useProgramCreate } from "../../../repositories/program.repository";
import FullCenteredLayout from "../../layouts/full-centered.layout";

const { useToken } = theme;

const styles: Record<string, React.CSSProperties> = {
  form: { width: 400, maxWidth: "90vw" },
};

export default function ProgramCreatePage(): JSX.Element {
  const { token } = useToken();
  const navigate = useNavigate();
  const [{ error }, contextHolder] = notification.useNotification({
    placement: "bottomRight",
  });
  const mutation = useProgramCreate(
    ({ name }) => {
      navigate(`/program/${name}`);
    },
    (err) => {
      error({ message: "Something went wrong", description: err.message });
    },
  );

  const inputName = React.useRef<InputRef>(null);
  const onFinish = React.useCallback(
    (values: models.ProgramCreate) => {
      mutation.mutate(values);
    },
    [mutation],
  );

  const rule = createSchemaFieldRule(models.programCreate);

  React.useEffect(() => {
    inputName.current?.focus();
  }, []);

  return (
    <FullCenteredLayout>
      <>
        {contextHolder}
        <Flex justify="center">
          <Title style={{ color: token.colorPrimary }}>CREATE PROGRAM</Title>
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
              placeholder="Program name (ie: strobe-fast, rgb-fade-in..)"
              ref={inputName}
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Flex gap="large" justify="space-around">
              <Link to="/program">
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
      </>
    </FullCenteredLayout>
  );
}
